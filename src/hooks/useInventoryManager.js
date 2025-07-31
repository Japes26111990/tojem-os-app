// src/hooks/useInventoryManager.js (Upgraded with Toasts & Location Fields)

import React, { useState, useEffect, useMemo } from 'react';
import { 
    getSupplierPricingForItem, 
    addSupplierPrice, 
    deleteSupplierPrice
} from '../api/firestore';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

export const useInventoryManager = (api, suppliers, allSkills) => {
  const initialNewItemState = {
    name: '', itemCode: '', price: '', unit: '',
    currentStock: '', reorderLevel: '', standardStockLevel: '',
    requiresCatalyst: false, stockTakeMethod: 'quantity', unitWeight: '', tareWeight: '',
    associatedSkills: [],
    // NEW: Location fields added to initial state
    location: '',
    shelf_number: '',
    bin_number: '',
  };

  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState(initialNewItemState);
  const [editingItemId, setEditingItemId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showLowStock, setShowLowStock] = useState(false);
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
    if (!newItem.name.trim()) return toast.error("Item name is required.");

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
      location: newItem.location || '',
      shelf_number: newItem.shelf_number || '',
      bin_number: newItem.bin_number || '',
    };
    try {
      if (editingItemId) {
        await api.update(editingItemId, dataToSave);
        toast.success("Item updated successfully!");
      } else {
        await api.add(dataToSave);
        toast.success("Item added successfully!");
      }
      cancelEdit();
      fetchData();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Failed to save item.");
    }
  };

  const handleEdit = (item) => {
    setEditingItemId(item.id);
    setNewItem({ ...initialNewItemState, ...item, associatedSkills: item.associatedSkills || [] });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setNewItem(initialNewItemState);
    setSupplierPrices([]);
  };

  const handleDelete = (id) => { 
      toast((t) => (
          <span>
              Delete this item and all its pricing?
              <Button
                  variant="danger" size="sm" className="ml-2"
                  onClick={() => {
                      api.delete(id)
                          .then(() => {
                              toast.success("Item deleted.");
                              fetchData();
                          })
                          .catch(err => {
                              toast.error("Failed to delete item.");
                              console.error(err);
                          });
                      toast.dismiss(t.id);
                  }}
              >
                  Delete
              </Button>
              <Button
                  variant="secondary" size="sm" className="ml-2"
                  onClick={() => toast.dismiss(t.id)}
              >
                  Cancel
              </Button>
          </span>
      ), { icon: 'âš ï¸ ' });
  };
  
  const handleAddSupplierPrice = async (supplierId, price) => {
      if (!editingItemId || !supplierId || !price) {
          toast.error("Please select a supplier and enter a price.");
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
      toast.success("Supplier price added.");
  };

  const handleDeleteSupplierPrice = (priceId) => {
      toast((t) => (
          <span>
              Delete this supplier price link?
              <Button
                  variant="danger" size="sm" className="ml-2"
                  onClick={() => {
                      deleteSupplierPrice(priceId)
                          .then(() => {
                              toast.success("Price link deleted.");
                              setSupplierPrices(prev => prev.filter(p => p.id !== priceId));
                          })
                          .catch(err => {
                              toast.error("Failed to delete price link.");
                              console.error(err);
                          });
                      toast.dismiss(t.id);
                  }}
              >
                  Delete
              </Button>
              <Button
                  variant="secondary" size="sm" className="ml-2"
                  onClick={() => toast.dismiss(t.id)}
              >
                  Cancel
              </Button>
          </span>
      ), { icon: 'âš ï¸ ' });
  };

  return {
    newItem, loading, editingItemId, displayedItems, sortBy, searchTerm, showLowStock,
    supplierPrices,
    handleInputChange, handleSubmit, handleEdit, cancelEdit, handleDelete,
    handleToggleSkillAssociation, handleAssociatedSkillChange,
    handleAddSupplierPrice, handleDeleteSupplierPrice,
    setSortBy, setSearchTerm, setShowLowStock, getSupplierName
  };
};