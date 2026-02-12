import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
// @ts-ignore
import { API_URL } from '../config';

interface CheckoutFormProps {
    clientSecret: string;
    cartItems: any[]; // Define a stricter type if possible, or use CartItem[]
    onSuccess: (paymentId?: string) => void;
    onCancel: () => void;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ cartItems, onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        // Confirm the payment
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL is required by Stripe, but we handle 'if_required' usually
                return_url: `${window.location.origin}/orders`,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message || "An unexpected error occurred.");
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
                    onSuccess(paymentIntent.id);
                } else {
                    setMessage("Payment succeeded but order save failed: " + data.message);
                }
            } catch (err: any) {
                setMessage("Error saving order: " + err.message);
            }
            setIsLoading(false);
        } else {
            setMessage("Unexpected state.");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="mb-6">
                <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
            </div>

            {message && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                    {message}
                </div>
            )}

            <div className="flex gap-3 mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    Cancel
                </button>
                <button
                    disabled={isLoading || !stripe || !elements}
                    id="submit"
                    className="flex-[2] py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                    {isLoading ? "Processing..." : "Pay Now"}
                </button>
            </div>
        </form>
    );
}

export default CheckoutForm;
