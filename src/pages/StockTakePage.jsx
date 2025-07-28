// src/pages/StockTakePage.jsx

import React, { useState } from 'react';
import { reconcileStockLevels } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ClipboardList, Save, Search, RefreshCw, Package, Factory, Truck, QrCode } from 'lucide-react';
import { useStockTakeData } from '../hooks/useStockTakeData';
import { Summary, StockCountList } from '../components/features/stock/StockTakeComponents';
import ConsignmentStockTake from '../components/features/stock/ConsignmentStockTake';
import toast from 'react-hot-toast';
import QrScannerModal from '../components/features/scanner/QrScannerModal'; // <-- NEW IMPORT
import { findInventoryItemByItemCode } from '../api/firestore'; // <-- NEW IMPORT
import StockCountModal from '../components/features/stock/StockCountModal'; // <-- NEW IMPORT

const TabButton = ({ id, label, icon, activeTab, setActiveTab }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`flex-1 px-5 py-3 text-lg font-semibold flex items-center justify-center gap-3 transition-colors ${
          isActive 
            ? 'bg-gray-800 text-white border-b-2 border-blue-500' 
            : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
        }`}
      >
        {icon}
        {label}
      </button>
    );
};

const StockTakeContent = ({ inventoryTypeFilter }) => {
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
    } = useStockTakeData(inventoryTypeFilter);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false); // <-- NEW STATE FOR SCANNER
    const [itemToCount, setItemToCount] = useState(null); // <-- NEW: State for modal

    // UPDATED: Handle successful scan by opening the modal
    const handleScanSuccess = async (scannedPartNumber) => {
        setIsScannerOpen(false);
        try {
            const itemData = await findInventoryItemByItemCode(scannedPartNumber);
            // Ensure the found item matches the current filter category
            const isProductMatch = inventoryTypeFilter === 'products' && itemData.category === 'Product';
            const isPurchasedMatch = inventoryTypeFilter === 'purchased' && itemData.category !== 'Product';

            if (isProductMatch || isPurchasedMatch) {
                setItemToCount(itemData); // Open the modal with the found item
            } else {
                toast.error("Scanned item not found in the current stock-take category.");
            }
        } catch (error) {
            toast.error(`Error finding item: ${error.message}`);
        }
    };

    // NEW: Function to update the count from the modal
    const handleUpdateCountFromModal = (itemId, newCount) => {
        // This will update the local state in useStockTakeData hook
        handleCountChange(itemId, 'quantity', newCount); 
        toast.success("Count captured.");
        setItemToCount(null); // Close the modal
    };

    const handleReconcile = () => {
        const itemsToUpdate = getItemsToReconcile();
        if (itemsToUpdate.length === 0) {
            return toast.error("You haven't counted any items yet.");
        }
        const varianceCount = itemsToUpdate.filter(item => item.newCount - item.systemCount !== 0).length;
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
                }}>Confirm</Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            </span>
        ), { icon: '⚠️', duration: 6000 });
    };
    
    const handleStartNewStockTake = () => {
        toast((t) => (
            <span>
                Start a new stock-take? This will clear all counts for the current view.
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    resetCounts();
                    toast.dismiss(t.id);
                    toast.success("Counts cleared. Ready for new stock-take.");
                }}>Confirm</Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            </span>
        ), { icon: '⚠️', duration: 6000 });
    }

    if (error) {
        return <p className="text-center text-red-500 p-8">{error}</p>;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ClipboardList/> Stock-Take ({inventoryTypeFilter === 'products' ? 'Manufactured Products' : 'Purchased Items'})
                    </h3>
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
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setIsScannerOpen(true)} variant="secondary">
                            <QrCode size={16} className="mr-2" />
                            Scan to Count
                        </Button>
                        <div className="relative w-full sm:w-64">
                            {/* UPDATED: Ensure Input component is used */}
                            <Input
                                type="text"
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <p className="text-center text-gray-400 p-8">Loading inventory...</p>
                ) : (
                    <StockCountList items={filteredItems} onCountChange={handleCountChange} />
                )}
            </div>
            
            {isScannerOpen && (
                <QrScannerModal 
                    onClose={() => setIsScannerOpen(false)}
                    onScanSuccess={handleScanSuccess}
                />
            )}

            {/* NEW: Render the count input modal */}
            {itemToCount && (
                <StockCountModal
                    item={itemToCount}
                    onClose={() => setItemToCount(null)}
                    onUpdateCount={handleUpdateCountFromModal}
                />
            )}
        </>
    );
};


const StockTakePage = () => {
    const [activeTab, setActiveTab] = useState('purchased');

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Stock-Take Management</h2>
            
            <div className="flex rounded-t-lg overflow-hidden border-b border-gray-700">
                <TabButton 
                    id="purchased"
                    label="Purchased Items"
                    icon={<Package size={22} />}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
                <TabButton 
                    id="products"
                    label="Manufactured Products"
                    icon={<Factory size={22} />}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
                <TabButton 
                    id="consignment"
                    label="Consignment Stock"
                    icon={<Truck size={22} />}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>

            <div className="mt-4">
                {activeTab === 'purchased' && <StockTakeContent inventoryTypeFilter="purchased" />}
                {activeTab === 'products' && <StockTakeContent inventoryTypeFilter="products" />}
                {activeTab === 'consignment' && <ConsignmentStockTake />}
            </div>
        </div>
    );
};

export default StockTakePage;
