import React, { useEffect, useState } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import { API_URL } from '../config';

interface OrderItem {
    title: string;
    quantity: number;
    price: number;
}

interface Order {
    _id: string;
    orderItems: OrderItem[];
    totalPrice: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
}

const Orders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const downloadReceipt = (order: Order) => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(79, 70, 229); // Indigo 600
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('BookVerse', 14, 25);
        doc.setFontSize(12);
        doc.text('Order Invoice', 200, 25, { align: 'right' });

        // Order Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Order ID: ${order._id}`, 14, 50);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 55);
        doc.text(`Status: ${order.status}`, 14, 60);

        // Table
        const tableBody = order.orderItems.map(item => [
            item.title,
            item.quantity,
            `₹${item.price}`,
            `₹${item.price * item.quantity}`
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['Item', 'Qty', 'Price', 'Total']],
            body: tableBody,
            foot: [['', '', 'Total Amount', `₹${order.totalPrice}`]],
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Thank you for shopping with BookVerse!', 105, finalY, { align: 'center' });

        doc.save(`invoice-${order._id}.pdf`);
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                if (!localStorage.getItem('user')) {
                    setError('Please login to view orders.');
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`${API_URL}/api/orders`, { withCredentials: true });
                setOrders(response.data);
            } catch (err) {
                setError('Failed to fetch orders.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-slate-500 ">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p>Loading your orders...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen pt-24 flex items-center justify-center text-red-500">
            <p>{error}</p>
        </div>
    );

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50  transition-colors duration-300">
            <div className="max-w-4xl mx-auto px-5">
                <h1 className="font-outfit text-3xl md:text-4xl font-bold text-slate-900  mb-8">My Orders</h1>

                {orders.length === 0 ? (
                    <div className="bg-white  rounded-2xl p-12 text-center border border-slate-200  shadow-sm">
                        <div className="text-6xl mb-6 opacity-20 filter grayscale">📦</div>
                        <h3 className="text-xl font-bold text-slate-800  mb-2">No orders found.</h3>
                        <p className="text-slate-500 ">Looks like you haven't purchased any books yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order._id} className="bg-white  rounded-2xl p-6 shadow-sm border border-slate-200  overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100  pb-4 gap-4">
                                    <div className="flex gap-8">
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ORDER PLACED</div>
                                            <div className="font-medium text-slate-900 ">{new Date(order.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">TOTAL</div>
                                            <div className="font-bold text-indigo-600 ">₹{order.totalPrice}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => downloadReceipt(order)}
                                            className="px-4 py-2 bg-slate-100  hover:bg-slate-200  text-slate-700  rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                            title="Download Invoice"
                                        >
                                            <span>📄</span> Invoice
                                        </button>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${order.status === 'Paid'
                                            ? 'bg-green-100  text-green-700 '
                                            : 'bg-amber-100  text-amber-700 '
                                            }`}>
                                            {order.status}
                                        </span>
                                        {order.paymentMethod === 'UPI_QR_DEMO' && (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-yellow-100 text-yellow-800  ">
                                                Demo UPI
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {order.orderItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-16 bg-slate-100  rounded-lg flex items-center justify-center text-slate-400 text-xl border border-slate-200 ">
                                                    📖
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900  group-hover:text-indigo-600  transition-colors">{item.title}</div>
                                                    <div className="text-sm text-slate-500">Qty: {item.quantity} × ₹{item.price}</div>
                                                </div>
                                            </div>
                                            <div className="font-bold text-slate-900 ">₹{item.price * item.quantity}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Orders;
