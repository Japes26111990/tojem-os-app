import React, { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems, getSuppliers, getPurchaseQueue, addToPurchaseQueue } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Search } from 'lucide-react';

const StockLevelIndicator = ({ currentStock, reorderLevel, standardStockLevel }) => { /* ... No changes ... */ };

const StockControlDashboard = () => {
  const [allItems, setAllItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [queuedItemIds, setQueuedItemIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showLowStock, setShowLowStock] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [inventory, supplierList, queue] = await Promise.all([getAllInventoryItems(), getSuppliers(), getPurchaseQueue()]);
    setAllItems(inventory);
    setSuppliers(supplierList);
    setQueuedItemIds(new Set(queue.map(item => item.itemId)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getSupplierName = (supplierId) => (suppliers || []).find(s => s.id === supplierId)?.name || 'N/A';

  const displayedItems = useMemo(() => {
    let filtered = [...(allItems || [])];
    if (showLowStock) { filtered = filtered.filter(item => Number(item.currentStock) < Number(item.reorderLevel)); }
    if (searchTerm) { filtered = filtered.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())); }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'supplier': return getSupplierName(a.supplierId).localeCompare(getSupplierName(b.supplierId));
        case 'stock-low-high': return (a.currentStock / a.reorderLevel) - (b.currentStock / b.reorderLevel);
        default: return 0;
      }
    });
    return filtered;
  }, [allItems, searchTerm, sortBy, showLowStock, suppliers]);

  const handleAddToQueue = async (item) => {
    try {
      await addToPurchaseQueue({
        itemId: item.id,
        itemName: item.name,
        supplierId: item.supplierId,
        itemCode: item.itemCode || '',
        category: item.category,
        // Add the new fields we need for the queue
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        standardStockLevel: item.standardStockLevel,
        price: item.price,
        unit: item.unit
      });
      setQueuedItemIds(prev => new Set(prev).add(item.id));
    } catch (error) {
      console.error("Error adding to queue:", error);
      alert("Failed to add to reorder list.");
    }
  };

  if (loading) return <p className="text-center text-gray-400">Loading all inventory...</p>;

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex flex-wrap gap-4 items-center mb-4 p-4 bg-gray-900/50 rounded-lg">
         {/* ... Search, Sort, and Filter controls are the same ... */}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="p-3 text-sm font-semibold text-gray-400">Item Name</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Category</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Supplier</th>
              <th className="p-3 text-sm font-semibold text-gray-400 w-1/4">Stock Level</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(displayedItems).map(item => {
              const isQueued = queuedItemIds.has(item.id);
              return (
                <tr key={`<span class="math-inline">\{item\.id\}\-</span>{item.category}`} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-3 text-gray-200 font-semibold">{item.name}</td>
                  <td className="p-3 text-gray-400">{item.category}</td>
                  <td className="p-3 text-gray-400">{getSupplierName(item.supplierId)}</td>
                  <td className="p-3"><StockLevelIndicator currentStock={item.currentStock} reorderLevel={item.reorderLevel} standardStockLevel={item.standardStockLevel} /></td>
                  <td className="p-3">
                    {isQueued ? (
                      <Button variant="success" disabled={true}>Queued</Button>
                    ) : (
                      <Button variant="primary" onClick={() => handleAddToQueue(item)}>Add to Queue</Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {displayedItems.length === 0 && !loading && <p className="text-center p-8 text-gray-400">No inventory items found.</p>}
      </div>
    </div>
  );
};

export default StockControlDashboard;