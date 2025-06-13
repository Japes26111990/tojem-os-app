import React, { useState, useEffect, useMemo } from 'react';
// 1. Import addToPurchaseQueue
import { getWorkshopSupplies, addWorkshopSupply, deleteWorkshopSupply, getSuppliers, updateWorkshopSupply, addToPurchaseQueue } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Search } from 'lucide-react';

const StockLevelIndicator = ({ currentStock, reorderLevel, standardStockLevel }) => {
  const stock = Number(currentStock);
  const reorder = Number(reorderLevel);
  const standard = Number(standardStockLevel);

  if (isNaN(stock) || isNaN(reorder) || isNaN(standard) || standard <= reorder) {
    return <div className="text-xs text-gray-500 italic">Not tracked</div>;
  }
  
  const isLowStock = stock < reorder;
  const range = standard - reorder;
  const stockInRange = stock - reorder;
  const percentage = Math.max(0, Math.min((stockInRange / range) * 100, 100));

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-gray-300">{stock} / {standard}</span>
        <span className={`font-bold ${isLowStock ? 'text-red-400' : 'text-green-400'}`}>
          {isLowStock ? `Low (Reorder at ${reorder})` : 'In Stock'}
        </span>
      </div>
      <div className="w-full bg-gray-600 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};


const WorkshopSuppliesManager = () => {
  const [supplies, setSupplies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [newSupply, setNewSupply] = useState({ name: '', itemCode: '', price: '', unit: '', supplierId: '', currentStock: '', reorderLevel: '', standardStockLevel: '' });
  const [loading, setLoading] = useState(true);
  const [editingSupplyId, setEditingSupplyId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showLowStock, setShowLowStock] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedSupplies, fetchedSuppliers] = await Promise.all([getWorkshopSupplies(), getSuppliers()]);
    setSupplies(fetchedSupplies);
    setSuppliers(fetchedSuppliers);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getSupplierName = (supplierId) => (suppliers || []).find(s => s.id === supplierId)?.name || 'N/A';

  const displayedSupplies = useMemo(() => {
    let filtered = [...(supplies || [])];

    if (showLowStock) {
      filtered = filtered.filter(item => Number(item.currentStock) < Number(item.reorderLevel));
    }

    if (searchTerm) {
      filtered = filtered.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'supplier': return getSupplierName(a.supplierId).localeCompare(getSupplierName(b.supplierId));
        case 'stock-low-high': return Number(a.currentStock) - Number(b.currentStock);
        case 'stock-high-low': return Number(b.currentStock) - Number(a.currentStock);
        default: return 0;
      }
    });

    return filtered;
  }, [supplies, searchTerm, sortBy, showLowStock, suppliers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSupply(prevState => ({ ...prevState, [name]: value }));
  };

  // --- 2. UPDATED handleSubmit with Auto-Queue Logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newSupply.name.trim() || !newSupply.supplierId) { return alert("Supply name and supplier are required."); }
    
    const dataToSave = {
      name: newSupply.name,
      itemCode: newSupply.itemCode || '',
      supplierId: newSupply.supplierId,
      price: parseFloat(newSupply.price) || 0,
      unit: newSupply.unit || '',
      currentStock: parseInt(newSupply.currentStock, 10) || 0,
      reorderLevel: parseInt(newSupply.reorderLevel, 10) || 0,
      standardStockLevel: parseInt(newSupply.standardStockLevel, 10) || 0,
    };

    try {
      let docId = editingSupplyId;
      if (editingSupplyId) { 
        await updateWorkshopSupply(editingSupplyId, dataToSave); 
      } else { 
        const newDoc = await addWorkshopSupply(dataToSave);
        docId = newDoc.id; // Get the ID of the new document
      }
      
      // Check for auto-reorder after saving
      if (dataToSave.currentStock > 0 && dataToSave.reorderLevel > 0 && dataToSave.currentStock < dataToSave.reorderLevel) {
        await addToPurchaseQueue({
            itemId: docId,
            itemName: dataToSave.name,
            supplierId: dataToSave.supplierId,
            itemCode: dataToSave.itemCode,
            category: 'Workshop Supply'
        });
        alert(`'${dataToSave.name}' is low on stock and has been automatically added to the reorder list!`);
      }

      cancelEdit();
      fetchData();
    } catch (error) { 
      console.error("Error saving supply:", error); 
      alert("Failed to save supply."); 
    }
  };
  
  const handleEdit = (supply) => { setEditingSupplyId(supply.id); setNewSupply(supply); };
  const cancelEdit = () => { setEditingSupplyId(null); setNewSupply({ name: '', itemCode: '', price: '', unit: '', supplierId: '', currentStock: '', reorderLevel: '', standardStockLevel: '' }); };
  const handleDelete = async (id) => { if (window.confirm("Are you sure you want to delete this supply?")) { await deleteWorkshopSupply(id); fetchData(); } };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Workshop Supplies</h3>
      <p className="text-sm text-gray-400 mb-6">Items used during production but not part of the final product (e.g., rags, tape, sandpaper).</p>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end mb-6">
        <Input label="Supply Name" name="name" value={newSupply.name} onChange={handleInputChange} placeholder="e.g., Sandpaper" />
        <Input label="Item Code" name="itemCode" value={newSupply.itemCode} onChange={handleInputChange} placeholder="Optional" />
        <Dropdown label="Supplier" name="supplierId" value={newSupply.supplierId} onChange={handleInputChange} options={suppliers} placeholder="Select Supplier..." />
        <Input label="Current Stock" name="currentStock" type="number" value={newSupply.currentStock} onChange={handleInputChange} placeholder="e.g., 50" />
        <Input label="Reorder Lvl" name="reorderLevel" type="number" value={newSupply.reorderLevel} onChange={handleInputChange} placeholder="e.g., 20" />
        <div className="flex space-x-2">
          <Button type="submit" variant="primary" className="w-full">{editingSupplyId ? 'Update' : 'Add'}</Button>
          {editingSupplyId && <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button>}
        </div>
      </form>

      <div className="flex flex-wrap gap-4 items-center mb-4 p-4 bg-gray-900/50 rounded-lg">
        <div className="relative flex-grow">
          <Input placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
            <option value="name-asc">Sort by Name (A-Z)</option>
            <option value="name-desc">Sort by Name (Z-A)</option>
            <option value="supplier">Sort by Supplier</option>
            <option value="stock-low-high">Sort by Stock (Low to High)</option>
            <option value="stock-high-low">Sort by Stock (High to Low)</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 text-white">
          <input type="checkbox" id="lowStockToggle" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} className="h-5 w-5 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="lowStockToggle" className="text-sm font-medium">Show only low stock</label>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-5 gap-4 px-3 py-2 text-sm font-semibold text-gray-400 border-b border-gray-700">
        <div className="col-span-2">Name</div>
        <div>Supplier</div>
        <div className="col-span-2">Stock Level</div>
      </div>
      <div className="space-y-3 mt-2">
        {loading ? <p className="text-center p-4">Loading...</p> : (displayedSupplies || []).map(item => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-200 col-span-2 font-semibold">{item.name}</p>
            <p className="text-gray-400">{getSupplierName(item.supplierId)}</p>
            <div className="col-span-2">
              <StockLevelIndicator 
                currentStock={item.currentStock} 
                reorderLevel={item.reorderLevel} 
                standardStockLevel={item.standardStockLevel} 
              />
            </div>
            <div className="text-right flex items-center justify-end gap-2">
              <Button onClick={() => handleEdit(item)} variant="secondary" className="py-1 px-3 text-xs">Edit</Button>
              <Button onClick={() => handleDelete(item.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
            </div>
          </div>
        ))}
        {(displayedSupplies || []).length === 0 && !loading && <p className="text-center p-4 text-gray-500">No matching supplies found.</p>}
      </div>
    </div>
  );
};

export default WorkshopSuppliesManager;