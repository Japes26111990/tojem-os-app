// src/components/features/settings/UnifiedProductManager.jsx (Upgraded with Toasts & Stock Fields)

import React, { useState, useEffect, useMemo } from 'react';
import {
    getProducts, addProduct, updateProduct, deleteProduct,
    getProductCategories, addProductCategory,
    getJobStepDetails, getDepartments
} from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import { Trash2, Save, Package, Settings2, Search, ChevronDown, ChevronRight, PackagePlus, FolderPlus, Hash, Scale } from 'lucide-react';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const UnifiedProductManager = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});
    
    // State for new product form (includes new stock fields)
    const [newProduct, setNewProduct] = useState({ 
        name: '', 
        partNumber: '', 
        sellingPrice: '', 
        categoryId: '', 
        weight: '',
        currentStock: '', // New
        reorderLevel: '', // New
        standardStockLevel: '', // New
        countMethod: 'Quantity', // New
        unitWeight: '', // New
        tareWeight: '', // New
        unit: 'Each', // New default unit
    });

    // State for editing existing product (includes new stock fields)
    const [editProductData, setEditProductData] = useState(null);
    
    const [newCategoryName, setNewCategoryName] = useState('');
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const [prods, cats] = await Promise.all([
                getProducts(), getProductCategories()
            ]);
            setProducts(prods); 
            setCategories(cats); 
        } catch (error) { 
            console.error("Failed to fetch initial data:", error); 
            toast.error("Failed to load product data.");
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            // Ensure all stock fields are present when editing, even if undefined in DB
            setEditProductData({
                ...product,
                currentStock: product.currentStock || '',
                reorderLevel: product.reorderLevel || '',
                standardStockLevel: product.standardStockLevel || '',
                countMethod: product.countMethod || 'Quantity',
                unitWeight: product.unitWeight || '',
                tareWeight: product.tareWeight || '',
                unit: product.unit || 'Each',
            });
        } else {
            setEditProductData(null);
        }
    }, [selectedProductId, products]);

    const productsByCategory = useMemo(() => {
        const filtered = searchTerm 
            ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.partNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
            : products;
        const categorized = categories.reduce((acc, category) => {
            acc[category.id] = filtered.filter(p => p.categoryId === category.id);
            return acc;
        }, {});
        categorized['uncategorized'] = filtered.filter(p => !p.categoryId);
        return categorized;
    }, [products, categories, searchTerm]);

    const handleAddNewCategory = async () => {
        if (!newCategoryName.trim()) return;
        await addProductCategory(newCategoryName);
        toast.success("Category added.");
        setNewCategoryName('');
        fetchData();
    };
    
    const handleAddNewProduct = async (e) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.partNumber || !newProduct.categoryId) {
            return toast.error('Category, Product Name, and Part Number are required.');
        }
        try {
            const productData = { 
                ...newProduct, 
                sellingPrice: Number(newProduct.sellingPrice) || 0,
                weight: Number(newProduct.weight) || 0,
                currentStock: Number(newProduct.currentStock) || 0,
                reorderLevel: Number(newProduct.reorderLevel) || 0,
                standardStockLevel: Number(newProduct.standardStockLevel) || 0,
                unitWeight: Number(newProduct.unitWeight) || 0,
                tareWeight: Number(newProduct.tareWeight) || 0,
            };
            await addProduct(productData);
            toast.success("Product added successfully.");
            setNewProduct({ 
                name: '', partNumber: '', sellingPrice: '', categoryId: '', weight: '',
                currentStock: '', reorderLevel: '', standardStockLevel: '',
                countMethod: 'Quantity', unitWeight: '', tareWeight: '', unit: 'Each',
            });
            fetchData();
        } catch (error) { 
            toast.error(error.message); 
            console.error("Error adding product:", error);
        }
    };

    const handleUpdateProduct = async () => {
        if (!editProductData.name || !editProductData.partNumber) return toast.error('Product Name and Part Number are required.');
        try {
            await updateProduct(selectedProductId, {
                name: editProductData.name, 
                partNumber: editProductData.partNumber,
                sellingPrice: Number(editProductData.sellingPrice) || 0,
                photoUrl: editProductData.photoUrl || '',
                categoryId: editProductData.categoryId || '',
                weight: Number(editProductData.weight) || 0,
                currentStock: Number(editProductData.currentStock) || 0, // Update stock
                reorderLevel: Number(editProductData.reorderLevel) || 0, // Update reorder level
                standardStockLevel: Number(editProductData.standardStockLevel) || 0, // Update standard stock
                countMethod: editProductData.countMethod || 'Quantity', // Update count method
                unitWeight: Number(editProductData.unitWeight) || 0, // Update unit weight
                tareWeight: Number(editProductData.tareWeight) || 0, // Update tare weight
                unit: editProductData.unit || 'Each', // Update unit
            });
            toast.success('Product updated successfully!');
            fetchData();
        } catch (error) {
            toast.error("Failed to update product.");
            console.error("Error updating product:", error);
        }
    };

    const handleDeleteProduct = (productId) => {
        toast((t) => (
            <span>
                Delete this product and all its recipes?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteProduct(productId)
                        .then(() => {
                            toast.success("Product deleted.");
                            setSelectedProductId(null);
                            fetchData();
                        })
                        .catch(err => toast.error("Failed to delete product."));
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
    
    if (loading) return <p className="text-gray-400">Loading Product Catalog...</p>;
    
    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Unified Product Catalog</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <Input placeholder="Search all products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-4" />
                        <div className="space-y-1 max-h-[30rem] overflow-y-auto pr-2">
                            {categories.map(category => (
                               <div key={category.id}>
                                    <div onClick={() => setExpandedCategories(p => ({...p, [category.id]: !p[category.id]}))} className="flex items-center justify-between p-3 rounded-lg bg-gray-700 cursor-pointer hover:bg-gray-600">
                                        <span className="font-semibold text-white">{category.name}</span>
                                        {expandedCategories[category.id] ? <ChevronDown/> : <ChevronRight/>}
                                    </div>
                                    {expandedCategories[category.id] && (
                                        <div className="pl-4 mt-1 space-y-1">
                                            {(productsByCategory[category.id] || []).map(p => (
                                                <div key={p.id} onClick={() => setSelectedProductId(p.id)} className={`p-2 rounded-md cursor-pointer ${selectedProductId === p.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-900/50'}`}>
                                                    <p className="font-semibold">{p.name}</p>
                                                    <p className="text-xs opacity-70">Part #: {p.partNumber}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                             {productsByCategory['uncategorized']?.length > 0 && (
                                <div>
                                     <div onClick={() => setExpandedCategories(p => ({...p, uncategorized: !p.uncategorized}))} className="flex items-center justify-between p-3 rounded-lg bg-gray-700 cursor-pointer hover:bg-gray-600">
                                        <span className="font-semibold text-white">Uncategorized</span>
                                        {expandedCategories.uncategorized ? <ChevronDown/> : <ChevronRight/>}
                                    </div>
                                    {expandedCategories.uncategorized && (
                                        <div className="pl-4 mt-1 space-y-1">
                                            {productsByCategory['uncategorized'].map(p => (
                                                 <div key={p.id} onClick={() => setSelectedProductId(p.id)} className={`p-2 rounded-md cursor-pointer ${selectedProductId === p.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-900/50'}`}>
                                                    <p className="font-semibold">{p.name}</p>
                                                    <p className="text-xs opacity-70">Part #: {p.partNumber}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                             )}
                        </div>
                    </div>
                    <div className="space-y-4 border-t border-gray-700 pt-6">
                        <h4 className="font-bold text-lg text-white">Add New Category</h4>
                        <div className="flex gap-2">
                            <Input placeholder="e.g., Fiberglass Panels" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                            <Button onClick={handleAddNewCategory}><FolderPlus size={16} /></Button>
                        </div>
                    </div>
                     <form onSubmit={handleAddNewProduct} className="space-y-4 border-t border-gray-700 pt-6">
                         <h4 className="font-bold text-lg text-white">Add New Product</h4>
                         <Dropdown label="Category" value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})} options={categories} placeholder="Select category..." required/>
                         <Input label="Product Name" name="name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required/>
                         <Input label="Part Number" name="partNumber" value={newProduct.partNumber} onChange={e => setNewProduct({...newProduct, partNumber: e.target.value})} required/>
                         <Input label="Selling Price (R)" name="sellingPrice" type="number" value={newProduct.sellingPrice} onChange={e => setNewProduct({...newProduct, sellingPrice: e.target.value})} />
                         <Input label="Weight (kg)" name="weight" type="number" step="0.01" value={newProduct.weight} onChange={e => setNewProduct({...newProduct, weight: e.target.value})} />
                         <Input label="Unit of Measure" name="unit" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} placeholder="e.g., Each, Set" />
                         
                         {/* New Stock Fields for Products */}
                         <div className="grid grid-cols-3 gap-2">
                            <Input label="In Stock" name="currentStock" type="number" value={newProduct.currentStock} onChange={e => setNewProduct({...newProduct, currentStock: e.target.value})} placeholder="0" />
                            <Input label="Re-order At" name="reorderLevel" type="number" value={newProduct.reorderLevel} onChange={e => setNewProduct({...newProduct, reorderLevel: e.target.value})} placeholder="0" />
                            <Input label="Standard Stock" name="standardStockLevel" type="number" value={newProduct.standardStockLevel} onChange={e => setNewProduct({...newProduct, standardStockLevel: e.target.value})} placeholder="0" />
                        </div>
                        <Dropdown 
                            name="countMethod" 
                            label="Count Method" 
                            value={newProduct.countMethod} 
                            onChange={e => setNewProduct({...newProduct, countMethod: e.target.value})}
                        >
                            <option value="Quantity">Quantity</option>
                            <option value="Weight">Weight</option>
                        </Dropdown>
                        {newProduct.countMethod === 'Weight' && (
                            <>
                                <Input name="unitWeight" label="Weight per Unit (g)" type="number" value={newProduct.unitWeight} onChange={e => setNewProduct({...newProduct, unitWeight: e.target.value})} placeholder="0" />
                                <Input name="tareWeight" label="Container Tare Weight (g)" type="number" value={newProduct.tareWeight} onChange={e => setNewProduct({...newProduct, tareWeight: e.target.value})} placeholder="0" />
                            </>
                        )}

                         <Button type="submit" variant="primary" className="w-full"><PackagePlus size={16} className="mr-2"/>Create New Product</Button>
                    </form>
                </div>

                <div className="lg:col-span-2">
                     {!selectedProductId ? (
                        <div className="flex items-center justify-center h-full bg-gray-900/50 p-6 rounded-xl border-2 border-dashed border-gray-700 text-gray-500">
                            <p>Select a product from the list to view its details and associated manufacturing recipes.</p>
                        </div>
                     ) : (
                        <div className="bg-gray-900/50 p-6 rounded-xl">
                             <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-700">
                                <h3 className="text-2xl font-bold text-white">{editProductData?.name}</h3>
                                <Button onClick={() => handleDeleteProduct(selectedProductId)} variant="danger" size="sm" className="p-2"><Trash2 size={16}/></Button>
                            </div>
                            <div className="space-y-4">
                                <Dropdown label="Category" value={editProductData?.categoryId || ''} onChange={e => setEditProductData({...editProductData, categoryId: e.target.value})} options={categories} placeholder="Choose a category..."/>
                                <Input label="Product Name" name="name" value={editProductData?.name || ''} onChange={e => setEditProductData({...editProductData, name: e.target.value})} />
                                <Input label="Part Number" value={editProductData?.partNumber || ''} disabled />
                                <Input label="Selling Price (R)" name="sellingPrice" type="number" value={editProductData?.sellingPrice || ''} onChange={e => setEditProductData({...editProductData, sellingPrice: e.target.value})} />
                                <Input label="Weight (kg)" name="weight" type="number" step="0.01" value={editProductData?.weight || ''} onChange={e => setEditProductData({...editProductData, weight: e.target.value})} />
                                <Input label="Unit of Measure" name="unit" value={editProductData?.unit || ''} onChange={e => setEditProductData({...editProductData, unit: e.target.value})} placeholder="e.g., Each, Set" />
                                <Input label="Photo URL" name="photoUrl" value={editProductData?.photoUrl || ''} onChange={e => setEditProductData({...editProductData, photoUrl: e.target.value})} placeholder="Paste image link here..."/>
                                {editProductData?.photoUrl && <img src={editProductData.photoUrl} alt="Product Preview" className="w-48 h-48 rounded-lg object-cover border-2 border-gray-600" />}
                                
                                {/* Existing Product Stock Fields */}
                                <h5 className="font-semibold text-white mt-6 mb-2">Stock & Inventory Settings</h5>
                                <div className="grid grid-cols-3 gap-2">
                                    <Input label="In Stock" name="currentStock" type="number" value={editProductData?.currentStock || ''} onChange={e => setEditProductData({...editProductData, currentStock: e.target.value})} placeholder="0" />
                                    <Input label="Re-order At" name="reorderLevel" type="number" value={editProductData?.reorderLevel || ''} onChange={e => setEditProductData({...editProductData, reorderLevel: e.target.value})} placeholder="0" />
                                    <Input label="Standard Stock" name="standardStockLevel" type="number" value={editProductData?.standardStockLevel || ''} onChange={e => setEditProductData({...editProductData, standardStockLevel: e.target.value})} placeholder="0" />
                                </div>
                                <Dropdown 
                                    name="countMethod" 
                                    label="Count Method" 
                                    value={editProductData?.countMethod || 'Quantity'} 
                                    onChange={e => setEditProductData({...editProductData, countMethod: e.target.value})}
                                >
                                    <option value="Quantity">Quantity</option>
                                    <option value="Weight">Weight</option>
                                </Dropdown>
                                {editProductData?.countMethod === 'Weight' && (
                                    <>
                                        <Input name="unitWeight" label="Weight per Unit (g)" type="number" value={editProductData?.unitWeight || ''} onChange={e => setEditProductData({...editProductData, unitWeight: e.target.value})} placeholder="0" />
                                        <Input name="tareWeight" label="Container Tare Weight (g)" type="number" value={editProductData?.tareWeight || ''} onChange={e => setEditProductData({...editProductData, tareWeight: e.target.value})} placeholder="0" />
                                    </>
                                )}

                                <Button onClick={handleUpdateProduct}><Save size={16} className="mr-2"/> Save Details</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnifiedProductManager;
