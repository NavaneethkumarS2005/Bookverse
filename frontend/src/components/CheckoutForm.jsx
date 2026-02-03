import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { API_URL } from '../config';

export default function CheckoutForm({ clientSecret, cartItems, onSuccess, onCancel }) {
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // We don't want a redirect for this simple flow, but Stripe mandates a return_url usually.
                // However, if we handle next_action manually or use redirect: 'if_required', it works smoothly.
                // Let's rely on simple redirect for now OR 'if_required' for SPA feel.
                return_url: `${window.location.origin}/orders`,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message);
            setIsLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Payment successful! Now save order on backend
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/payment/save-order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        paymentIntentId: paymentIntent.id,
                        items: cartItems
                    })
                });
                const data = await res.json();
                if (data.success) {
                    onSuccess();
                } else {
                    setMessage("Payment succeeded but order save failed: " + data.message);
                }
            } catch (err) {
                setMessage("Error saving order: " + err.message);
            }
            setIsLoading(false);
        } else {
            setMessage("Unexpected state.");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
            {message && <div style={{ color: "red", marginTop: "10px", fontSize: "0.9rem" }}>{message}</div>}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                    Cancel
                </button>
                <button
                    disabled={isLoading || !stripe || !elements}
                    id="submit"
                    style={{ flex: 2, padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', opacity: isLoading ? 0.7 : 1 }}
                >
                    {isLoading ? "Processing..." : "Pay Now"}
                </button>
            </div>
        </form>
    );
}
