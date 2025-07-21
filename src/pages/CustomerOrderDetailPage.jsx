// src/pages/CustomerOrderDetailPage.jsx (NEW FILE)

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { listenToJobsForSalesOrder } from '../api/firestore';
import CustomerKanban from '../components/features/portal/CustomerKanban';
import { ChevronsLeft } from 'lucide-react';

const CustomerOrderDetailPage = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId) return;

        const fetchOrderDetails = async () => {
            setLoading(true);
            const orderRef = doc(db, 'salesOrders', orderId);
            const orderSnap = await getDoc(orderRef);
            if (orderSnap.exists()) {
                setOrder({ id: orderSnap.id, ...orderSnap.data() });
            } else {
                console.error("No such order found!");
            }
        };

        fetchOrderDetails();

        const unsubscribeJobs = listenToJobsForSalesOrder(orderId, (fetchedJobs) => {
            setJobs(fetchedJobs);
            setLoading(false);
        });

        return () => unsubscribeJobs();
    }, [orderId]);

    if (loading) {
        return <p className="text-center text-gray-400">Loading Order Details...</p>;
    }

    if (!order) {
        return <p className="text-center text-red-400">Order not found.</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <Link to="/portal" className="flex items-center text-blue-400 hover:text-blue-300 mb-4">
                    <ChevronsLeft size={20} className="mr-1" />
                    Back to All Orders
                </Link>
                <h2 className="text-3xl font-bold text-white">Live Tracking for Order: {order.salesOrderId}</h2>
                <p className="text-gray-400">Customer: {order.customerName}</p>
            </div>
            
            <CustomerKanban jobs={jobs} />
        </div>
    );
};

export default CustomerOrderDetailPage;
