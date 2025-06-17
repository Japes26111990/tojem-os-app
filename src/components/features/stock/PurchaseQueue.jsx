import React, { useState, useEffect, useMemo } from 'react';
import { getPurchaseQueue, getSuppliers, markItemsAsOrdered } from '../../../api/firestore';
import Button from '../../ui/Button';

const PurchaseQueue = ({ onOrderPlaced }) => {
  const [queuedItems, setQueuedItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orderQuantities, setOrderQuantities] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [queue, supplierList] = await Promise.all([getPurchaseQueue(), getSuppliers()]);
    const pendingItems = queue.filter(item => item.status === 'pending');
    setQueuedItems(pendingItems);
    setSuppliers(supplierList);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuantityChange = (itemId, qty) => {
    setOrderQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  const groupedBySupplier = useMemo(() => {
    const groups = {};
    queuedItems.forEach(item => {
      const supplier = suppliers.find(s => s.id === item.supplierId);
      if (!supplier) return;
      if (!groups[supplier.id]) {
        groups[supplier.id] = { supplierDetails: supplier, items: [] };
      }
      groups[supplier.id].items.push(item);
    });
    return Object.values(groups).sort((a, b) => a.supplierDetails.name.localeCompare(b.supplierDetails.name));
  }, [queuedItems, suppliers]);

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

    const itemIdsToUpdate = group.items.map(item => item.id);
    markItemsAsOrdered(group.supplierDetails, group.items, orderQuantities).then(() => {
        alert("Items have been marked as ordered and removed from the queue.");
        fetchData();
        if(onOrderPlaced) onOrderPlaced();
    });
  };

  if (loading) return <p className="text-center text-gray-400">Loading purchase queue...</p>;

  return (
    <div className="space-y-6">
      {groupedBySupplier.length === 0 && <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center text-gray-400">Your purchase queue is empty.</div>}
      {groupedBySupplier.map(({ supplierDetails, items }) => (
        <div key={supplierDetails.id} className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-white">{supplierDetails.name}</h3>
              <p className="text-sm text-gray-400">{supplierDetails.email}</p>
            </div>
            <Button onClick={() => handleGenerateEmail({ supplierDetails, items })}>Generate Email Order</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="p-2 text-sm font-semibold text-gray-400">Item</th>
                  <th className="p-2 text-sm font-semibold text-gray-400 text-center">Current / Reorder</th>
                  <th className="p-2 text-sm font-semibold text-gray-400 text-center">Recommended Qty</th>
                  <th className="p-2 text-sm font-semibold text-gray-400 w-32">Order Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const recommendedQty = Math.max(0, (item.standardStockLevel || 0) - (item.currentStock || 0));
                  return (
                    <tr key={item.id} className="border-b border-gray-700">
                      <td className="p-2 text-gray-200">{item.itemName}</td>
                      <td className="p-2 text-gray-400 text-center">{item.currentStock} / {item.reorderLevel}</td>
                      <td className="p-2 text-green-400 font-bold text-center">{recommendedQty}</td>
                      <td className="p-2">
                        {/* --- THIS IS THE CORRECTED PART --- */}
                        <input 
                          type="number" 
                          value={orderQuantities[item.id] || recommendedQty} 
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
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