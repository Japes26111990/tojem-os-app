// src/pages/StockControlPage.jsx (UPDATED)

import React, { useState, useEffect, useMemo } from 'react';
import StockControlDashboard from '../components/features/stock/StockControlDashboard';
import PurchaseQueue from '../components/features/stock/PurchaseQueue';
import InTransitOrders from '../components/features/stock/InTransitOrders';
import { getPurchaseQueue, getSuppliers } from '../api/firestore';
import Button from '../components/ui/Button'; // <-- Import Button
import FutureDemandAnalyzer from '../components/features/stock/FutureDemandAnalyzer'; // <-- Import the new component
import { BrainCircuit } from 'lucide-react'; // <-- Import an icon

const StockControlPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [purchaseQueueItems, setPurchaseQueueItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzerOpen, setAnalyzerOpen] = useState(false); // <-- State to control the modal

  const fetchData = () => {
    setLoading(true);
    Promise.all([getPurchaseQueue(), getSuppliers()]).then(([queue, supplierList]) => {
      setPurchaseQueueItems(queue);
      setSuppliers(supplierList);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const TabButton = ({ id, label, count }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
          isActive ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
        }`}
      >
        {label}
        {count > 0 && <span className={`text-xs rounded-full px-2 py-0.5 ${isActive ? 'bg-white text-blue-600' : 'bg-gray-600 text-gray-200'}`}>{count}</span>}
      </button>
    );
  };

  const { pendingItems, orderedItems } = useMemo(() => {
    return {
        pendingItems: (purchaseQueueItems || []).filter(i => i.status === 'pending'),
        orderedItems: (purchaseQueueItems || []).filter(i => i.status === 'ordered')
    }
  }, [purchaseQueueItems]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-white">Stock Control & Purchasing</h2>
            {/* --- NEW BUTTON TO OPEN THE ANALYZER --- */}
            <Button onClick={() => setAnalyzerOpen(true)} variant="primary">
                <BrainCircuit size={18} className="mr-2"/>
                Predictive Analyzer
            </Button>
        </div>

        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6">
                <TabButton id="dashboard" label="Stock Overview" />
                <TabButton id="queue" label="Purchase Queue" count={pendingItems.length} />
                <TabButton id="transit" label="In-Transit Orders" count={orderedItems.length} />
            </nav>
        </div>
        <div className="mt-6">
            {loading ? <p className="text-center text-gray-400 p-8">Loading...</p> : (
                <>
                    {activeTab === 'dashboard' && <StockControlDashboard />}
                    {activeTab === 'queue' && <PurchaseQueue onOrderPlaced={fetchData} />}
                    {activeTab === 'transit' && <InTransitOrders items={orderedItems} suppliers={suppliers} onStockReceived={fetchData} />}
                </>
            )}
        </div>
      </div>

      {/* --- RENDER THE MODAL WHEN isAnalyzerOpen is true --- */}
      {isAnalyzerOpen && <FutureDemandAnalyzer onClose={() => setAnalyzerOpen(false)} />}
    </>
  );
};

export default StockControlPage;
