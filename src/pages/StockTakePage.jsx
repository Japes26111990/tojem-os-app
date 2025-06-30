// src/pages/StockTakePage.jsx (Upgraded with Toasts)

import React, { useState } from 'react';
import { reconcileStockLevels } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ClipboardList, Save, Search, RefreshCw } from 'lucide-react';
import { useStockTakeData } from '../hooks/useStockTakeData';
import { Summary, StockCountList } from '../components/features/stock/StockTakeComponents';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const StockTakePage = () => {
    const {
        loading,
        error,
        filteredItems,
        summary,
        filter,
        setFilter,
        searchTerm,
        setSearchTerm,
        handleCountChange,
        getItemsToReconcile,
        fetchData,
        resetCounts,
    } = useStockTakeData();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReconcile = () => {
        const itemsToUpdate = getItemsToReconcile();
        if (itemsToUpdate.length === 0) {
            return toast.error("You haven't counted any items yet."); // --- REPLACE ALERT ---
        }

        const varianceCount = itemsToUpdate.filter(item => item.newCount - item.systemCount !== 0).length;
        
        // --- REPLACE window.confirm ---
        toast((t) => (
            <span>
                Finalize stock-take for {itemsToUpdate.length} items? ({varianceCount} with discrepancies)
                <Button variant="primary" size="sm" className="ml-2" onClick={() => {
                    setIsSubmitting(true);
                    reconcileStockLevels(itemsToUpdate)
                        .then(() => {
                            toast.success("Stock levels reconciled successfully!");
                            resetCounts();
                            fetchData();
                        })
                        .catch(err => {
                            toast.error("Failed to reconcile stock levels.");
                            console.error("Error reconciling stock levels:", err);
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
        ), {
            icon: '⚠️',
            duration: 6000
        });
    };
    
    const handleStartNewStockTake = () => {
        // --- REPLACE window.confirm ---
        toast((t) => (
            <span>
                Start a new stock-take? This will clear all counts.
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    resetCounts();
                    toast.dismiss(t.id);
                    toast.success("Counts cleared. Ready for new stock-take.");
                }}>
                    Confirm
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: '⚠️' });
    }

    if (error) {
        return <p className="text-center text-red-500 p-8">{error}</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white flex items-center gap-2"><ClipboardList/> Stock-Take</h2>
                <div className="flex gap-2">
                     <Button onClick={handleStartNewStockTake} disabled={isSubmitting || loading} variant="secondary">
                        <RefreshCw size={16} className="mr-2" />
                        Start New
                    </Button>
                    <Button onClick={handleReconcile} disabled={isSubmitting || loading || summary.counted === 0} variant="primary">
                        <Save size={16} className="mr-2" />
                        {isSubmitting ? 'Finalizing...' : `Finalize & Reconcile (${summary.counted})`}
                    </Button>
                </div>
            </div>

            <Summary data={summary} />

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-300">Filter:</span>
                    <Button size="sm" variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => setFilter('all')}>All</Button>
                    <Button size="sm" variant={filter === 'uncounted' ? 'primary' : 'secondary'} onClick={() => setFilter('uncounted')}>Uncounted</Button>
                    <Button size="sm" variant={filter === 'counted' ? 'primary' : 'secondary'} onClick={() => setFilter('counted')}>Counted</Button>
                    <Button size="sm" variant={filter === 'discrepancies' ? 'primary' : 'secondary'} onClick={() => setFilter('discrepancies')}>Discrepancies</Button>
                </div>
                <div className="relative w-full sm:w-1/3">
                    <Input
                        type="text"
                        placeholder="Search items by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-400 p-8">Loading inventory...</p>
            ) : (
                <StockCountList items={filteredItems} onCountChange={handleCountChange} />
            )}
        </div>
    );
};

export default StockTakePage;
