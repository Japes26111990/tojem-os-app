// src/components/features/settings/InventoryManager.jsx (UNIFIED)
// This single component now manages all inventory categories (Products, Components, etc.)
// It replaces the four separate manager components.

import React, { useState, useEffect, useMemo } from 'react';
import {
    getAllInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getSuppliers,
    getSkills,
    getProductCategories,
} from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Search, Package, Factory, Wrench, Beaker, Save, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Reusable component for the category tabs
const CategoryTab = ({ label, icon, isActive, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
        {icon}
        {label}
    </button>
);

const InventoryManager = () => {
    const [allItems, setAllItems] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [skills, setSkills] = useState([]);
    const [productCategories, setProductCategories] = useState([]); // For the 'Product' form
    const [loading, setLoading] = useState(true);
    
    const [activeCategory, setActiveCategory] = useState('Product');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItemId, setEditingItemId] = useState(null);

    const initialFormState = {
        name: '', partNumber: '', sellingPrice: '', categoryId: '', currentStock: '', reorderLevel: '', standardStockLevel: '', unit: '', price: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [items, supps, skls, prodCats] = await Promise.all([
                getAllInventoryItems(),
                getSuppliers(),
                getSkills(),
                getProductCategories()
            ]);
            setAllItems(items);
            setSuppliers(supps);
            setSkills(skls);
            setProductCategories(prodCats);
        } catch (error) {
            console.error("Error fetching inventory data:", error);
            toast.error("Failed to load inventory data.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCategoryChange = (category) => {
        setActiveCategory(category);
        setSearchTerm('');
        setEditingItemId(null);
        setFormData(initialFormState);
    };

    const handleEdit = (item) => {
        setEditingItemId(item.id);
        setFormData({ ...initialFormState, ...item });
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
        setFormData(initialFormState);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return toast.error("Item name is required.");

        const dataToSave = {
            ...formData,
            category: activeCategory, // Set the category based on the active tab
            price: parseFloat(formData.price) || 0,
            sellingPrice: parseFloat(formData.sellingPrice) || 0,
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
            handleCancelEdit();
            fetchData();
        } catch (error) {
            console.error(`Error saving ${activeCategory}:`, error);
            toast.error(`Failed to save ${activeCategory}. ${error.message}`);
        }
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
                            handleCancelEdit();
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

    const displayedItems = useMemo(() => {
        return allItems.filter(item => {
            const categoryMatch = item.category === activeCategory;
            const searchMatch = !searchTerm || 
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.partNumber && item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()));
            return categoryMatch && searchMatch;
        });
    }, [allItems, activeCategory, searchTerm]);

    const renderFormFields = () => {
        // Common fields for all categories
        const commonFields = (
            <>
                <Input label="Item Name" name="name" value={formData.name} onChange={handleInputChange} required />
                <Input label="Item Code / Part Number" name="partNumber" value={formData.partNumber} onChange={handleInputChange} />
                <Input label="Default Cost Price (R)" name="price" type="number" value={formData.price} onChange={handleInputChange} />
                <Input label="Unit of Measure" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="e.g., each, kg, box"/>
                <Input label="Current Stock" name="currentStock" type="number" value={formData.currentStock} onChange={handleInputChange} />
                <Input label="Re-order Level" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} />
                <Input label="Standard Stock Level" name="standardStockLevel" type="number" value={formData.standardStockLevel} onChange={handleInputChange} />
            </>
        );

        if (activeCategory === 'Product') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {commonFields}
                    <Dropdown label="Product Category" name="categoryId" value={formData.categoryId} onChange={handleInputChange} options={productCategories} placeholder="Select category..." />
                    <Input label="Selling Price (R)" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} />
                </div>
            );
        }
        
        // Form for Component, Raw Material, Workshop Supply
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {commonFields}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-900/50 rounded-lg">
                <CategoryTab label="Products" icon={<Factory size={16}/>} isActive={activeCategory === 'Product'} onClick={() => handleCategoryChange('Product')} />
                <CategoryTab label="Components" icon={<Wrench size={16}/>} isActive={activeCategory === 'Component'} onClick={() => handleCategoryChange('Component')} />
                <CategoryTab label="Raw Materials" icon={<Beaker size={16}/>} isActive={activeCategory === 'Raw Material'} onClick={() => handleCategoryChange('Raw Material')} />
                <CategoryTab label="Workshop Supplies" icon={<Package size={16}/>} isActive={activeCategory === 'Workshop Supply'} onClick={() => handleCategoryChange('Workshop Supply')} />
            </div>

            <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-bold text-white">{editingItemId ? `Editing ${activeCategory}` : `Add New ${activeCategory}`}</h3>
                {renderFormFields()}
                <div className="flex justify-end gap-2">
                    {editingItemId && <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>}
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
