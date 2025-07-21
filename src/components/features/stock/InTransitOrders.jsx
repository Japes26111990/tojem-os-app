// src/components/features/stock/InTransitOrders.jsx

import React, { useState } from 'react';
import { receiveStockAndUpdateInventory, requeueOrDeleteItem } from '../../../api/firestore';
import Button from '../../ui/Button';
import ConfirmationModal from '../../ui/ConfirmationModal';
import toast from 'react-hot-toast';

const InTransitOrders = ({ items, suppliers, onStockReceived }) => {
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [confirmation, setConfirmation] = useState({ isOpen: false });

  const getSupplierName = (supplierId) => (suppliers || []).find(s => s.id === supplierId)?.name || 'N/A';
  
  const handleQuantityChange = (itemId, qty) => {
    setReceivedQuantities(prev => ({ ...prev, [itemId]: qty }));
  };

  const confirmReceiveStock = (item) => {
    const qtyReceived = receivedQuantities[item.id] || item.orderedQty;
    if (!qtyReceived || qtyReceived <= 0) {
      return toast.error("Please enter a valid quantity received.");
    }
    setConfirmation({
        isOpen: true,
        title: "Confirm Stock Receipt",
        message: `Are you sure you want to add ${qtyReceived} of ${item.itemName} to your stock?`,
        onConfirm: () => handleReceiveStock(item, qtyReceived),
        confirmText: "Yes, Receive Stock",
        confirmVariant: "primary"
    });
  };

  const handleReceiveStock = async (item, qtyReceived) => {
    try {
      await receiveStockAndUpdateInventory(item, qtyReceived);
      toast.success("Stock updated successfully!");
      if (onStockReceived) onStockReceived();
    } catch (error) {
      console.error("Error receiving stock: ", error);
      toast.error("Failed to update stock.");
    } finally {
        setConfirmation({ isOpen: false });
    }
  };

  const confirmCancelOrder = (item) => {
    setConfirmation({
        isOpen: true,
        title: "Cancel In-Transit Order",
        message: `Are you sure you want to cancel this order for "${item.itemName}"? This may add it back to the purchase queue if stock is still low.`,
        onConfirm: () => handleCancelOrder(item),
        confirmText: "Yes, Cancel Order",
        confirmVariant: "danger"
    });
  };
  
  const handleCancelOrder = async (item) => {
    try {
        await requeueOrDeleteItem(item);
        toast.success("Order cancelled successfully.");
        if (onStockReceived) onStockReceived();
    } catch (error) {
        console.error("Error cancelling order:", error);
        toast.error("Failed to cancel order.");
    } finally {
        setConfirmation({ isOpen: false });
    }
  };
  
  const calculateEta = (etaTimestamp) => {
    if (!etaTimestamp?.seconds) return { text: 'N/A', color: 'text-gray-400' };
    const etaDate = new Date(etaTimestamp.seconds * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = etaDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, color: 'text-red-500 font-bold' };
    if (diffDays === 0) return { text: 'Arriving Today', color: 'text-yellow-400 font-bold' };
    if (diffDays === 1) return { text: 'Arriving Tomorrow', color: 'text-blue-400' };
    return { text: `Arriving in ${diffDays} days`, color: 'text-gray-300' };
  };

  return (
    <>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">In-Transit Orders</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="p-2 text-sm font-semibold text-gray-400">Item</th>
                      <th className="p-2 text-sm font-semibold text-gray-400">Supplier</th>
                      <th className="p-2 text-sm font-semibold text-gray-400 text-center">Qty Ordered</th>
                      <th className="p-2 text-sm font-semibold text-gray-400">ETA</th>
                      <th className="p-2 text-sm font-semibold text-gray-400 w-32">Qty Received</th>
                      <th className="p-2 text-sm font-semibold text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(items || []).map(item => {
                        const eta = calculateEta(item.expectedArrivalDate);
                        return(
                            <tr key={item.id} className="border-b border-gray-700">
                              <td className="p-2 text-gray-200">{item.itemName}</td>
                              <td className="p-2 text-gray-400">{getSupplierName(item.orderedFromSupplierId)}</td>
                              <td className="p-2 text-gray-300 font-bold text-center">{item.orderedQty}</td>
                              <td className={`p-2 text-sm ${eta.color}`}>{eta.text}</td>
                              <td className="p-2">
                                <input 
                                    type="number" 
                                    value={receivedQuantities[item.id] === undefined ? item.orderedQty : receivedQuantities[item.id]}
                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="p-2 flex gap-2">
                                <Button variant="success" className="text-xs py-1 px-2" onClick={() => confirmReceiveStock(item)}>Receive</Button>
                                <Button variant="danger" className="text-xs py-1 px-2" onClick={() => confirmCancelOrder(item)}>Cancel</Button>
                              </td>
                            </tr>
                        )
                    })}
                  </tbody>
                </table>
                {items.length === 0 && <p className="text-center p-8 text-gray-400">No items are currently on order.</p>}
            </div>
        </div>
        <ConfirmationModal 
            isOpen={confirmation.isOpen}
            onClose={() => setConfirmation({ isOpen: false })}
            {...confirmation}
        />
    </>
  );
};

export default InTransitOrders;
