// src/components/features/settings/InventoryManager.jsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    getAllInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getSuppliers,
    getSupplierPricingForItem,
    addSupplierPrice,
    deleteSupplierPrice
} from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Search, Package, Wrench, Beaker, Save, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CategoryTab = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
        {icon}
        {label}
    </button>
);

const SupplierPriceManager = ({ suppliers, supplierPrices, onAdd, onDelete }) => {
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [price, setPrice] = useState('');

    const handleAdd = () => {
        if (!selectedSupplier || !price) {
            toast.error("Please select a supplier and enter a price.");
            return;
        }
        onAdd(selectedSupplier, price);
        setSelectedSupplier('');
        setPrice('');
    };

    return (
        <div className="space-y-4 pt-4 mt-4 border-t border-gray-700">
            <h4 className="text-lg font-semibold text-white">Supplier Pricing</h4>
            <p className="text-xs text-gray-400">Link suppliers to this item and set their specific price. The "Default Cost Price" above will be used if no supplier price is found.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Dropdown
                    label="Supplier"
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    options={suppliers}
                    placeholder="Select a supplier..."
                />
                <Input
                    label="Price (R)"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g., 125.50"
                />
                <Button onClick={handleAdd} variant="secondary">Add Price Link</Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {supplierPrices.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-gray-900/50 p-2 rounded-md">
                        <p className="text-gray-300">{p.supplierName}</p>
                        <div className="flex items-center gap-4">
                            <p className="font-mono text-green-400">R {p.price.toFixed(2)}</p>
                            <Button onClick={() => onDelete(p.id)} variant="danger" size="sm" className="p-1 h-7 w-7"><Trash2 size={14}/></Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const InventoryManager = () => {
    const [allItems, setAllItems] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Component');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItemId, setEditingItemId] = useState(null);
    const [supplierPrices, setSupplierPrices] = useState([]);
    
    const initialFormState = {
        name: '', itemCode: '', price: '', unit: '',
        currentStock: '', reorderLevel: '', standardStockLevel: '',
    };
    const [formData, setFormData] = useState(initialFormState);
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const [items, supps] = await Promise.all([
                getAllInventoryItems(),
                getSuppliers(),
            ]);
            setAllItems(items.filter(item => item.category !== 'Product'));
            setSuppliers(supps);
        } catch (error) {
            console.error("Error fetching inventory data:", error);
            toast.error("Failed to load inventory data.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

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

    const displayedItems = useMemo(() => {
        return allItems.filter(item => {
            const categoryMatch = item.category === activeCategory;
            const searchMatch = !searchTerm || 
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.itemCode && item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()));
            return categoryMatch && searchMatch;
        });
    }, [allItems, activeCategory, searchTerm]);

    const handleCategoryChange = (category) => {
        setActiveCategory(category);
        setSearchTerm('');
        cancelEdit();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const cancelEdit = () => {
        setEditingItemId(null);
        setFormData(initialFormState);
        setSupplierPrices([]);
    };

    const handleEdit = (item) => {
        setEditingItemId(item.id);
        setFormData({ ...initialFormState, ...item });
    };

    const handleDelete = (itemId) => {
        toast((t) => (
            <span>
                Delete this item permanently?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteInventoryItem(itemId)
                        .then(() => {
                            toast.success("Item deleted.");
                            fetchData();
                            cancelEdit();
                        })
                        .catch(err => toast.error("Failed to delete item."));
                    toast.dismiss(t.id);
                }}>
                    Delete
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: '⚠️' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return toast.error("Item name is required.");

        const dataToSave = {
            ...formData,
            category: activeCategory,
            price: parseFloat(formData.price) || 0,
            currentStock: Number(formData.currentStock) || 0,
            reorderLevel: Number(formData.reorderLevel) || 0,
            standardStockLevel: Number(formData.standardStockLevel) || 0,
        };

        try {
            if (editingItemId) {
                await updateInventoryItem(editingItemId, dataToSave);
                toast.success(`${activeCategory} updated successfully!`);
            } else {
                await addInventoryItem(dataToSave);
                toast.success(`${activeCategory} added successfully!`);
            }
            cancelEdit();
            fetchData();
        } catch (error) {
            toast.error(`Failed to save ${activeCategory}. ${error.message}`);
        }
    };

    const handleAddSupplierPrice = async (supplierId, price) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return;

        const priceData = {
            itemId: editingItemId,
            itemName: formData.name,
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
                Delete this price link?
                <Button
                    variant="danger" size="sm" className="ml-2"
                    onClick={() => {
                        deleteSupplierPrice(priceId)
                            .then(() => {
                                toast.success("Price link deleted.");
                                setSupplierPrices(prev => prev.filter(p => p.id !== priceId));
                            })
                            .catch(err => toast.error("Failed to delete price link."));
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
        ), { icon: '⚠️' });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900/50 rounded-lg">
                <CategoryTab label="Components" icon={<Wrench size={16}/>} isActive={activeCategory === 'Component'} onClick={() => handleCategoryChange('Component')} />
                <CategoryTab label="Raw Materials" icon={<Beaker size={16}/>} isActive={activeCategory === 'Raw Material'} onClick={() => handleCategoryChange('Raw Material')} />
                <CategoryTab label="Workshop Supplies" icon={<Package size={16}/>} isActive={activeCategory === 'Workshop Supply'} onClick={() => handleCategoryChange('Workshop Supply')} />
            </div>

            <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-bold text-white">{editingItemId ? `Editing ${activeCategory}` : `Add New ${activeCategory}`}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Item Name" name="name" value={formData.name} onChange={handleInputChange} required />
                    <Input label="Item Code / Part Number" name="partNumber" value={formData.partNumber} onChange={handleInputChange} />
                    <Input label="Default Cost Price (R)" name="price" type="number" value={formData.price} onChange={handleInputChange} />
                    <Input label="Unit of Measure" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="e.g., each, kg, box"/>
                    <Input label="Current Stock" name="currentStock" type="number" value={formData.currentStock} onChange={handleInputChange} />
                    <Input label="Re-order Level" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} />
                </div>
                
                {editingItemId && (
                    <SupplierPriceManager 
                        suppliers={suppliers}
                        supplierPrices={supplierPrices}
                        onAdd={handleAddSupplierPrice}
                        onDelete={handleDeleteSupplierPrice}
                    />
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                    {editingItemId && <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button>}
                    <Button type="submit" variant="primary">{editingItemId ? <><Save size={16} className="mr-2"/> Update Item</> : <><PlusCircle size={16} className="mr-2"/> Add Item</>}</Button>
                </div>
            </form>

            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Existing {activeCategory}s</h3>
                    <div className="relative w-full sm:w-1/3">
                        <Input type="text" placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                            <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">Part Number</th>
                                <th className="p-2">In Stock</th>
                                <th className="p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="text-center p-4">Loading...</td></tr>
                            ) : displayedItems.map(item => (
                                <tr key={item.id} className="border-b border-gray-700">
                                    <td className="p-2 text-white font-medium">{item.name}</td>
                                    <td className="p-2">{item.partNumber || 'N/A'}</td>
                                    <td className="p-2">{item.currentStock}</td>
                                    <td className="p-2 flex gap-2">
                                        <Button onClick={() => handleEdit(item)} size="sm">Edit</Button>
                                        <Button onClick={() => handleDelete(item.id)} variant="danger" size="sm">Delete</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryManager;
