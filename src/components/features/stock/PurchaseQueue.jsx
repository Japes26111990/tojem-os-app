// src/components/features/stock/PurchaseQueue.jsx (Upgraded for Dynamic Supplier Quoting)

import React, { useState, useEffect, useMemo } from 'react';
import { getPurchaseQueue, getSuppliers, markItemsAsOrdered, getSupplierPricingForItem } from '../../../api/firestore';
import Button from '../../ui/Button';
import { ThumbsUp, Tag } from 'lucide-react';
import Input from '../../ui/Input';

const PurchaseQueue = ({ onOrderPlaced }) => {
  const [queuedItems, setQueuedItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [allPricing, setAllPricing] = useState({});
  const [orderQuantities, setOrderQuantities] = useState({});
  const [selectedSuppliers, setSelectedSuppliers] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [queue, supplierList] = await Promise.all([getPurchaseQueue(), getSuppliers()]);
    const pendingItems = queue.filter(item => item.status === 'pending');
    setQueuedItems(pendingItems);
    setSuppliers(supplierList);

    // Fetch all pricing info for all queued items
    const pricingMap = {};
    const pricingPromises = pendingItems.map(async (item) => {
      const prices = await getSupplierPricingForItem(item.itemId);
      pricingMap[item.itemId] = prices;
    });
    await Promise.all(pricingPromises);
    setAllPricing(pricingMap);

    // Pre-select the cheapest supplier for each item
    const initialSelections = {};
    pendingItems.forEach(item => {
        const prices = pricingMap[item.itemId] || [];
        if (prices.length > 0) {
            const cheapest = prices.reduce((min, p) => p.price < min.price ? p : min, prices[0]);
            initialSelections[item.itemId] = cheapest.supplierId;
        }
    });
    setSelectedSuppliers(initialSelections);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuantityChange = (itemId, qty) => {
    setOrderQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleSupplierSelection = (itemId, supplierId) => {
    setSelectedSuppliers(prev => ({...prev, [itemId]: supplierId}));
  };

  // Group items by the *currently selected* supplier
  const groupedBySelectedSupplier = useMemo(() => {
    const groups = {};
    queuedItems.forEach(item => {
      const selectedSupplierId = selectedSuppliers[item.itemId];
      if (!selectedSupplierId) return; // Skip if no supplier is selected for this item

      if (!groups[selectedSupplierId]) {
        const supplierDetails = suppliers.find(s => s.id === selectedSupplierId);
        if(supplierDetails) {
            groups[selectedSupplierId] = { supplierDetails: supplierDetails, items: [] };
        }
      }
      if(groups[selectedSupplierId]) {
        groups[selectedSupplierId].items.push(item);
      }
    });
    return Object.values(groups).sort((a, b) => a.supplierDetails.name.localeCompare(b.supplierDetails.name));
  }, [queuedItems, suppliers, selectedSuppliers]);

  const handleGenerateEmail = (group) => {
    const supplierEmail = group.supplierDetails.email || '';
    const subject = encodeURIComponent(`Purchase Order - TOJEM`);
    let body = `Hi ${group.supplierDetails.contactPerson || group.supplierDetails.name},\n\nPlease supply the following items:\n\n`;
    
    group.items.forEach(item => {
      const recommendedQty = Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0));
      const orderQty = orderQuantities[item.id] || recommendedQty;
      if (orderQty > 0) {
        body += `- ${item.itemName} (Code: ${item.itemCode || 'N/A'}) --- Qty: ${orderQty}\n`;
      }
    });

    body += `\nThank you,\nTojem`;
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:${supplierEmail}?subject=${subject}&body=${encodedBody}`;

    markItemsAsOrdered(group.supplierDetails, group.items, orderQuantities).then(() => {
        alert("Items have been marked as ordered and removed from the queue.");
        fetchData();
        if(onOrderPlaced) onOrderPlaced();
    });
  };
  
  const getItemPricingOptions = (itemId) => {
      return allPricing[itemId] || [];
  };

  if (loading) return <p className="text-center text-gray-400">Loading purchase queue...</p>;

  return (
    <div className="space-y-6">
      {queuedItems.length === 0 && <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center text-gray-400">Your purchase queue is empty.</div>}
      
      {/* Items to be ordered, now listed individually */}
       {queuedItems.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Items Requiring Purchase</h3>
                <div className="space-y-4">
                    {queuedItems.map(item => {
                        const pricingOptions = getItemPricingOptions(item.itemId);
                        const cheapestOption = pricingOptions.length > 0 ? pricingOptions.reduce((min, p) => p.price < min.price ? p : min) : null;
                        const recommendedQty = Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0));
                        return (
                            <div key={item.id} className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center bg-gray-900/50 p-4 rounded-lg">
                                <div>
                                    <p className="font-semibold text-white">{item.itemName}</p>
                                    <p className="text-xs text-gray-400">{item.itemCode || 'No Code'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1">Select Supplier</label>
                                    <select 
                                        value={selectedSuppliers[item.itemId] || ''}
                                        onChange={(e) => handleSupplierSelection(item.itemId, e.target.value)}
                                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                                    >
                                        <option value="" disabled>Choose...</option>
                                        {pricingOptions.map(p => (
                                            <option key={p.id} value={p.supplierId}>
                                                {p.supplierName} - R{p.price.toFixed(2)} {p.supplierId === cheapestOption?.supplierId ? ' (Best Price)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 text-center">Current: {item.currentStock}</p>
                                    <p className="text-xs text-green-400 text-center">Recommended to order: {recommendedQty}</p>
                                </div>
                                <div>
                                    <Input 
                                        label="Order Qty"
                                        type="number"
                                        value={orderQuantities[item.id] || recommendedQty}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

      {/* Grouped orders ready to be generated */}
      {groupedBySelectedSupplier.map(({ supplierDetails, items }) => (
        <div key={supplierDetails.id} className="bg-blue-900/20 p-6 rounded-xl border border-blue-500/50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><ThumbsUp/> Order for: {supplierDetails.name}</h3>
              <p className="text-sm text-gray-400">{supplierDetails.email}</p>
            </div>
            <Button onClick={() => handleGenerateEmail({ supplierDetails, items })}>Generate Email & Mark as Ordered</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-blue-400/30">
                <tr>
                  <th className="p-2 font-semibold text-gray-300">Item</th>
                  <th className="p-2 font-semibold text-gray-300 text-center">Order Qty</th>
                  <th className="p-2 font-semibold text-gray-300 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                    const pricing = allPricing[item.itemId]?.find(p => p.supplierId === supplierDetails.id);
                    const orderQty = orderQuantities[item.id] || Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0));
                  return (
                    <tr key={item.id} className="border-b border-blue-400/20">
                      <td className="p-2 text-gray-200">{item.itemName}</td>
                      <td className="p-2 text-white font-bold text-center">{orderQty}</td>
                      <td className="p-2 text-green-400 font-mono text-right">R {pricing ? pricing.price.toFixed(2) : 'N/A'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PurchaseQueue;
