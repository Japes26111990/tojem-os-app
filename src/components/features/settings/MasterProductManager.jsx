// src/components/features/settings/MasterProductManager.jsx (New File)

import React, { useState, useEffect, useMemo } from 'react';
import { 
    getMasterProducts, addMasterProduct, deleteMasterProduct, updateMasterProduct,
    getLinkedRecipesForMasterProduct, linkRecipeToMasterProduct, unlinkRecipeFromMasterProduct,
    getParts, getDepartments 
} from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import { Trash2, Link as LinkIcon, X } from 'lucide-react';

const MasterProductManager = () => {
    // State for data from Firestore
    const [masterProducts, setMasterProducts] = useState([]);
    const [parts, setParts] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [linkedRecipes, setLinkedRecipes] = useState([]);
    const [loading, setLoading] = useState(true);

    // State for UI control
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [newProductName, setNewProductName] = useState('');
    const [newProductDescription, setNewProductDescription] = useState('');

    // State for linking form
    const [partToLinkId, setPartToLinkId] = useState('');
    const [departmentToLinkId, setDepartmentToLinkId] = useState('');

    // Fetch initial data
    const fetchData = async () => {
        setLoading(true);
        const [products, fetchedParts, fetchedDepartments] = await Promise.all([
            getMasterProducts(),
            getParts(),
            getDepartments()
        ]);
        setMasterProducts(products);
        setParts(fetchedParts);
        setDepartments(fetchedDepartments);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch linked recipes whenever a master product is selected
    useEffect(() => {
        if (selectedProductId) {
            const fetchLinks = async () => {
                const links = await getLinkedRecipesForMasterProduct(selectedProductId);
                setLinkedRecipes(links);
            };
            fetchLinks();
        } else {
            setLinkedRecipes([]);
        }
    }, [selectedProductId]);

    const selectedMasterProduct = useMemo(() => {
        return masterProducts.find(p => p.id === selectedProductId);
    }, [selectedProductId, masterProducts]);

    // Handlers
    const handleAddMasterProduct = async (e) => {
        e.preventDefault();
        if (!newProductName.trim()) return toast.error('Product name is required.');
        await addMasterProduct({ name: newProductName, description: newProductDescription });
        setNewProductName('');
        setNewProductDescription('');
        fetchData();
    };

    const handleDeleteMasterProduct = async (productId) => {
        if (window.confirm("Are you sure you want to delete this master product and all its links? This cannot be undone.")) {
            await deleteMasterProduct(productId);
            setSelectedProductId(null);
            fetchData();
        }
    };

    const handleLinkRecipe = async (e) => {
        e.preventDefault();
        if (!partToLinkId || !departmentToLinkId) return toast.error('Please select a part and a department.');
        
        const partName = parts.find(p => p.id === partToLinkId)?.name || 'Unknown Part';
        const departmentName = departments.find(d => d.id === departmentToLinkId)?.name || 'Unknown Dept';
        const jobStepDetailId = `${partToLinkId}_${departmentToLinkId}`;

        await linkRecipeToMasterProduct({
            masterProductId: selectedProductId,
            jobStepDetailId,
            partId: partToLinkId,
            departmentId: departmentToLinkId,
            partName,
            departmentName
        });
        
        const links = await getLinkedRecipesForMasterProduct(selectedProductId);
        setLinkedRecipes(links);
        setPartToLinkId('');
        setDepartmentToLinkId('');
    };

    const handleUnlinkRecipe = async (linkId) => {
        await unlinkRecipeFromMasterProduct(linkId);
        const links = await getLinkedRecipesForMasterProduct(selectedProductId);
        setLinkedRecipes(links);
    };

    if (loading) return <p className="text-gray-400">Loading Master Product Manager...</p>;

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Master Product Manager</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: List and Add Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h4 className="font-bold text-lg text-white mb-2">Master Product List</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {masterProducts.map(product => (
                                <div 
                                    key={product.id}
                                    onClick={() => setSelectedProductId(product.id)}
                                    className={`p-3 rounded-md cursor-pointer transition-colors ${selectedProductId === product.id ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    <p className="font-semibold">{product.name}</p>
                                    <p className="text-xs opacity-70">{product.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <form onSubmit={handleAddMasterProduct} className="space-y-4 border-t border-gray-700 pt-6">
                        <h4 className="font-bold text-lg text-white">Add New Master Product</h4>
                        <Input label="Product Name" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="e.g., Volvo Cab Extender"/>
                        <Input label="Description" value={newProductDescription} onChange={e => setNewProductDescription(e.target.value)} placeholder="A brief description"/>
                        <Button type="submit" variant="primary" className="w-full">Create Product</Button>
                    </form>
                </div>

                {/* Right Column: Editor */}
                <div className="lg:col-span-2">
                    {selectedMasterProduct ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xl font-bold text-blue-400">{selectedMasterProduct.name}</h4>
                                <p className="text-gray-400">{selectedMasterProduct.description}</p>
                            </div>

                            {/* Linked Recipes List */}
                            <div className="space-y-3">
                                <h5 className="font-semibold text-white">Linked Recipes ({linkedRecipes.length})</h5>
                                {linkedRecipes.length > 0 ? (
                                    linkedRecipes.map(link => (
                                        <div key={link.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                                            <div>
                                                <p className="font-semibold text-gray-200">{link.partName}</p>
                                                <p className="text-xs text-gray-400">{link.departmentName} Department</p>
                                            </div>
                                            <Button onClick={() => handleUnlinkRecipe(link.id)} variant="danger" size="sm" className="p-2">
                                                <X size={16}/>
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">No recipes linked yet.</p>
                                )}
                            </div>

                            {/* Link New Recipe Form */}
                            <form onSubmit={handleLinkRecipe} className="space-y-3 border-t border-gray-700 pt-6">
                                <h5 className="font-semibold text-white">Link New Recipe</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Dropdown label="Select Part" value={partToLinkId} onChange={e => setPartToLinkId(e.target.value)} options={parts} placeholder="Choose a part..."/>
                                    <Dropdown label="Select Department" value={departmentToLinkId} onChange={e => setDepartmentToLinkId(e.target.value)} options={departments} placeholder="Choose a department..."/>
                                </div>
                                <Button type="submit" variant="secondary" className="w-full"><LinkIcon size={16} className="mr-2"/>Link Recipe to Master Product</Button>
                            </form>

                             <div className="text-right border-t border-gray-700 pt-6">
                                <Button onClick={() => handleDeleteMasterProduct(selectedProductId)} variant="danger">
                                    <Trash2 size={16} className="mr-2"/> Delete Master Product
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-900/50 p-6 rounded-xl border-2 border-dashed border-gray-700 text-gray-500">
                           <p>Select a Master Product from the list on the left to manage its recipes.</p>
                       </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MasterProductManager;
