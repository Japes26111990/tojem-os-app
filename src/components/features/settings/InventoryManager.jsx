import React, { useState, useEffect, useMemo } from 'react';
import { 
  getComponents, addComponent, updateComponent, deleteComponent,
  getRawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial,
  getWorkshopSupplies, addWorkshopSupply, updateWorkshopSupply, deleteWorkshopSupply,
  getSuppliers 
} from '../../../api/firestore';
import { useInventoryManager } from '../../../hooks/useInventoryManager';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Search } from 'lucide-react';

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
                <span className={`font-bold ${isLowStock ? 'text-red-400' : 'text-green-400'}`}>{isLowStock ? `Low (Reorder @ ${reorder})` : 'In Stock'}</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2"><div className={`h-2 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${percentage}%` }}></div></div>
        </div>
    );
};

const InventoryManager = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [category, setCategory] = useState('components');

  useEffect(() => {
    const fetchSuppliersData = async () => {
      const fetchedSuppliers = await getSuppliers();
      setSuppliers(fetchedSuppliers);
    };
    fetchSuppliersData();
  }, []);
  
  const apiMap = useMemo(() => ({
    components: { get: getComponents, add: addComponent, update: updateComponent, delete: deleteComponent, categoryName: 'Component' },
    rawMaterials: { get: getRawMaterials, add: addRawMaterial, update: updateRawMaterial, delete: deleteRawMaterial, categoryName: 'Raw Material' },
    workshopSupplies: { get: getWorkshopSupplies, add: addWorkshopSupply, update: updateWorkshopSupply, delete: deleteWorkshopSupply, categoryName: 'Workshop Supply' },
  }), []);

  const manager = useInventoryManager(apiMap[category], suppliers);

  const categoryInfo = {
    components: { desc: 'Discrete parts that go into the final product (e.g., bolts, screws, brackets).', placeholder: 'e.g., 8mm Bolt' },
    rawMaterials: { desc: 'Bulk materials transformed into the product (e.g., resin, paint).', placeholder: 'e.g., Polyester Resin' },
    workshopSupplies: { desc: 'Items used during production but not part of the product (e.g., sandpaper).', placeholder: 'e.g., Sanding Disc' },
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
         <h3 className="text-xl font-bold text-white">Manage Inventory Items</h3>
         <select value={category} onChange={e => setCategory(e.target.value)} className="p-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
            <option value="components">Components</option>
            <option value="rawMaterials">Raw Materials</option>
            <option value="workshopSupplies">Workshop Supplies</option>
         </select>
      </div>
      <p className="text-sm text-gray-400 mb-6">{categoryInfo[category].desc}</p>
      
      <form onSubmit={manager.handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
        <div className="lg:col-span-2"><Input label="Item Name" name="name" value={manager.newItem.name} onChange={manager.handleInputChange} placeholder={categoryInfo[category].placeholder} /></div>
        <div className="lg:col-span-2"><Dropdown label="Supplier" name="supplierId" value={manager.newItem.supplierId} onChange={manager.handleInputChange} options={suppliers} placeholder="Select..." /></div>
        <Input label="Item Code" name="itemCode" value={manager.newItem.itemCode} onChange={manager.handleInputChange} placeholder="Optional" />
        <Input label="Price" name="price" type="number" value={manager.newItem.price} onChange={manager.handleInputChange} placeholder="e.g., 12.50" />
        <Input label="Unit" name="unit" value={manager.newItem.unit} onChange={manager.handleInputChange} placeholder="e.g., each, kg" />
        <div className="grid grid-cols-3 gap-2">
            <Input label="In Stock" name="currentStock" type="number" value={manager.newItem.currentStock} onChange={manager.handleInputChange} placeholder="50" />
            <Input label="Reorder" name="reorderLevel" type="number" value={manager.newItem.reorderLevel} onChange={manager.handleInputChange} placeholder="20" />
            <Input label="Standard" name="standardStockLevel" type="number" value={manager.newItem.standardStockLevel} onChange={manager.handleInputChange} placeholder="200" />
        </div>
        <div className="flex space-x-2 lg:col-start-4">
          <Button type="submit" variant="primary" className="w-full">{manager.editingItemId ? 'Update' : 'Add'}</Button>
          {manager.editingItemId && <Button type="button" variant="secondary" onClick={manager.cancelEdit}>Cancel</Button>}
        </div>
      </form>

      <div className="flex flex-wrap gap-4 items-center mb-4 p-4 bg-gray-900/50 rounded-lg">
        <div className="relative flex-grow">
          {/* --- UPDATED LINE BELOW --- */}
          <Input name="search-inventory" placeholder="Search by name..." value={manager.searchTerm} onChange={e => manager.setSearchTerm(e.target.value)} />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <div>
          {/* --- UPDATED LINE BELOW --- */}
          <select name="sort-inventory" value={manager.sortBy} onChange={e => manager.setSortBy(e.target.value)} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
            <option value="name-asc">Sort by Name (A-Z)</option>
            <option value="name-desc">Sort by Name (Z-A)</option>
            <option value="supplier">Sort by Supplier</option>
            <option value="stock-low-high">Sort by Stock Level</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 text-white">
          <input type="checkbox" id="lowStockToggle" checked={manager.showLowStock} onChange={e => manager.setShowLowStock(e.target.checked)} className="h-5 w-5 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="lowStockToggle" className="text-sm font-medium">Show only low stock</label>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-6 gap-4 px-3 py-2 text-sm font-semibold text-gray-400 border-b border-gray-700">
        <div className="col-span-2">Name</div>
        <div>Supplier</div>
        <div className="col-span-2">Stock Level</div>
        <div>Actions</div>
      </div>
      <div className="space-y-3 mt-2">
        {manager.loading ? <p className="text-center p-4">Loading...</p> : (manager.displayedItems || []).map(item => (
          <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center bg-gray-700 p-3 rounded-lg">
            <p className="font-semibold col-span-2">{item.name}</p>
            <p>{manager.getSupplierName(item.supplierId)}</p>
            <div className="col-span-2"><StockLevelIndicator {...item} /></div>
            <div className="flex items-center justify-end gap-2">
              <Button onClick={() => manager.handleEdit(item)} variant="secondary" className="py-1 px-3 text-xs">Edit</Button>
              <Button onClick={() => manager.handleDelete(item.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
            </div>
          </div>
        ))}
         {(manager.displayedItems || []).length === 0 && !manager.loading && <p className="text-center p-4 text-gray-500">No items found.</p>}
      </div>
    </div>
  );
};

export default InventoryManager;