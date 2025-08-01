// src/pages/StockHubPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
    getAllInventoryItems, 
    listenToPurchaseQueue,
    getSuppliers,
    listenToOneOffPurchases,
    updateStockCount
} from '../api/firestore';
import { Package, DollarSign, Search, Edit, Save, XCircle } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PurchaseQueue from '../components/features/stock/PurchaseQueue';
import InTransitOrders from '../components/features/stock/InTransitOrders';
import FutureDemandAnalyzer from '../components/features/stock/FutureDemandAnalyzer';
import { BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';

const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const StockLevelIndicator = ({ currentStock, reorderLevel, standardStockLevel }) => {
    const stock = Number(currentStock) || 0;
    const reorder = Number(reorderLevel) || 0;
    const standard = Number(standardStockLevel) || 0;

    if (standard <= 0) return <div className="text-xs text-gray-500 italic">Not tracked</div>;

    const isLowStock = stock < reorder;
    const percentage = Math.max(0, Math.min((stock / standard) * 100, 100));

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-300">{stock} / {standard}</span>
                <span className={`font-bold ${isLowStock ? 'text-red-400' : 'text-green-400'}`}>{isLowStock ? `Low (Reorder at ${reorder})` : 'In Stock'}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
                <div className={`h-2 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const PurchasedItemsDashboard = ({ items, loading, onStockUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    const handleEditClick = (item) => {
        setEditingItem({ id: item.id, newCount: item.currentStock });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        
        const newCount = parseFloat(editingItem.newCount);
        if (isNaN(newCount) || newCount < 0) {
            toast.error("Please enter a valid stock quantity.");
            return;
        }

        const itemToUpdate = items.find(i => i.id === editingItem.id);
        const sessionId = `MANUAL_ADJ-${Date.now()}`;

        try {
            await updateStockCount(editingItem.id, itemToUpdate.category, newCount, sessionId);
            toast.success(`${itemToUpdate.name} stock updated!`);
            setEditingItem(null);
            onStockUpdate();
        } catch (error) {
            console.error("Error updating stock:", error);
            toast.error("Failed to update stock.");
        }
    };

    const { purchasedItems, totalValue } = useMemo(() => {
        const filteredItems = items.filter(item => item.category !== 'Product');
        const value = filteredItems.reduce((sum, item) => sum + (item.currentStock || 0) * (item.price || 0), 0);
        return { purchasedItems: filteredItems, totalValue: value };
    }, [items]);

    const displayedItems = useMemo(() => {
        if (!searchTerm) return purchasedItems;
        return purchasedItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.itemCode && item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [purchasedItems, searchTerm]);

    return (
        <div className="space-y-6">
            <KpiCard 
                icon={<DollarSign size={24} />}
                title="Value of Raw Materials & Consumables"
                value={`R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`}
                color="bg-blue-500/20 text-blue-400"
            />

            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Purchased Item Stock</h3>
                    <div className="relative w-1/3">
                        <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
                            <tr>
                                <th className="p-2">Item Name</th>
                                <th className="p-2">Category</th>
                                <th className="p-2 w-1/3">Stock Level</th>
                                <th className="p-2 text-right">Unit Cost</th>
                                <th className="p-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-4">Loading...</td></tr>
                            ) : displayedItems.map(item => (
                                <tr key={item.id} className="border-b border-gray-700">
                                    <td className="p-2 text-white font-medium">{item.name}</td>
                                    <td className="p-2 text-gray-400">{item.category}</td>
                                    <td className="p-2">
                                        {editingItem?.id === item.id ? (
                                            <Input 
                                                type="number"
                                                value={editingItem.newCount}
                                                onChange={(e) => setEditingItem({...editingItem, newCount: e.target.value})}
                                                className="text-center"
                                                autoFocus
                                            />
                                        ) : (
                                            <StockLevelIndicator 
                                                currentStock={item.currentStock}
                                                reorderLevel={item.reorderLevel}
                                                standardStockLevel={item.standardStockLevel}
                                            />
                                        )}
                                    </td>
                                    <td className="p-2 text-right font-mono">R {(item.price || 0).toFixed(2)}</td>
                                    <td className="p-2 text-right">
                                        {editingItem?.id === item.id ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button onClick={handleSaveEdit} variant="success" size="sm" className="p-2"><Save size={16}/></Button>
                                                <Button onClick={handleCancelEdit} variant="secondary" size="sm" className="p-2"><XCircle size={16}/></Button>
                                            </div>
                                        ) : (
                                            <Button onClick={() => handleEditClick(item)} variant="secondary" size="sm" className="p-2"><Edit size={16}/></Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StockHubPage = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [inventoryItems, setInventoryItems] = useState([]);
    const [purchaseQueue, setPurchaseQueue] = useState([]);
    const [jobQueue, setJobQueue] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAnalyzerOpen, setAnalyzerOpen] = useState(false);

    const fetchData = () => {
        setLoading(true);
        getAllInventoryItems().then(setInventoryItems);
        getSuppliers().then(setSuppliers);
        
        const unsubscribeStock = listenToPurchaseQueue(setPurchaseQueue);
        const unsubscribeJobs = listenToOneOffPurchases(items => {
            setJobQueue(items.filter(item => item.status === 'Pending Purchase'));
        });

        setLoading(false);
        return () => {
            unsubscribeStock();
            unsubscribeJobs();
        };
    };

    useEffect(() => {
        const unsubscribe = fetchData();
        return () => unsubscribe();
    }, []);
    
    const { pendingStockItems, inTransitItems } = useMemo(() => {
        return {
            pendingStockItems: purchaseQueue.filter(i => i.status === 'pending'),
            inTransitItems: purchaseQueue.filter(i => i.status === 'ordered')
        }
    }, [purchaseQueue]);

    return (
        <>
            <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold text-white">Purchasing Hub</h2>
                    <Button onClick={() => setAnalyzerOpen(true)} variant="secondary">
                        <BrainCircuit size={18} className="mr-2"/>
                        Predictive Analyzer
                    </Button>
                </div>
                <div className="flex border-b border-gray-700">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 font-semibold ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>Stock Overview</button>
                    <button onClick={() => setActiveTab('purchase_queue')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'purchase_queue' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>
                        Purchase Queue 
                        <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full">{pendingStockItems.length + jobQueue.length}</span>
                    </button>
                    <button onClick={() => setActiveTab('in_transit')} className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'in_transit' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}>
                        In-Transit Orders
                        <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">{inTransitItems.length}</span>
                    </button>
                </div>

                {activeTab === 'overview' && <PurchasedItemsDashboard items={inventoryItems} loading={loading} onStockUpdate={fetchData} />}
                {activeTab === 'purchase_queue' && <PurchaseQueue stockItems={pendingStockItems} jobItems={jobQueue} suppliers={suppliers} onAction={fetchData} />}
                {activeTab === 'in_transit' && <InTransitOrders items={inTransitItems} suppliers={suppliers} onStockReceived={fetchData} />}
            </div>

            {isAnalyzerOpen && <FutureDemandAnalyzer onClose={() => setAnalyzerOpen(false)} />}
        </>
    );
};

export default StockHubPage;
