import React, { useState, useEffect, useMemo } from 'react';
import { 
    listenToPurchaseQueue, 
    getSuppliers, 
    markItemsAsOrdered,
    listenToOneOffPurchases,
    markOneOffItemsAsOrdered,
    getSupplierPricingForItem,
    addSupplier,
    listenToJobCards,
    getAllInventoryItems,
    addToPurchaseQueue
} from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Mail, ThumbsUp, Truck, Package, Wrench, UserPlus, X } from 'lucide-react';
import InTransitOrders from '../components/features/stock/InTransitOrders';
import Dropdown from '../components/ui/Dropdown';
import toast from 'react-hot-toast';
import StockControlDashboard from '../components/features/stock/StockControlDashboard';
import FutureDemandAnalyzer from '../components/features/stock/FutureDemandAnalyzer';
import { BrainCircuit } from 'lucide-react';

// AddSupplierModal Component (Restored)
const AddSupplierModal = ({ onClose, onSupplierAdded }) => {
    const [newSupplier, setNewSupplier] = useState({ name: '', email: '', estimatedEtaDays: '', minOrderAmount: '' });
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewSupplier(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!newSupplier.name || !newSupplier.email) {
            return toast.error("Supplier Name and Email are required.");
        }
        try {
            const supplierData = {
                ...newSupplier,
                estimatedEtaDays: parseInt(newSupplier.estimatedEtaDays, 10) || 0,
                minOrderAmount: parseFloat(newSupplier.minOrderAmount) || 0,
            };
            await addSupplier(supplierData);
            toast.success("Supplier added successfully!");
            onSupplierAdded();
            onClose();
        } catch (error) {
            console.error("Error adding supplier:", error);
            toast.error("Failed to add supplier.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg">
                 <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Add New Supplier</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 space-y-4">
                    <Input label="Supplier Name" name="name" value={newSupplier.name} onChange={handleInputChange} />
                    <Input label="Email" name="email" type="email" value={newSupplier.email} onChange={handleInputChange} />
                    <Input label="ETA (days)" name="estimatedEtaDays" type="number" value={newSupplier.estimatedEtaDays} onChange={handleInputChange} />
                    <Input label="Min. Order (R)" name="minOrderAmount" type="number" value={newSupplier.minOrderAmount} onChange={handleInputChange} />
                </div>
                <div className="p-4 bg-gray-800/50 flex justify-end">
                    <Button onClick={handleSubmit} variant="primary">Save Supplier</Button>
                </div>
            </div>
        </div>
    );
};

// PurchaseHub Component (Restored)
const PurchaseHub = ({ stockItems, jobItems, suppliers, onAction }) => {
    const [allPricing, setAllPricing] = useState({});
    const [selectedSuppliers, setSelectedSuppliers] = useState({});
    const [orderQuantities, setOrderQuantities] = useState({});
    const [loadingPricing, setLoadingPricing] = useState(true);
    const [isAddSupplierModalOpen, setAddSupplierModalOpen] = useState(false);
    const [sendToAdmin, setSendToAdmin] = useState({});

    const ADMIN_EMAIL = "admin@tojem.co.za";

    const unifiedQueue = useMemo(() => [
        ...stockItems.map(item => ({ ...item, type: 'Stock' })),
        ...jobItems.map(item => ({ ...item, type: 'Job-Specific', itemId: item.id, itemName: item.itemName || item.description }))
    ], [stockItems, jobItems]);

    useEffect(() => {
        const fetchAllPricing = async () => {
            setLoadingPricing(true);
            const pricingMap = {};
            const pricingPromises = unifiedQueue.map(async (item) => {
                if (!item.itemId) return;
                const prices = await getSupplierPricingForItem(item.itemId);
                pricingMap[item.itemId] = prices;
            });
            await Promise.all(pricingPromises);
            setAllPricing(pricingMap);

            const initialSelections = {};
            unifiedQueue.forEach(item => {
                if (!item.itemId) return;
                const prices = pricingMap[item.itemId] || [];
                if (prices.length > 0) {
                    const cheapest = prices.reduce((min, p) => p.price < min.price ? p : min, prices[0]);
                    initialSelections[item.itemId] = cheapest.supplierId;
                }
            });
            setSelectedSuppliers(initialSelections);
            setLoadingPricing(false);
        };

        if (unifiedQueue.length > 0) {
            fetchAllPricing();
        } else {
            setLoadingPricing(false);
        }
    }, [unifiedQueue]);

    const handleSupplierSelection = (itemId, supplierId) => {
        setSelectedSuppliers(prev => ({ ...prev, [itemId]: supplierId }));
    };

    const handleQuantityChange = (itemId, qty) => {
        setOrderQuantities(prev => ({ ...prev, [itemId]: qty }));
    };
    
    const handleSendToAdminToggle = (itemId) => {
        setSendToAdmin(prev => ({...prev, [itemId]: !prev[itemId]}));
    };

    const groupedOrders = useMemo(() => {
        const groups = { admin: { supplierDetails: { name: 'Admin Purchase Request', email: ADMIN_EMAIL }, stockItems: [], jobItems: [] } };
        
        unifiedQueue.forEach(item => {
            if (!item.itemId) return;
            const isForAdmin = sendToAdmin[item.itemId];
            const supplierId = isForAdmin ? 'admin' : selectedSuppliers[item.itemId];

            if (!supplierId) return;

            if (!groups[supplierId]) {
                const supplierDetails = suppliers.find(s => s.id === supplierId);
                if (supplierDetails) {
                    groups[supplierId] = { supplierDetails, stockItems: [], jobItems: [] };
                }
            }
            if (groups[supplierId]) {
                if (item.type === 'Stock') {
                    groups[supplierId].stockItems.push(item);
                } else {
                    groups[supplierId].jobItems.push(item);
                }
            }
        });
        
        return Object.entries(groups)
            .filter(([_, group]) => group.stockItems.length > 0 || group.jobItems.length > 0)
            .map(([_, group]) => group)
            .sort((a, b) => a.supplierDetails.name.localeCompare(b.supplierDetails.name));

    }, [unifiedQueue, suppliers, selectedSuppliers, sendToAdmin]);
    
    const handleGenerateEmail = async (group) => {
        const { supplierDetails, stockItems, jobItems } = group;
        const supplierEmail = supplierDetails.email || '';
        const subject = `Purchase Order - TOJEM - ${supplierDetails.name}`;
        let body = `Hi ${supplierDetails.contactPerson || supplierDetails.name},\n\nPlease supply the following items:\n\n`;

        if(stockItems.length > 0) {
            body += "--- For Stock ---\n";
            stockItems.forEach(item => {
                const recommendedQty = Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0));
                const orderQty = orderQuantities[item.itemId] || recommendedQty;
                if (orderQty > 0) body += `- ${item.itemName} (Code: ${item.itemCode || 'N/A'}) --- Qty: ${orderQty}\n`;
            });
            body += "\n";
        }
        
        if(jobItems.length > 0) {
            body += "--- For Specific Jobs ---\n";
            jobItems.forEach(item => {
                 const orderQty = orderQuantities[item.itemId] || item.quantity;
                 if(orderQty > 0) body += `- ${item.itemName} (For SO: ${item.salesOrderId}) --- Qty: ${orderQty}\n`;
            });
        }

        body += `\nThank you,\nTojem`;
        window.location.href = `mailto:${supplierEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        if (supplierDetails.name !== 'Admin Purchase Request') {
            try {
                if (stockItems.length > 0) {
                    await markItemsAsOrdered(supplierDetails, stockItems, orderQuantities);
                }
                if (jobItems.length > 0) {
                    await markOneOffItemsAsOrdered(jobItems.map(item => item.id));
                }
                toast.success("Items marked as ordered and moved to 'In-Transit'.");
                onAction();
            } catch(error) {
                console.error("Error marking items as ordered:", error);
                toast.error("Failed to mark items as ordered.");
            }
        } else {
            toast.success("Admin purchase request email has been generated.");
        }
    };

    if (loadingPricing) return <p className="text-center p-8 text-gray-400">Analyzing purchasing requirements...</p>;
    if (unifiedQueue.length === 0) return <p className="text-center text-gray-400 p-8">The purchasing queue is empty.</p>;

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Items Requiring Purchase ({unifiedQueue.length})</h3>
                     <Button onClick={() => setAddSupplierModalOpen(true)} variant="secondary"><UserPlus size={16} className="mr-2"/>Add New Supplier</Button>
                </div>
                <div className="space-y-4">
                    {unifiedQueue.map(item => {
                        const pricingOptions = allPricing[item.itemId] || [];
                        const cheapestOption = pricingOptions.length > 0 ? pricingOptions.reduce((min, p) => p.price < min.price ? p : min) : null;
                        const recommendedQty = item.type === 'Stock' ? Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0)) : item.quantity;
                        
                        return (
                            <div key={item.id} className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center bg-gray-900/50 p-4 rounded-lg">
                                <div>
                                    <p className="font-semibold text-white flex items-center gap-2">
                                       {item.type === 'Stock' ? <Package size={16} className="text-blue-400"/> : <Wrench size={16} className="text-purple-400"/>}
                                       {item.itemName}
                                    </p>
                                    <p className="text-xs text-gray-400 ml-8">{item.type === 'Stock' ? (item.itemCode || 'No Code') : `For SO: ${item.salesOrderId}`}</p>
                                </div>
                                <div>
                                     <Dropdown 
                                        label="Select Supplier"
                                        value={selectedSuppliers[item.itemId] || ''}
                                        onChange={(e) => handleSupplierSelection(item.itemId, e.target.value)}
                                        options={pricingOptions.map(p => ({ id: p.supplierId, name: `${p.supplierName} - R${p.price.toFixed(2)}` }))}
                                        placeholder="Choose supplier..."
                                    />
                                </div>
                                <div className="text-center">
                                    {item.type === 'Stock' && <p className="text-xs text-gray-400">Current: {item.currentStock}</p>}
                                    <p className="text-xs text-green-400">Recommended: {recommendedQty}</p>
                                </div>
                                <div className="w-32 mx-auto">
                                     <Input 
                                        label="Order Qty"
                                        type="number"
                                        value={orderQuantities[item.itemId] === undefined ? recommendedQty : orderQuantities[item.itemId]}
                                        onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                                    />
                                 </div>
                                <div className="text-center">
                                    <label className="flex items-center justify-center gap-2 text-sm text-gray-300 cursor-pointer">
                                         <input type="checkbox" checked={!!sendToAdmin[item.itemId]} onChange={() => handleSendToAdminToggle(item.itemId)} className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"/>
                                        Send to Admin
                                    </label>
                                 </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {groupedOrders.map((group) => (
                <div key={group.supplierDetails.email} className="bg-blue-900/20 p-6 rounded-xl border border-blue-500/50">
                     <div className="flex justify-between items-center mb-4">
                         <div>
                             <h3 className="text-xl font-bold text-white flex items-center gap-2"><ThumbsUp/> PO for: {group.supplierDetails.name}</h3>
                             <p className="text-sm text-gray-400">{group.supplierDetails.email}</p>
                         </div>
                         <Button onClick={() => handleGenerateEmail(group)}>Generate Email & Mark as Ordered</Button>
                     </div>
                </div>
            ))}
             {isAddSupplierModalOpen && <AddSupplierModal onClose={() => setAddSupplierModalOpen(false)} onSupplierAdded={onAction}/>}
        </div>
    );
};

// Main Page Component
const PurchasingPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [purchaseQueue, setPurchaseQueue] = useState([]);
  const [jobQueue, setJobQueue] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzerOpen, setAnalyzerOpen] = useState(false);

  const fetchData = () => {
    setLoading(true);
    getSuppliers().then(setSuppliers).catch(err => console.error("Error fetching suppliers:", err));
    
    const unsubscribeStock = listenToPurchaseQueue(items => {
        setPurchaseQueue(items);
        setLoading(false);
    });
    const unsubscribeJobs = listenToOneOffPurchases(items => {
        setJobQueue(items.filter(item => item.status === 'Pending Purchase'));
        setLoading(false);
    });

    return () => {
        unsubscribeStock();
        unsubscribeJobs();
    };
  };

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => unsubscribe();
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

  const { pendingStockItems, inTransitItems } = useMemo(() => {
    return {
        pendingStockItems: purchaseQueue.filter(i => i.status === 'pending'),
        inTransitItems: purchaseQueue.filter(i => i.status === 'ordered')
    }
  }, [purchaseQueue]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-white">Stock Control & Purchasing</h2>
            <Button onClick={() => setAnalyzerOpen(true)} variant="primary">
                <BrainCircuit size={18} className="mr-2"/>
                Predictive Analyzer
            </Button>
        </div>

        <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-6">
                <TabButton id="dashboard" label="Stock Overview" />
                <TabButton id="queue" label="Purchase Queue" count={pendingStockItems.length + jobQueue.length} />
                <TabButton id="transit" label="In-Transit Orders" count={inTransitItems.length} />
            </nav>
        </div>
        <div className="mt-6">
            {activeTab === 'dashboard' && <StockControlDashboard />}
            {activeTab === 'queue' && (loading ? <p className="text-center text-gray-400 p-8">Loading Queue...</p> : <PurchaseHub stockItems={pendingStockItems} jobItems={jobQueue} suppliers={suppliers} onAction={fetchData} />)}
            {activeTab === 'transit' && (loading ? <p className="text-center text-gray-400 p-8">Loading In-Transit Orders...</p> : <InTransitOrders items={inTransitItems} suppliers={suppliers} onStockReceived={fetchData} />)}
        </div>
      </div>

      {isAnalyzerOpen && <FutureDemandAnalyzer onClose={() => setAnalyzerOpen(false)} />}
    </>
  );
};

export default PurchasingPage;
