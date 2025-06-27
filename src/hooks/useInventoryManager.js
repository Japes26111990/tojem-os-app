// src/hooks/useInventoryManager.js (Updated for Dynamic Supplier Pricing)

import { useState, useEffect, useMemo } from 'react';
import { 
    getSupplierPricingForItem, 
    addSupplierPrice, 
    deleteSupplierPrice, 
    updateSupplierPrice 
} from '../api/firestore';

export const useInventoryManager = (api, suppliers, allSkills) => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '', itemCode: '', price: '', unit: '',
    currentStock: '', reorderLevel: '', standardStockLevel: '',
    requiresCatalyst: false, stockTakeMethod: 'quantity', unitWeight: '', tareWeight: '',
    associatedSkills: [],
  });
  const [editingItemId, setEditingItemId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showLowStock, setShowLowStock] = useState(false);

  // --- NEW STATE for managing supplier prices ---
  const [supplierPrices, setSupplierPrices] = useState([]);

  const fetchData = async () => {
    if (!api) return;
    setLoading(true);
    const fetchedItems = await api.get();
    setItems(fetchedItems);
    setLoading(false);
  };

  useEffect(() => {
    if (api && api.get) {
      fetchData();
    }
    cancelEdit();
  }, [api]);

  // --- NEW EFFECT: Fetch supplier prices when an item is being edited ---
  useEffect(() => {
      if (editingItemId) {
          const fetchPrices = async () => {
              const prices = await getSupplierPricingForItem(editingItemId);
              setSupplierPrices(prices);
          };
          fetchPrices();
      } else {
          setSupplierPrices([]);
      }
  }, [editingItemId]);

  const getSupplierName = (supplierId) => (suppliers || []).find(s => s.id === supplierId)?.name || 'N/A';

  const displayedItems = useMemo(() => {
    let filtered = [...(items || [])];
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
        case 'stock-low-high': return (Number(a.currentStock) / Number(a.reorderLevel)) - (Number(b.currentStock) / Number(b.reorderLevel));
        case 'stock-high-low': return (Number(b.currentStock) / Number(a.reorderLevel)) - (Number(a.currentStock) / Number(b.reorderLevel));
        default: return 0;
      }
    });
    return filtered;
  }, [items, searchTerm, sortBy, showLowStock, suppliers]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setNewItem(prevState => ({ ...prevState, [name]: val }));
  };

  const handleToggleSkillAssociation = (skillId, isChecked) => {
    setNewItem(prevItem => {
        if (isChecked) {
            return { ...prevItem, associatedSkills: [...(prevItem.associatedSkills || []), { skillId, defaultMinimumProficiency: 0, importanceWeight: 0 }] };
        } else {
            return { ...prevItem, associatedSkills: prevItem.associatedSkills.filter(s => s.skillId !== skillId) };
        }
    });
  };

  const handleAssociatedSkillChange = (skillId, field, value) => {
    setNewItem(prevItem => ({
        ...prevItem,
        associatedSkills: prevItem.associatedSkills.map(s =>
            s.skillId === skillId ? { ...s, [field]: Number(value) } : s
        )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return alert("Item name is required.");

    const filteredAssociatedSkills = (newItem.associatedSkills || []).filter(s =>
        s.defaultMinimumProficiency > 0 || s.importanceWeight > 0
    );

    const dataToSave = {
      name: newItem.name,
      itemCode: newItem.itemCode || '',
      price: parseFloat(newItem.price) || 0,
      unit: newItem.unit || '',
      currentStock: parseInt(newItem.currentStock, 10) || 0,
      reorderLevel: parseInt(newItem.reorderLevel, 10) || 0,
      standardStockLevel: parseInt(newItem.standardStockLevel, 10) || 0,
      requiresCatalyst: newItem.requiresCatalyst || false,
      stockTakeMethod: newItem.stockTakeMethod || 'quantity',
      unitWeight: parseFloat(newItem.unitWeight) || 0,
      tareWeight: parseFloat(newItem.tareWeight) || 0,
      associatedSkills: filteredAssociatedSkills,
    };
    try {
      if (editingItemId) {
        await api.update(editingItemId, dataToSave);
      } else {
        await api.add(dataToSave);
      }
      cancelEdit();
      fetchData();
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Failed to save item.");
    }
  };

  const handleEdit = (item) => {
    setEditingItemId(item.id);
    setNewItem({ ...item, associatedSkills: item.associatedSkills || [] });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setNewItem({
      name: '', itemCode: '', price: '', unit: '',
      currentStock: '', reorderLevel: '', standardStockLevel: '',
      requiresCatalyst: false, stockTakeMethod: 'quantity', unitWeight: '', tareWeight: '',
      associatedSkills: [],
    });
    setSupplierPrices([]); // Clear prices on cancel
  };

  const handleDelete = async (id) => { 
      if (window.confirm("Are you sure? This will delete the item and all its supplier pricing links.")) { 
          await api.delete(id); 
          fetchData(); 
      } 
  };
  
  // --- NEW HANDLERS FOR SUPPLIER PRICING ---
  const handleAddSupplierPrice = async (supplierId, price) => {
      if (!editingItemId || !supplierId || !price) {
          alert("Please select a supplier and enter a price.");
          return;
      }
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) return;

      const priceData = {
          itemId: editingItemId,
          itemName: newItem.name,
          supplierId: supplier.id,
          supplierName: supplier.name,
          price: parseFloat(price)
      };
      await addSupplierPrice(priceData);
      const prices = await getSupplierPricingForItem(editingItemId);
      setSupplierPrices(prices);
  };

  const handleDeleteSupplierPrice = async (priceId) => {
      if (window.confirm("Delete this supplier price link?")) {
          await deleteSupplierPrice(priceId);
          setSupplierPrices(prev => prev.filter(p => p.id !== priceId));
      }
  };

  return {
    newItem, loading, editingItemId, displayedItems, sortBy, searchTerm, showLowStock,
    supplierPrices, // <-- Expose new state
    handleInputChange, handleSubmit, handleEdit, cancelEdit, handleDelete,
    handleToggleSkillAssociation, handleAssociatedSkillChange,
    handleAddSupplierPrice, handleDeleteSupplierPrice, // <-- Expose new handlers
    setSortBy, setSearchTerm, setShowLowStock, getSupplierName
  };
};
