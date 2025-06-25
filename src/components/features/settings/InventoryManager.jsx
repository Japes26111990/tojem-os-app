// FILE: src/components/features/settings/InventoryManager.jsx

import React, { useState, useEffect, useMemo } from 'react';
// MODIFIED IMPORT: Removed specific update functions as they are handled by generic updateDocument via useInventoryManager's api prop
import { getComponents, addComponent, deleteComponent, getRawMaterials, addRawMaterial, deleteRawMaterial, getWorkshopSupplies, addWorkshopSupply, deleteWorkshopSupply, getSuppliers, getSkills, updateDocument } from '../../../api/firestore';
import { useInventoryManager } from '../../../hooks/useInventoryManager';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Search, Scale, Hash, Save, PlusCircle, Factory } from 'lucide-react'; // Import new icons

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
  const [allSkills, setAllSkills] = useState([]);
  const [category, setCategory] = useState('components');

  const getProficiencyLabel = (level) => {
      switch (level) {
          case 0: return 'Not Applicable / No Minimum';
          case 1: return 'Beginner (1)';
          case 2: return 'Basic (2)';
          case 3: return 'Intermediate (3)';
          case 4: return 'Advanced (4)';
          case 5: return 'Expert (5)';
          default: return 'N/A';
      }
  };

  useEffect(() => {
    const fetchData = async () => {
      const [fetchedSuppliers, fetchedSkills] = await Promise.all([getSuppliers(), getSkills()]);
      setSuppliers(fetchedSuppliers);
      setAllSkills(fetchedSkills);
    };
    fetchData();
  }, []);

  const apiMap = useMemo(() => ({
    components: { get: getComponents, add: addComponent, update: (id, data) => updateDocument('components', id, data), delete: deleteComponent, categoryName: 'Component' },
    rawMaterials: { get: getRawMaterials, add: addRawMaterial, update: (id, data) => updateDocument('rawMaterials', id, data), delete: deleteRawMaterial, categoryName: 'Raw Material' },
    workshopSupplies: { get: getWorkshopSupplies, add: addWorkshopSupply, update: (id, data) => updateDocument('workshopSupplies', id, data), delete: deleteWorkshopSupply, categoryName: 'Workshop Supply' },
  }), []);

  const manager = useInventoryManager(apiMap[category], suppliers, allSkills); // Pass allSkills

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
      
      <form onSubmit={manager.handleSubmit} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end p-4 bg-gray-900/50 rounded-lg">
            <div className="lg:col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-1">Stock Take Method</label>
                <select name="stockTakeMethod" value={manager.newItem.stockTakeMethod || 'quantity'} onChange={manager.handleInputChange} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white">
                    <option value="quantity">By Quantity</option>
                    <option value="weight">By Weight</option>
                </select>
            </div>
            
            {manager.newItem.stockTakeMethod === 'weight' && (
                <>
                    <Input label="Weight per Unit (g)" name="unitWeight" type="number" step="0.01" value={manager.newItem.unitWeight} onChange={manager.handleInputChange} placeholder="e.g., 2.5" />
                    <Input label="Container Tare Weight (g)" name="tareWeight" type="number" step="0.1" value={manager.newItem.tareWeight} onChange={manager.handleInputChange} placeholder="e.g., 36" />
                </>
            )}

            {category === 'rawMaterials' && (
                <div className="flex items-center justify-center h-full pt-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <input type="checkbox" name="requiresCatalyst" checked={manager.newItem.requiresCatalyst || false} onChange={manager.handleInputChange} className="h-5 w-5 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                        Requires Catalyst
                    </label>
                </div>
            )}
        </div>

        {/* NEW: Associated Skills Section for Inventory */}
        {manager.newItem.name.trim() && (
            <div className="border-t border-gray-700 pt-4 mt-4">
                <h4 className="text-lg font-semibold text-white mb-3">Associated Skills for "{manager.newItem.name}"</h4>
                <p className="text-sm text-gray-400 mb-4">
                    Define skills typically required to work with or process this material/component.
                </p>
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {allSkills.map(skill => {
                        const currentAssociatedSkill = manager.newItem.associatedSkills?.find(s => s.skillId === skill.id);
                        const isIncluded = !!currentAssociatedSkill;

                        return (
                            <div key={skill.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-3 mb-2">
                                    <input
                                        type="checkbox"
                                        checked={isIncluded}
                                        onChange={(e) => manager.handleToggleSkillAssociation(skill.id, e.target.checked)} // New handler
                                        className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label className="font-bold text-white flex-grow">{skill.name}</label>
                                </div>

                                {isIncluded && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Default Min. Proficiency (0-5)</label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5"
                                                step="1"
                                                value={currentAssociatedSkill.defaultMinimumProficiency || 0}
                                                onChange={(e) => manager.handleAssociatedSkillChange(skill.id, 'defaultMinimumProficiency', e.target.value)}
                                                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg accent-blue-600"
                                            />
                                            <p className="text-center text-sm text-gray-400 mt-1">
                                                {getProficiencyLabel(currentAssociatedSkill.defaultMinimumProficiency || 0)}
                                            </p>
                                        </div>
                                        <div>
                                            <Input
                                                label="Importance Weight (0-10)"
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={currentAssociatedSkill.importanceWeight || 0}
                                                onChange={(e) => manager.handleAssociatedSkillChange(skill.id, 'importanceWeight', e.target.value)}
                                                placeholder="e.g., 5"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Higher value = more critical skill for this item.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
        {/* END NEW: Associated Skills Section */}

        <div className="flex justify-end gap-2">
          {manager.editingItemId && <Button type="button" variant="secondary" onClick={manager.cancelEdit}>Cancel</Button>}
          <Button type="submit" variant="primary">{manager.editingItemId ? <><Save size={16} className="mr-2"/> Update Item</> : <><PlusCircle size={16} className="mr-2"/> Add Item</>}</Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-4 items-center mb-4 p-4 bg-gray-900/50 rounded-lg">
        <div className="relative flex-grow">
          <Input name="search-inventory" placeholder="Search by name..." value={manager.searchTerm} onChange={e => manager.setSearchTerm(e.target.value)} />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <div>
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
            <p className="font-semibold col-span-2 flex items-center gap-2">
                {item.stockTakeMethod === 'weight' ? <Scale size={14} className="text-gray-400" title="Counted by Weight"/> : <Hash size={14} className="text-gray-400" title="Counted by Quantity"/>}
                {item.name}
                {item.requiresCatalyst && <span className="text-xs bg-blue-500/50 text-blue-300 px-2 py-0.5 rounded-full" title="Requires Catalyst">C</span>}
                {item.associatedSkills?.length > 0 && <Factory size={14} className="text-gray-400" title="Associated Skill(s)"/>}
            </p>
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