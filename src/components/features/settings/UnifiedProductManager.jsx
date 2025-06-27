// src/components/features/settings/UnifiedProductManager.jsx (Corrected & Final)

import React, { useState, useEffect, useMemo } from 'react';
import {
    getProducts, addProduct, updateProduct, deleteProduct,
    getProductCategories, addProductCategory,
    getManufacturers, getMakes, getModels,
    getFitmentForProduct, addFitment, removeFitment,
    getJobStepDetails, setJobStepDetail, getDepartments,
    getTools, getToolAccessories, getAllInventoryItems,
    linkRecipeToProduct, getLinkedRecipesForProduct, unlinkRecipeFromProduct,
    getSkills
} from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import Textarea from '../../ui/Textarea';
import { X, Save, Link as LinkIcon, Package, Wrench, Settings2, Search, Trash2, ChevronDown, ChevronRight, PackagePlus, FolderPlus, Star } from 'lucide-react';

const ConsumableEditor = ({ consumables, selectedConsumables, onAdd, onRemove }) => {
    const [consumableType, setConsumableType] = useState('fixed');
    const [fixedId, setFixedId] = useState('');
    const [fixedQty, setFixedQty] = useState('');
    const [dimId, setDimId] = useState('');
    const [cuts, setCuts] = useState([]);
    const [cutRule, setCutRule] = useState({ dimensions: '', notes: '' });
    const handleAddConsumable = () => {
        let newConsumable;
        switch (consumableType) {
            case 'fixed':
                if (!fixedId || !fixedQty) return alert("Please select an item and enter a quantity.");
                newConsumable = { type: 'fixed', itemId: fixedId, quantity: Number(fixedQty) };
                break;
            case 'dimensional':
                if (!dimId || cuts.length === 0) return alert("Please select a material and add at least one cutting instruction.");
                newConsumable = { type: 'dimensional', itemId: dimId, cuts };
                break;
            default: return;
        }
        if (!selectedConsumables.find(c => c.itemId === newConsumable.itemId)) {
            onAdd(newConsumable);
            setFixedId(''); setFixedQty('');
            setDimId(''); setCuts([]); setCutRule({ dimensions: '', notes: '' });
        } else {
            alert("This consumable has already been added to the recipe.");
        }
    };
    const getConsumableName = (id) => consumables.find(c => c.id === id)?.name || 'Unknown Item';
    return (
        <div>
            <h4 className="font-semibold mb-2 text-white">Required Consumables</h4>
            <div className="p-4 bg-gray-800 rounded-lg space-y-4">
                <div className="flex gap-2 bg-gray-700 p-1 rounded-md">
                    <button type="button" onClick={() => setConsumableType('fixed')} className={`flex-1 p-2 text-sm rounded transition-colors ${consumableType === 'fixed' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20'}`}>Fixed Quantity</button>
                    <button type="button" onClick={() => setConsumableType('dimensional')} className={`flex-1 p-2 text-sm rounded transition-colors ${consumableType === 'dimensional' ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/20'}`}>Dimensional Cuts</button>
                </div>
                {consumableType === 'fixed' && (
                    <div className="flex items-end gap-2 animate-fade-in">
                        <div className="flex-grow"><Dropdown label="Item" value={fixedId} onChange={e => setFixedId(e.target.value)} options={consumables} placeholder="Select..."/></div>
                        <div className="w-24"><Input label="Qty" type="number" value={fixedQty} onChange={e => setFixedQty(e.target.value)} placeholder="e.g., 5"/></div>
                        <Button type="button" onClick={handleAddConsumable}>Add</Button>
                    </div>
                )}
                {consumableType === 'dimensional' && (
                     <div className="space-y-3 animate-fade-in">
                        <Dropdown label="Material to Cut" value={dimId} onChange={e => setDimId(e.target.value)} options={consumables} placeholder="Select mat..."/>
                        <div className="p-2 border border-gray-700 rounded-md">
                             <p className="text-xs text-gray-400 mb-2">Cutting Instructions</p>
                            <div className="flex items-end gap-2">
                                <Input label="Dimensions" value={cutRule.dimensions} onChange={e => setCutRule({...cutRule, dimensions: e.target.value})} />
                                <Input label="Notes" value={cutRule.notes} onChange={e => setCutRule({...cutRule, notes: e.target.value})} />
                                <Button type="button" onClick={() => { if(cutRule.dimensions) { setCuts([...cuts, cutRule]); setCutRule({ dimensions: '', notes: '' }); }}}>Add Cut</Button>
                            </div>
                            <ul className="text-xs mt-2 space-y-1">{cuts.map((c, i) => <li key={i}>{c.dimensions} ({c.notes})</li>)}</ul>
                        </div>
                        <Button type="button" onClick={handleAddConsumable} className="w-full">Add Dimensional Consumable</Button>
                    </div>
                )}
                <h5 className="text-sm font-bold pt-2 border-t border-gray-700 text-gray-200">Recipe Consumables</h5>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedConsumables.map((c, i) => (
                        <li key={i} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm text-gray-200">
                            <div>
                                <p className="font-semibold">{getConsumableName(c.itemId)}</p>
                                {c.type === 'fixed' && <p className="text-xs text-gray-400">Qty: {c.quantity}</p>}
                                {c.type === 'dimensional' && <p className="text-xs text-gray-400">{c.cuts.length} cut(s) required</p>}
                            </div>
                            <Button type="button" onClick={() => onRemove(c.itemId)} variant="danger" className="py-0.5 px-2 text-xs">X</Button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


const UnifiedProductManager = () => {
    // Data states
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [allRecipes, setAllRecipes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [tools, setTools] = useState([]);
    const [toolAccessories, setToolAccessories] = useState([]);
    const [consumables, setConsumables] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    
    // UI Control states
    const [loading, setLoading] = useState(true);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('details');
    const [expandedCategories, setExpandedCategories] = useState({});
    
    // Form states
    const [newProduct, setNewProduct] = useState({ name: '', partNumber: '', sellingPrice: '', categoryId: '', weight: '' });
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editProductData, setEditProductData] = useState(null);
    
    // Fitment states
    const [fitmentLinks, setFitmentLinks] = useState([]);
    const [mfgToLink, setMfgToLink] = useState('');
    const [makeToLink, setMakeToLink] = useState('');
    const [modelToLink, setModelToLink] = useState('');
    
    // Recipe Editor State
    const initialRecipeState = { 
        description: '', estimatedTime: '', steps: '', 
        tools: new Set(), accessories: new Set(), consumables: [],
        requiredSkills: []
    };
    const [recipeDepartmentId, setRecipeDepartmentId] = useState('');
    const [recipeData, setRecipeData] = useState(initialRecipeState);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prods, cats, m, mk, mo, recipes, depts, t, ta, inv, skills] = await Promise.all([
                getProducts(), getProductCategories(), getManufacturers(), getMakes(), getModels(), getJobStepDetails(), getDepartments(), getTools(), getToolAccessories(), getAllInventoryItems(), getSkills()
            ]);
            setProducts(prods);
            setCategories(cats);
            setManufacturers(m);
            setMakes(mk);
            setModels(mo);
            setAllRecipes(recipes);
            setDepartments(depts);
            setTools(t);
            setToolAccessories(ta);
            setConsumables(inv);
            setAllSkills(skills);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
            alert("Error fetching data. Check the console.");
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            setEditProductData(product);
            setActiveTab('details');
            setRecipeDepartmentId('');
            const fetchLinks = async () => setFitmentLinks(await getFitmentForProduct(selectedProductId));
            fetchLinks();
        } else {
            setEditProductData(null);
        }
    }, [selectedProductId, products]);

    useEffect(() => {
        if (selectedProductId && recipeDepartmentId) {
            const recipeId = `${selectedProductId}_${recipeDepartmentId}`;
            const existingRecipe = allRecipes.find(r => r.id === recipeId);
            if (existingRecipe) {
                setRecipeData({
                    description: existingRecipe.description || '',
                    estimatedTime: existingRecipe.estimatedTime || '',
                    steps: (existingRecipe.steps || []).join('\n'),
                    tools: new Set(existingRecipe.tools || []),
                    accessories: new Set(existingRecipe.accessories || []),
                    consumables: existingRecipe.consumables || [],
                    requiredSkills: existingRecipe.requiredSkills || []
                });
            } else {
                 setRecipeData(initialRecipeState);
            }
        }
    }, [selectedProductId, recipeDepartmentId, allRecipes]);

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
        setNewCategoryName('');
        fetchData();
    };
    
    const handleAddNewProduct = async (e) => {
        e.preventDefault();
        if (!newProduct.name || !newProduct.partNumber || !newProduct.categoryId) {
            return alert('Category, Product Name, and Part Number are required.');
        }
        try {
            const productData = { ...newProduct, weight: Number(newProduct.weight) || 0 };
            await addProduct(productData);
            setNewProduct({ name: '', partNumber: '', sellingPrice: '', categoryId: '', weight: '' });
            fetchData();
        } catch (error) {
            alert(error.message);
        }
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
        if (window.confirm("Are you sure you want to PERMANENTLY delete this product? This cannot be undone.")) {
            await deleteProduct(productId);
            setSelectedProductId(null);
            fetchData();
        }
    };
    
    const handleAddFitment = async () => {
        if(!modelToLink) return alert('Please select a model to link.');
        const model = models.find(m => m.id === modelToLink);
        const make = makes.find(m => m.id === model.makeId);
        const manufacturer = manufacturers.find(m => m.id === make.manufacturerId);
        await addFitment(selectedProductId, model.id, model.name, make.name, manufacturer.name);
        const links = await getFitmentForProduct(selectedProductId);
        setFitmentLinks(links);
    };
    
    const handleRemoveFitment = async (fitmentId) => {
        await removeFitment(fitmentId);
        const links = await getFitmentForProduct(selectedProductId);
        setFitmentLinks(links);
    };

    const handleAddSkillToRecipe = (skillId) => {
        if(!skillId || recipeData.requiredSkills.some(s => s.skillId === skillId)) return;
        const skill = allSkills.find(s => s.id === skillId);
        if(!skill) return;
        setRecipeData(prev => ({
            ...prev,
            requiredSkills: [...prev.requiredSkills, { skillId: skill.id, skillName: skill.name, minProficiency: 1 }]
        }));
    };
    const handleRemoveSkillFromRecipe = (skillId) => {
        setRecipeData(prev => ({
            ...prev,
            requiredSkills: prev.requiredSkills.filter(s => s.skillId !== skillId)
        }));
    };
    const handleProficiencyChange = (skillId, value) => {
        setRecipeData(prev => ({
            ...prev,
            requiredSkills: prev.requiredSkills.map(s => s.skillId === skillId ? { ...s, minProficiency: Number(value) } : s)
        }));
    };

    const handleSaveRecipe = async () => {
        if (!selectedProductId || !recipeDepartmentId) return alert('A product and department must be selected.');
        const dataToSave = {
            description: recipeData.description,
            estimatedTime: Number(recipeData.estimatedTime),
            steps: recipeData.steps.split('\n').filter(s => s.trim() !== ''),
            tools: Array.from(recipeData.tools),
            accessories: Array.from(recipeData.accessories),
            consumables: recipeData.consumables,
            requiredSkills: recipeData.requiredSkills
        };
        try {
            await setJobStepDetail(selectedProductId, recipeDepartmentId, dataToSave);
            const product = products.find(p => p.id === selectedProductId);
            const department = departments.find(d => d.id === recipeDepartmentId);
            const existingLinks = await getLinkedRecipesForProduct(selectedProductId);
            const linkExists = existingLinks.some(link => link.departmentId === recipeDepartmentId);
            if (!linkExists && product && department) {
                await linkRecipeToProduct({
                    productId: selectedProductId, productName: product.name,
                    jobStepDetailId: `${selectedProductId}_${recipeDepartmentId}`,
                    departmentId: recipeDepartmentId, departmentName: department.name
                });
            }
            alert('Recipe saved successfully!');
            fetchData();
        } catch (error) {
            console.error("Error saving recipe:", error);
            alert("Failed to save recipe.");
        }
    };
    
    const handleRecipeInputChange = (e) => setRecipeData({...recipeData, [e.target.name]: e.target.value});
    const handleToolToggle = (toolId) => {
        const newTools = new Set(recipeData.tools);
        newTools.has(toolId) ? newTools.delete(toolId) : newTools.add(toolId);
        setRecipeData({...recipeData, tools: newTools});
    };
    const handleAccessoryToggle = (accId) => {
        const newAccessories = new Set(recipeData.accessories);
        newAccessories.has(accId) ? newAccessories.delete(accId) : newAccessories.add(accId);
        setRecipeData({...recipeData, accessories: newAccessories});
    };
    const handleAddConsumable = (c) => setRecipeData({...recipeData, consumables: [...recipeData.consumables, c]});
    const handleRemoveConsumable = (itemId) => setRecipeData({...recipeData, consumables: recipeData.consumables.filter(c => c.itemId !== itemId)});
    const filteredMakes = useMemo(() => makes.filter(m => m.manufacturerId === mfgToLink), [mfgToLink, makes]);
    const filteredModels = useMemo(() => models.filter(m => m.makeId === makeToLink), [makeToLink, models]);
    
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
                                            {(productsByCategory[category.id] || []).length > 0 ? (
                                                (productsByCategory[category.id] || []).map(p => (
                                                    <div key={p.id} onClick={() => setSelectedProductId(p.id)} className={`p-2 rounded-md cursor-pointer ${selectedProductId === p.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-900/50'}`}>
                                                        <p className="font-semibold">{p.name}</p>
                                                        <p className="text-xs opacity-70">Part #: {p.partNumber}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-gray-500 p-2 italic">No products in this category.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {(productsByCategory['uncategorized']?.length > 0) && (
                                 <div key="uncategorized">
                                    <div onClick={() => setExpandedCategories(p => ({...p, uncategorized: !p.uncategorized}))} className="flex items-center justify-between p-3 rounded-lg bg-gray-700 cursor-pointer hover:bg-gray-600 mt-4">
                                        <span className="font-semibold text-white italic">Uncategorized</span>
                                        {expandedCategories['uncategorized'] ? <ChevronDown/> : <ChevronRight/>}
                                    </div>
                                    {expandedCategories['uncategorized'] && (
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

                <div className="lg:col-span-2">
                     {!selectedProductId ? (
                        <div className="flex items-center justify-center h-full bg-gray-900/50 p-6 rounded-xl border-2 border-dashed border-gray-700 text-gray-500">
                            <p>Select a product from the list to view its details.</p>
                        </div>
                     ) : (
                        <div className="bg-gray-900/50 p-6 rounded-xl">
                             <div className="flex justify-between items-center">
                                 <div className="flex border-b border-gray-600">
                                    <button onClick={() => setActiveTab('details')} className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}><Package size={16}/> Details</button>
                                    <button onClick={() => setActiveTab('fitment')} className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${activeTab === 'fitment' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}><Settings2 size={16}/> Fitment</button>
                                    <button onClick={() => setActiveTab('recipe')} className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${activeTab === 'recipe' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400'}`}><Wrench size={16}/> Recipe</button>
                                </div>
                                <Button onClick={() => handleDeleteProduct(selectedProductId)} variant="danger" size="sm" className="p-2"><Trash2 size={16}/></Button>
                            </div>
                            <div className="pt-6">
                                {activeTab === 'details' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <Dropdown label="Category" value={editProductData?.categoryId || ''} onChange={e => setEditProductData({...editProductData, categoryId: e.target.value})} options={categories} placeholder="Choose a category..."/>
                                        <Input label="Product Name" value={editProductData?.name || ''} onChange={e => setEditProductData({...editProductData, name: e.target.value})} />
                                        <Input label="Part Number" value={editProductData?.partNumber || ''} disabled />
                                        <Input label="Selling Price (R)" type="number" value={editProductData?.sellingPrice || ''} onChange={e => setEditProductData({...editProductData, sellingPrice: e.target.value})} />
                                        <Input label="Weight (kg)" type="number" step="0.01" value={editProductData?.weight || ''} onChange={e => setEditProductData({...editProductData, weight: e.target.value})} />
                                        <Input label="Photo URL" value={editProductData?.photoUrl || ''} onChange={e => setEditProductData({...editProductData, photoUrl: e.target.value})} placeholder="Paste Dropbox link here..."/>
                                        {editProductData?.photoUrl && <img src={editProductData.photoUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com")} alt="Product Preview" className="w-48 h-48 rounded-lg object-cover border-2 border-gray-600" />}
                                        <Button onClick={handleUpdateProduct}><Save size={16} className="mr-2"/> Save Details</Button>
                                    </div>
                                )}
                                {activeTab === 'fitment' && (
                                     <div className="space-y-4 animate-fade-in">
                                         <h4 className="font-semibold text-white">Linked Models ({fitmentLinks.length})</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {fitmentLinks.map(link => (
                                                <div key={link.id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                                                    <p className="text-sm text-gray-300">{link.manufacturerName} &gt; {link.makeName} &gt; {link.modelName}</p>
                                                    <Button onClick={() => handleRemoveFitment(link.id)} variant="danger" className="p-1 h-6 w-6"><X size={14}/></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="border-t border-gray-600 pt-4 space-y-3">
                                            <h5 className="font-semibold text-white">Add New Fitment</h5>
                                            <Dropdown label="Manufacturer" value={mfgToLink} onChange={e => setMfgToLink(e.target.value)} options={manufacturers} placeholder="Select..."/>
                                            <Dropdown label="Make" value={makeToLink} onChange={e => setMakeToLink(e.target.value)} options={filteredMakes} placeholder="Select..." disabled={!mfgToLink}/>
                                            <Dropdown label="Model" value={modelToLink} onChange={e => setModelToLink(e.target.value)} options={filteredModels} placeholder="Select..." disabled={!makeToLink}/>
                                            <Button onClick={handleAddFitment} className="w-full"><LinkIcon size={16} className="mr-2"/> Link to Model</Button>
                                         </div>
                                    </div>
                                )}
                                {activeTab === 'recipe' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <Dropdown label="Select a Department to Define its Recipe" value={recipeDepartmentId} onChange={e => setRecipeDepartmentId(e.target.value)} options={departments} placeholder="Choose department..."/>
                                        {recipeDepartmentId && (
                                            <div className="space-y-6 border-t border-gray-700 pt-6">
                                                <Input label="Description" name="description" value={recipeData.description} onChange={handleRecipeInputChange} />
                                                <Input label="Estimated Time (minutes)" name="estimatedTime" type="number" value={recipeData.estimatedTime} onChange={handleRecipeInputChange} />
                                                <Textarea label="Steps (one per line)" name="steps" value={recipeData.steps} onChange={handleRecipeInputChange} rows={5} />
                                                
                                                <div className="border-t border-gray-600 pt-4">
                                                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><Star size={16} className="text-yellow-400"/>Required Skills for this Recipe</h4>
                                                    <div className="p-4 bg-gray-800 rounded-lg space-y-3">
                                                        <div className="flex items-end gap-2">
                                                            <div className="flex-grow">
                                                                <Dropdown label="Add a Skill" onChange={e => handleAddSkillToRecipe(e.target.value)} options={allSkills} placeholder="Select skill to add..." value="" />
                                                            </div>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {recipeData.requiredSkills.map(skill => (
                                                                <li key={skill.skillId} className="grid grid-cols-3 items-center gap-4 bg-gray-700 p-2 rounded-md">
                                                                    <span className="font-medium text-gray-200">{skill.skillName}</span>
                                                                    <Input label="Min. Proficiency" type="number" min="1" max="5" value={skill.minProficiency} onChange={(e) => handleProficiencyChange(skill.skillId, e.target.value)} />
                                                                    <Button onClick={() => handleRemoveSkillFromRecipe(skill.skillId)} variant="danger" size="sm">Remove</Button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-600">
                                                    <div>
                                                        <h4 className="font-semibold mb-2 text-white">Required Tools & Accessories</h4>
                                                        <div className="max-h-60 overflow-y-auto space-y-3 p-4 bg-gray-800 rounded-lg">
                                                            {(tools || []).map(tool => ( 
                                                                <div key={tool.id}>
                                                                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-200">
                                                                        <input type="checkbox" checked={recipeData.tools.has(tool.id)} onChange={() => handleToolToggle(tool.id)} className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                                        <span>{tool.name}</span>
                                                                    </label>
                                                                    {recipeData.tools.has(tool.id) && (
                                                                        <div className="pl-6 mt-1 space-y-1 text-xs border-l-2 border-gray-700">
                                                                            {(toolAccessories.filter(acc => acc.toolId === tool.id)).map(accessory => (
                                                                                <label key={accessory.id} className="flex items-center space-x-2 text-xs text-gray-300">
                                                                                    <input type="checkbox" checked={recipeData.accessories.has(accessory.id)} onChange={() => handleAccessoryToggle(accessory.id)} className="h-3 w-3 rounded bg-gray-700 text-blue-600 focus:ring-blue-500" />
                                                                                    <span>{accessory.name}</span>
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <ConsumableEditor consumables={consumables} selectedConsumables={recipeData.consumables} onAdd={handleAddConsumable} onRemove={handleRemoveConsumable} />
                                                </div>

                                                <div className="text-right">
                                                    <Button onClick={handleSaveRecipe} variant="primary" className="bg-green-600 hover:bg-green-700"><Save size={16} className="mr-2"/>Save Recipe for this Department</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnifiedProductManager;