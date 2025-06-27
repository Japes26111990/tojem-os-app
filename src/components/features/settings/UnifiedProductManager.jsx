// src/components/features/settings/UnifiedProductManager.jsx (REFACTORED for new data model)

import React, { useState, useEffect, useMemo } from 'react';
import {
    getProducts, addProduct, updateProduct, deleteProduct,
    getProductCategories, addProductCategory,
    getJobStepDetails, setJobStepDetail, getDepartments,
    getTools, getToolAccessories, getAllInventoryItems,
    linkRecipeToProduct, getLinkedRecipesForProduct, unlinkRecipeFromProduct,
    getSkills
} from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import Textarea from '../../ui/Textarea';
import { X, Save, Link as LinkIcon, Package, Wrench, Settings2, Search, Trash2, ChevronDown, ChevronRight, PackagePlus, FolderPlus, Star, PlusCircle } from 'lucide-react';

// Note: The ConsumableEditor sub-component is no longer needed here as recipe editing is complex
// and better handled in a dedicated, more focused interface if required later.
// This simplifies the UnifiedProductManager to focus on high-level product and category management.

const UnifiedProductManager = () => {
    // State for all data fetched from Firestore
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [allRecipes, setAllRecipes] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    // UI Control State
    const [loading, setLoading] = useState(true);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});
    
    // Form State for creating new items
    const [newProduct, setNewProduct] = useState({ name: '', partNumber: '', sellingPrice: '', categoryId: '', weight: '' });
    const [newCategoryName, setNewCategoryName] = useState('');
    
    // State for the currently selected product being edited
    const [editProductData, setEditProductData] = useState(null);
    
    // State for recipe links
    const [linkedRecipes, setLinkedRecipes] = useState([]);

    // Fetch all necessary data on component mount
    const fetchData = async () => {
        setLoading(true);
        try {
            const [prods, cats, recipes, depts] = await Promise.all([
                getProducts(), getProductCategories(), getJobStepDetails(), getDepartments()
            ]);
            setProducts(prods); 
            setCategories(cats); 
            setAllRecipes(recipes); 
            setDepartments(depts);
        } catch (error) { 
            console.error("Failed to fetch initial data:", error); 
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // Effect to update form and fetch linked recipes when a product is selected
    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            setEditProductData(product);
            const fetchLinks = async () => setLinkedRecipes(await getLinkedRecipesForProduct(selectedProductId));
            fetchLinks();
        } else {
            setEditProductData(null);
            setLinkedRecipes([]);
        }
    }, [selectedProductId, products]);

    // Memoized calculation to filter and categorize products for display
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

    // Handlers for adding/updating/deleting data
    const handleAddNewCategory = async () => {
        if (!newCategoryName.trim()) return;
        await addProductCategory(newCategoryName);
        setNewCategoryName('');
        fetchData();
    };
    
    const handleAddNewProduct = async (e) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.partNumber || !newProduct.categoryId) return alert('Category, Product Name, and Part Number are required.');
        try {
            const productData = { ...newProduct, weight: Number(newProduct.weight) || 0 };
            await addProduct(productData);
            setNewProduct({ name: '', partNumber: '', sellingPrice: '', categoryId: '', weight: '' });
            fetchData();
        } catch (error) { alert(error.message); }
    };

    const handleUpdateProduct = async () => {
        if (!editProductData.name || !editProductData.partNumber) return alert('Product Name and Part Number are required.');
        await updateProduct(selectedProductId, {
            name: editProductData.name, 
            partNumber: editProductData.partNumber,
            sellingPrice: Number(editProductData.sellingPrice) || 0,
            photoUrl: editProductData.photoUrl || '',
            categoryId: editProductData.categoryId || '',
            weight: Number(editProductData.weight) || 0,
        });
        alert('Product updated successfully!');
        fetchData();
    };

    const handleDeleteProduct = async (productId) => {
        if (window.confirm("Are you sure you want to PERMANENTLY delete this product and all its recipes?")) {
            await deleteProduct(productId);
            setSelectedProductId(null);
            fetchData();
        }
    };
    
    if (loading) return <p className="text-gray-400">Loading Product Catalog...</p>;
    
    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Unified Product Catalog</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Product List and Creation Forms */}
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
                             {/* Uncategorized Products */}
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
                         <Dropdown label="Category" value={newProduct.categoryId} onChange={e => setNewProduct({...newProduct, categoryId: e.target.value})} options={categories} required/>
                         <Input label="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required/>
                         <Input label="Part Number" value={newProduct.partNumber} onChange={e => setNewProduct({...newProduct, partNumber: e.target.value})} required/>
                         <Input label="Selling Price (R)" type="number" value={newProduct.sellingPrice} onChange={e => setNewProduct({...newProduct, sellingPrice: e.target.value})} />
                         <Input label="Weight (kg)" type="number" step="0.01" value={newProduct.weight} onChange={e => setNewProduct({...newProduct, weight: e.target.value})} />
                         <Button type="submit" variant="primary" className="w-full"><PackagePlus size={16} className="mr-2"/>Create New Product</Button>
                    </form>
                </div>

                {/* Right Column: Editor for Selected Product */}
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
                                <Input label="Product Name" value={editProductData?.name || ''} onChange={e => setEditProductData({...editProductData, name: e.target.value})} />
                                <Input label="Part Number" value={editProductData?.partNumber || ''} disabled />
                                <Input label="Selling Price (R)" type="number" value={editProductData?.sellingPrice || ''} onChange={e => setEditProductData({...editProductData, sellingPrice: e.target.value})} />
                                <Input label="Weight (kg)" type="number" step="0.01" value={editProductData?.weight || ''} onChange={e => setEditProductData({...editProductData, weight: e.target.value})} />
                                <Input label="Photo URL" value={editProductData?.photoUrl || ''} onChange={e => setEditProductData({...editProductData, photoUrl: e.target.value})} placeholder="Paste image link here..."/>
                                {editProductData?.photoUrl && <img src={editProductData.photoUrl} alt="Product Preview" className="w-48 h-48 rounded-lg object-cover border-2 border-gray-600" />}
                                <Button onClick={handleUpdateProduct}><Save size={16} className="mr-2"/> Save Details</Button>
                            </div>

                            {/* Linked Recipes Display */}
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <h4 className="text-xl font-bold text-white mb-4">Manufacturing Recipes</h4>
                                <p className="text-sm text-gray-400 mb-4">This product is manufactured using the recipes from the following departments. You can edit these recipes in the <span className="font-bold text-blue-400">Settings &gt; Products & Recipes</span> tab.</p>
                                <div className="space-y-2">
                                     {linkedRecipes.length > 0 ? (
                                        linkedRecipes.map(link => (
                                            <div key={link.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                                                <p className="font-semibold text-gray-200">{link.departmentName} Department</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 text-center py-4">No manufacturing recipes are defined for this product yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnifiedProductManager;
