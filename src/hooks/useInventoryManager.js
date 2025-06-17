import { useState, useEffect, useMemo } from 'react';
import { addToPurchaseQueue } from '../api/firestore'; // The import was missing here

export const useInventoryManager = (api, suppliers) => {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', itemCode: '', price: '', unit: '', supplierId: '', currentStock: '', reorderLevel: '', standardStockLevel: '' });
  const [editingItemId, setEditingItemId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showLowStock, setShowLowStock] = useState(false);

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
  }, [api]);

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
    const { name, value } = e.target;
    setNewItem(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.supplierId) return alert("Item name and supplier are required.");
    
    const dataToSave = {
      name: newItem.name,
      itemCode: newItem.itemCode || '',
      supplierId: newItem.supplierId,
      price: parseFloat(newItem.price) || 0,
      unit: newItem.unit || '',
      currentStock: parseInt(newItem.currentStock, 10) || 0,
      reorderLevel: parseInt(newItem.reorderLevel, 10) || 0,
      standardStockLevel: parseInt(newItem.standardStockLevel, 10) || 0,
    };

    try {
      let docId = editingItemId;
      if (editingItemId) {
        await api.update(editingItemId, dataToSave);
      } else {
        const newDoc = await api.add(dataToSave);
        docId = newDoc.id;
      }
      
      if (dataToSave.reorderLevel > 0 && dataToSave.currentStock < dataToSave.reorderLevel) {
        await addToPurchaseQueue({
          itemId: docId,
          itemName: dataToSave.name,
          supplierId: dataToSave.supplierId,
          itemCode: dataToSave.itemCode,
          category: api.categoryName
        });
        alert(`'${dataToSave.name}' is low on stock and has been automatically added to the reorder list!`);
      }
      cancelEdit();
      fetchData();
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Failed to save item.");
    }
  };

  const handleEdit = (item) => { setEditingItemId(item.id); setNewItem(item); };
  const cancelEdit = () => { setEditingItemId(null); setNewItem({ name: '', itemCode: '', price: '', unit: '', supplierId: '', currentStock: '', reorderLevel: '', standardStockLevel: '' }); };
  const handleDelete = async (id) => { if (window.confirm("Are you sure?")) { await api.delete(id); fetchData(); } };

  return {
    newItem, loading, editingItemId, displayedItems, sortBy, searchTerm, showLowStock,
    handleInputChange, handleSubmit, handleEdit, cancelEdit, handleDelete,
    setSortBy, setSearchTerm, setShowLowStock, getSupplierName
  };
};