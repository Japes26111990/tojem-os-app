// src/components/features/picking/PickingQueue.jsx (NEW FILE)

import React, { useState, useEffect, useMemo } from 'react';
import { listenToPickingLists, markPickingListAsCompleted } from '../../../api/firestore';
import Button from '../../ui/Button';
import { CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const PickingQueue = () => {
    const [pickingLists, setPickingLists] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = listenToPickingLists((lists) => {
            setPickingLists(lists);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const aggregatedList = useMemo(() => {
        const materialMap = new Map();
        pickingLists.forEach(list => {
            list.items.forEach(item => {
                const existing = materialMap.get(item.id);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.forJobs.add(list.jobId);
                } else {
                    materialMap.set(item.id, {
                        ...item,
                        forJobs: new Set([list.jobId]),
                    });
                }
            });
        });
        return Array.from(materialMap.values()).sort((a, b) => a.location.localeCompare(b.location));
    }, [pickingLists]);

    const handleMarkAllAsPicked = async () => {
        if (pickingLists.length === 0) return;
        
        toast((t) => (
            <span>
                Mark all current lists as completed?
                <Button variant="primary" size="sm" className="ml-2" onClick={async () => {
                    toast.dismiss(t.id);
                    const promises = pickingLists.map(list => markPickingListAsCompleted(list.id));
                    try {
                        await Promise.all(promises);
                        toast.success("All items marked as picked!");
                    } catch (error) {
                        console.error("Error marking lists as completed:", error);
                        toast.error("Failed to update picking lists.");
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

    if (aggregatedList.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-800 rounded-lg">
                <p className="text-gray-500">The picking queue is currently empty.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Aggregated Picking List</h3>
                    <Button onClick={handleMarkAllAsPicked} variant="success">
                        <CheckCircle size={16} className="mr-2" />
                        Mark All as Picked
                    </Button>
                </div>
                <p className="text-sm text-gray-400">
                    This is a combined list of all materials needed for {pickingLists.length} upcoming job(s).
                </p>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-gray-400">Material</th>
                            <th className="p-3 text-sm font-semibold text-gray-400">Location</th>
                            <th className="p-3 text-sm font-semibold text-gray-400 text-center">Total Quantity</th>
                            <th className="p-3 text-sm font-semibold text-gray-400">For Jobs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {aggregatedList.map(item => (
                            <tr key={item.id} className="border-t border-gray-700">
                                <td className="p-3 text-white font-medium">{item.name}</td>
                                <td className="p-3 text-purple-400 font-mono">{item.location} / {item.shelf_number} / {item.bin_number}</td>
                                <td className="p-3 text-white font-bold text-lg text-center">{item.quantity}</td>
                                <td className="p-3 text-xs text-gray-400 font-mono">
                                    {Array.from(item.forJobs).join(', ')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PickingQueue;
