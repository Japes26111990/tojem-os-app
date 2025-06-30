// src/pages/SalesOrderPage.jsx (Upgraded with Toasts)

import React, { useState, useEffect, useMemo } from 'react';
import { listenToSalesOrders, addPurchasedItemToQueue, updateSalesOrderLineItemStatus } from '../api/firestore';
import Button from '../components/ui/Button';
import { ChevronDown, ChevronRight, Package, Wrench, ShoppingBag, X, CheckCircle } from 'lucide-react';
import CustomJobCreator from '../components/features/job_cards/CustomJobCreator';
import StandardJobCreatorModal from '../components/features/job_cards/StandardJobCreatorModal';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const OrderLineItem = ({ item, order, onAction }) => {
    const [isCustomModalOpen, setCustomModalOpen] = useState(false);
    const [isStandardModalOpen, setStandardModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSendToPurchasing = async () => {
        // --- REPLACE window.confirm ---
        toast((t) => (
            <span>
                Send "{item.description}" to the purchasing queue?
                <Button variant="primary" size="sm" className="ml-2" onClick={() => {
                    setIsSubmitting(true);
                    addPurchasedItemToQueue(item, order)
                        .then(() => updateSalesOrderLineItemStatus(order.id, item.id, 'In Purchasing'))
                        .then(() => {
                            toast.success("Item sent to purchasing.");
                            onAction();
                        })
                        .catch(err => {
                            toast.error("Failed to send item to purchasing.");
                            console.error("Error sending item to purchasing:", err);
                        })
                        .finally(() => setIsSubmitting(false));
                    toast.dismiss(t.id);
                }}>
                    Confirm
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ));
    };

    let icon, actionButton;

    if (item.status === 'In Purchasing') {
        icon = <ShoppingBag size={20} className="text-gray-500" />;
        actionButton = <span className="flex items-center gap-1 text-xs text-green-400 font-semibold"><CheckCircle size={14} /> Queued for Purchase</span>;
    } else if (item.isCatalogItem) {
        icon = <Package size={20} className="text-blue-400" />;
        actionButton = <Button variant="primary" className="text-xs py-1 px-2" onClick={() => setStandardModalOpen(true)}>Create Standard Job</Button>;
    } else if (item.isPurchasedItem) {
        icon = <ShoppingBag size={20} className="text-green-400" />;
        actionButton = <Button variant="secondary" className="text-xs py-1 px-2" onClick={handleSendToPurchasing} disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send to Purchasing'}</Button>;
    } else { 
        icon = <Wrench size={20} className="text-purple-400" />;
        actionButton = <Button variant="primary" className="text-xs py-1 px-2" onClick={() => setCustomModalOpen(true)}>Create Custom Job</Button>;
    }

    return (
        <>
            <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-md">
                <div className="flex items-center gap-3">
                    {icon}
                    <p className="text-white">{item.description}</p>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-sm font-mono text-gray-400">Cost: R{item.cost.toFixed(2)}</p>
                    {actionButton}
                </div>
            </div>

            {isCustomModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="relative bg-gray-800 p-2 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                         <Button onClick={() => setCustomModalOpen(false)} variant="danger" className="absolute -top-3 -right-3 z-10 rounded-full h-8 w-8 p-1">
                            <X size={16}/>
                        </Button>
                        <div className="overflow-y-auto">
                            <CustomJobCreator salesOrder={order} customLineItem={item} />
                        </div>
                    </div>
                </div>
            )}

            {isStandardModalOpen && (
                <StandardJobCreatorModal 
                    salesOrder={order}
                    lineItem={item}
                    onClose={() => setStandardModalOpen(false)}
                />
            )}
        </>
    );
};

const SalesOrderCard = ({ order, onAction }) => {
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
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown /> : <ChevronRight />}
                    <div>
                        <p className="font-bold text-white text-lg">{order.salesOrderId}</p>
                        <p className="text-sm text-gray-400">{order.customerName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                     <p className="font-mono text-xl text-green-400">R {order.total.toFixed(2)}</p>
                     <span className={`px-3 py-1 text-sm rounded-full font-semibold ${getStatusColor(order.status)}`}>
                        {order.status}
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 border-t border-gray-700 space-y-3">
                    <h4 className="font-semibold text-gray-200">Order Line Items:</h4>
                    {order.lineItems.map((item, index) => (
                        <OrderLineItem 
                            key={item.id || index}
                            item={item} 
                            order={order} 
                            onAction={onAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


const SalesOrderPage = () => {
    const [salesOrders, setSalesOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = () => {
        const unsubscribe = listenToSalesOrders((orders) => {
            setSalesOrders(orders);
            if(loading) setLoading(false);
        });
        return unsubscribe;
    };

    useEffect(() => {
        const unsubscribe = fetchData();
        return () => unsubscribe();
    }, []);

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Sales Order Dispatch</h2>
            <p className="text-gray-400 -mt-6">This is your hub for converting approved customer orders into actionable tasks for your team.</p>
            
            <div className="space-y-4">
                {loading && <p className="text-center p-8 text-gray-400">Loading sales orders...</p>}
                {!loading && salesOrders.length === 0 && <p className="text-center p-8 text-gray-400">No sales orders found. Accept a quote to create one.</p>}
                {!loading && salesOrders.map(order => (
                    <SalesOrderCard 
                        key={order.id} 
                        order={order}
                        onAction={fetchData}
                    />
                ))}
            </div>
        </div>
    );
};

export default SalesOrderPage;
