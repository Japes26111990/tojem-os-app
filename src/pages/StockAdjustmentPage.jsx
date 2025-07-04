import React, { useEffect, useState } from 'react';
import { getAllInventoryItems, updateStockCount } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

const StockAdjustmentPage = () => {
  const [items, setItems] = useState([]);
  const [sessionId] = useState(`ADJ-${Date.now()}`);

  useEffect(() => {
    getAllInventoryItems().then(setItems);
  }, []);

  const handleChange = (id, value) => {
    setItems(prev =>
      prev.map(i => i.id === id ? { ...i, newCount: value } : i)
    );
  };

  const commitChanges = async () => {
    const changes = items.filter(i => i.newCount !== undefined && i.newCount !== '');
    for (const item of changes) {
      try {
        await updateStockCount(item.id, item.category, parseFloat(item.newCount), sessionId);
        toast.success(`Updated ${item.name}`);
      } catch (err) {
        console.error(err);
        toast.error(`Failed to update ${item.name}`);
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Stock Adjustment</h1>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-gray-800 p-3 rounded border border-gray-700">
            <p className="text-white font-semibold">{item.name}</p>
            <p className="text-sm text-gray-400">Current: {item.currentStock} | Unit: {item.unit}</p>
            <Input
              label="New Count"
              type="number"
              value={item.newCount || ''}
              onChange={(e) => handleChange(item.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <Button onClick={commitChanges} className="mt-4">Commit Stock Changes</Button>
    </div>
  );
};

export default StockAdjustmentPage;
