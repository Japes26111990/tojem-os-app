// src/pages/StockTakePage.jsx (Refactored to use the upgraded hook and components)

import React, { useState } from 'react';
import { reconcileStockLevels } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ClipboardList, Save, Search, RefreshCw } from 'lucide-react';
import { useStockTakeData } from '../hooks/useStockTakeData';
import { Summary, StockCountList } from '../components/features/stock/StockTakeComponents';

const StockTakePage = () => {
    // The hook now contains all the complex logic, keeping the page component clean.
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

    const handleReconcile = async () => {
        const itemsToUpdate = getItemsToReconcile();
        if (itemsToUpdate.length === 0) {
            return alert("You haven't counted any items yet.");
        }

        const varianceCount = itemsToUpdate.filter(item => item.newCount - item.systemCount !== 0).length;
        if (!window.confirm(`You are about to finalize the stock-take. This will update your inventory levels for ${itemsToUpdate.length} counted items, ${varianceCount} of which have discrepancies. This action cannot be undone. Proceed?`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            await reconcileStockLevels(itemsToUpdate);
            alert("Stock levels reconciled successfully!");
            resetCounts(); // Clear the inputs
            fetchData();   // Refresh data from Firestore
        } catch (error) {
            console.error("Error reconciling stock levels:", error);
            alert("Failed to reconcile stock levels. Please check the console.");
        }
        setIsSubmitting(false);
    };
    
    const handleStartNewStockTake = () => {
        if(window.confirm("Are you sure you want to start a new stock-take? This will clear all current physical counts entered on this screen.")) {
            resetCounts();
        }
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
