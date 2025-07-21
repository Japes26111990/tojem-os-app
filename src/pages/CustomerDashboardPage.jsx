// src/pages/CustomerDashboardPage.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listenToCustomerSalesOrders, addCustomerFeedback } from '../api/firestore';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ChevronDown, ChevronRight, Package, Star } from 'lucide-react';
import FeedbackModal from '../components/features/portal/FeedbackModal'; // --- IMPORT NEW MODAL ---

const OrderRow = ({ order, onRateClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending Production': return 'bg-yellow-500/20 text-yellow-300';
            case 'In Production': return 'bg-blue-500/20 text-blue-300';
            case 'Fulfilled': return 'bg-green-500/20 text-green-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between p-4 hover:bg-gray-700/50">
                <Link to={`/portal/order/${order.id}`} className="flex items-center gap-4 flex-grow">
                    <Package size={24} className="text-gray-400"/>
                    <div>
                        <p className="font-bold text-white text-lg">{order.salesOrderId}</p>
                        <p className="text-sm text-gray-400">
                            Ordered: {order.createdAt?.toDate().toLocaleDateString('en-ZA') || 'N/A'}
                        </p>
                    </div>
                </Link>
                <div className="flex items-center gap-6">
                    <p className="font-mono text-xl text-green-400">R {order.total.toFixed(2)}</p>
                    <span className={`px-3 py-1 text-sm rounded-full font-semibold ${getStatusColor(order.status)}`}>
                        {order.status}
                    </span>
                    {/* --- NEW: Show Rate button for fulfilled orders --- */}
                    {order.status === 'Fulfilled' && (
                        <Button onClick={() => onRateClick(order)} variant="secondary" size="sm" className="py-1 px-2 text-xs">
                            <Star size={14} className="mr-1"/> Rate Order
                        </Button>
                    )}
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full hover:bg-gray-600">
                        {isExpanded ? <ChevronDown /> : <ChevronRight />}
                    </button>
                </div>
            </div>
            {isExpanded && (
                <div className="p-4 border-t border-gray-700 space-y-2">
                    <h4 className="font-semibold text-gray-300 text-sm">Line Items:</h4>
                    <ul className="list-disc list-inside pl-2">
                        {order.lineItems.map(item => (
                            <li key={item.id} className="text-gray-400">{item.description} (Qty: {item.quantity})</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const CustomerDashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [orderToRate, setOrderToRate] = useState(null); // --- NEW STATE ---

    useEffect(() => {
        if (!user || !user.email) return;

        const unsubscribe = listenToCustomerSalesOrders(user.email, (fetchedOrders) => {
            setOrders(fetchedOrders);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white">Your Orders</h2>
                    <Button onClick={() => navigate('/portal/products')} variant="primary">
                        <Package size={18} className="mr-2"/>
                        Browse Products & Create Quote
                    </Button>
                </div>

                {loading && <p className="text-center text-gray-400">Loading your orders...</p>}
                
                {!loading && orders.length === 0 && (
                    <div className="text-center py-16 bg-gray-800 rounded-lg">
                        <p className="text-gray-500">You have not placed any orders yet.</p>
                    </div>
                )}

                {!loading && orders.length > 0 && (
                    <div className="space-y-4">
                        {orders.map(order => (
                            <OrderRow key={order.id} order={order} onRateClick={setOrderToRate} />
                        ))}
                    </div>
                )}
            </div>

            {/* --- RENDER THE MODAL --- */}
            {orderToRate && (
                <FeedbackModal
                    order={orderToRate}
                    user={user}
                    onClose={() => setOrderToRate(null)}
                    onSubmit={addCustomerFeedback}
                />
            )}
        </>
    );
};

export default CustomerDashboardPage;
