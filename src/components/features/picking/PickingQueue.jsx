// src/components/features/picking/PickingQueue.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { listenToPickingLists, markPickingListAsCompleted, getProducts } from '../../../api/firestore';
import Button from '../../ui/Button';
import { CheckCircle, Package, ChevronDown, ChevronRight, User, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const PickingListCard = ({ list, onMarkComplete, productsMap }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown /> : <ChevronRight />}
                    <div>
                        <p className="font-bold text-white text-lg">{list.salesOrderId}</p>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                            <User size={14} />
                            {list.customerName}
                        </p>
                    </div>
                </div>
                <Button onClick={(e) => { e.stopPropagation(); onMarkComplete(list.id); }} variant="success">
                    <CheckCircle size={16} className="mr-2" />
                    Mark as Picked
                </Button>
            </div>

            {isExpanded && (
                <div className="p-4 border-t border-gray-700">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-gray-600">
                            <tr>
                                <th className="p-2 font-semibold text-gray-400">Product to Pick</th>
                                <th className="p-2 font-semibold text-gray-400">Location</th>
                                <th className="p-2 font-semibold text-gray-400 text-center">Current Stock</th>
                                <th className="p-2 font-semibold text-gray-400 text-center">Quantity to Pick</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.items.map(item => {
                                const productDetails = productsMap.get(item.id);
                                const currentStock = productDetails ? productDetails.currentStock : 0;
                                const hasEnoughStock = currentStock >= item.quantity;

                                return (
                                    <tr key={item.id} className="border-b border-gray-700/50">
                                        <td className="p-3 text-white font-medium">{item.name}</td>
                                        <td className="p-3 text-purple-400 font-mono">
                                            {item.location} / Shelf {item.shelf_number} / Level {item.shelf_level}
                                        </td>
                                        <td className={`p-3 font-mono text-center ${hasEnoughStock ? 'text-gray-300' : 'text-red-400 font-bold'}`}>
                                            {hasEnoughStock ? (
                                                currentStock
                                            ) : (
                                                <span className="flex items-center justify-center gap-2" title="Not enough stock!">
                                                    <AlertTriangle size={16} /> {currentStock}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-white font-bold text-lg text-center">{item.quantity}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const PickingQueue = () => {
    const [pickingLists, setPickingLists] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            const fetchedProducts = await getProducts();
            setProducts(fetchedProducts);

            const unsubscribe = listenToPickingLists((lists) => {
                setPickingLists(lists);
                setLoading(false);
            });
            return unsubscribe;
        };
        
        const unsubscribePromise = fetchAllData();
        return () => { unsubscribePromise.then(unsub => unsub && unsub()); };
    }, []);
    
    const productsMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

    const handleMarkAsPicked = (listId) => {
        toast((t) => (
            <span>
                Mark this entire order as picked? This will update stock levels.
                <Button variant="primary" size="sm" className="ml-2" onClick={async () => {
                    toast.dismiss(t.id);
                    try {
                        await markPickingListAsCompleted(listId);
                        toast.success("Order marked as picked! Stock levels will update.");
                    } catch (error) {
                        console.error("Error marking list as completed:", error);
                        toast.error("Failed to update picking list.");
                    }
                }}>
                    Confirm
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: '✔️' });
    };

    if (loading) {
        return <p className="text-center text-gray-400">Loading picking queue...</p>;
    }

    if (pickingLists.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-800 rounded-lg">
                <p className="text-gray-500">The picking queue is currently empty.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {pickingLists.map(list => (
                <PickingListCard 
                    key={list.id} 
                    list={list} 
                    onMarkComplete={handleMarkAsPicked} 
                    productsMap={productsMap}
                />
            ))}
        </div>
    );
};

export default PickingQueue;
