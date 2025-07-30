import React, { useState, useEffect, useMemo } from 'react';
import { getAllInventoryItems, getSuppliers, getPurchaseQueue, addToPurchaseQueue } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Search, Package, Factory, DollarSign } from 'lucide-react'; // Import DollarSign icon
import { JOB_STATUSES } from '../../config'; // Import JOB_STATUSES

// NEW: KPI Card component for displaying the total value
const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const StockLevelIndicator = ({ currentStock, reorderLevel, standardStockLevel }) => {
    const stock = Number(currentStock);
    const reorder = Number(reorderLevel);
    const standard = Number(standardStockLevel);
    if (isNaN(stock) || isNaN(reorder) || isNaN(standard) || standard <= reorder) return <div className="text-xs text-gray-500 italic">Not tracked</div>;
    const isLowStock = stock < reorder;
    const range = standard - reorder;
    const stockInRange = stock - reorder;
    const percentage = Math.max(0, Math.min((stockInRange / range) * 100, 100));
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-300">{stock} / {standard}</span>
                <span className={`font-bold ${isLowStock ? 'text-red-400' : 'text-green-400'}`}>{isLowStock ? `Low (Reorder at ${reorder})` : 'In Stock'}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2"><div className={`h-2 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${percentage}%` }}></div></div>
        </div>
    );
};

const StockControlDashboard = () => {
  const [allItems, setAllItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [queuedItemIds, setQueuedItemIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showLowStock, setShowLowStock] = useState(false);
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState('all');

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

  // UPDATED: Added calculation for total inventory value
  const { displayedItems, totalInventoryValue } = useMemo(() => {
    let filtered = [...(allItems || [])];
    let value = 0;

    // Calculate total value before filtering
    filtered.forEach(item => {
        value += (item.currentStock || 0) * (item.price || 0);
    });

    if (inventoryTypeFilter === 'products') {
        filtered = filtered.filter(item => item.category === JOB_STATUSES.PRODUCT); // Use JOB_STATUSES.PRODUCT
    } else if (inventoryTypeFilter === 'purchased') {
        filtered = filtered.filter(item => item.category !== JOB_STATUSES.PRODUCT); // Use JOB_STATUSES.PRODUCT
    }

    if (showLowStock) { filtered = filtered.filter(item => Number(item.currentStock) < Number(item.reorderLevel)); }
    if (searchTerm) { 
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.itemCode && item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
        ); 
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'supplier': return getSupplierName(a.supplierId).localeCompare(getSupplierName(b.supplierId));
        case 'stock-low-high': return (a.currentStock / a.reorderLevel) - (b.currentStock / b.reorderLevel);
        default: return 0;
      }
    });
    return { displayedItems: filtered, totalInventoryValue: value };
  }, [allItems, searchTerm, sortBy, showLowStock, suppliers, inventoryTypeFilter]);

  const handleAddToQueue = async (item) => {
    try {
      await addToPurchaseQueue({
        itemId: item.id,
        itemName: item.name,
        supplierId: item.supplierId,
        itemCode: item.itemCode || '',
        category: item.category,
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
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6">
      {/* NEW: KPI Card for Total Inventory Value */}
      <KpiCard
        icon={<DollarSign size={28} />}
        title="Total Value of Stock on Hand"
        value={`R ${totalInventoryValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        color="bg-green-500/20 text-green-400"
      />

      <div className="flex flex-wrap gap-4 items-center p-4 bg-gray-900/50 rounded-lg">
          <div className="relative flex-grow">
            <Input placeholder="Search all inventory..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
              <option value="name-asc">Sort by Name</option>
              <option value="supplier">Sort by Supplier</option>
              <option value="stock-low-high">Sort by Stock Level</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-white">
            <input type="checkbox" id="lowStockToggle" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} className="h-5 w-5 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="lowStockToggle" className="text-sm font-medium">Show only low stock</label>
          </div>
          <div className="flex items-center space-x-2 text-white">
            <label htmlFor="inventoryTypeFilter" className="text-sm font-medium">Show:</label>
            <select value={inventoryTypeFilter} onChange={e => setInventoryTypeFilter(e.target.value)} className="p-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm">
                <option value="all">All Inventory</option>
                <option value="products">Manufactured Products</option>
                <option value="purchased">Purchased Items</option>
            </select>
          </div>
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
                <tr key={`${item.id}-${item.category}`} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-3 text-gray-200 font-semibold flex items-center gap-2">
                    {item.category === JOB_STATUSES.PRODUCT ? <Factory size={16} className="text-teal-400"/> : <Package size={16} className="text-blue-400"/>}
                    {item.name}
                  </td>
                  <td className="p-3 text-gray-400">{item.category}</td>
                  <td className="p-3 text-gray-400">{getSupplierName(item.supplierId)}</td>
                  <td className="p-3">
                    <StockLevelIndicator 
                        currentStock={item.currentStock} 
                        reorderLevel={item.reorderLevel} 
                        standardStockLevel={item.standardStockLevel} 
                    />
                  </td>
                  <td className="p-3">
                    {isQueued ? (
                      <Button variant="success" disabled={true} className="text-xs">Queued</Button>
                    ) : (
                      <Button variant="primary" onClick={() => handleAddToQueue(item)} className="text-xs">Add to Queue</Button>
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
