// src/components/features/catalog/ProductModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
    addInventoryItem, 
    updateInventoryItem, 
    getProductCategories,
    getMakes,
    getModels,
    getUnits
} from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductModal = ({ product, onClose }) => {
    const [formData, setFormData] = useState({
        name: '', partNumber: '', make: '', model: '', categoryId: '', sellingPrice: '',
        price: '', photoUrl: '', currentStock: '', reorderLevel: '',
        standardStockLevel: '', unit: '', category: 'Product',
        itemCode: '', // Initialize itemCode
    });

    const [dropdownData, setDropdownData] = useState({
        categories: [], makes: [], models: [], units: []
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchDropdowns = async () => {
            const [cats, mks, mdls, uts] = await Promise.all([
                getProductCategories(),
                getMakes(),
                getModels(),
                getUnits()
            ]);
            setDropdownData({ categories: cats, makes: mks, models: mdls, units: uts });
        };
        fetchDropdowns();

        if (product) {
            setFormData({
                name: product.name || '', partNumber: product.partNumber || '',
                make: product.make || '', model: product.model || '',
                categoryId: product.categoryId || '', sellingPrice: product.sellingPrice || '',
                price: product.price || '', photoUrl: product.photoUrl || '',
                currentStock: product.currentStock || '',
                reorderLevel: product.reorderLevel || '', standardStockLevel: product.standardStockLevel || '',
                unit: product.unit || '', category: 'Product',
                itemCode: product.itemCode || product.partNumber || '', // Ensure itemCode is set from existing data or partNumber
            });
        }
    }, [product]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'categoryId') {
                updated.make = '';
                updated.model = '';
            }
            if (name === 'make') {
                updated.model = '';
            }
            // If partNumber changes, update itemCode to match for products
            if (name === 'partNumber' && prev.category === 'Product') {
                updated.itemCode = value;
            }
            return updated;
        });
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.partNumber) {
            return toast.error("Product Name and Part Number are required.");
        }
        setIsSubmitting(true);
        try {
            const dataToSave = {
                ...formData,
                sellingPrice: parseFloat(formData.sellingPrice) || 0,
                price: parseFloat(formData.price) || 0,
                currentStock: Number(formData.currentStock) || 0,
                reorderLevel: Number(formData.reorderLevel) || 0,
                standardStockLevel: Number(formData.standardStockLevel) || 0,
                // Ensure itemCode is explicitly set to partNumber for products
                itemCode: formData.category === 'Product' ? formData.partNumber : formData.itemCode,
            };

            if (product) {
                await updateInventoryItem(product.id, dataToSave);
                toast.success("Product updated successfully!");
            } else {
                await addInventoryItem(dataToSave);
                toast.success("Product added successfully!");
            }
            onClose();
        } catch (error) {
            toast.error(`Failed to save product: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- UPDATED: Filter makes based on the new many-to-many relationship ---
    const filteredMakes = useMemo(() => {
        if (!formData.categoryId) return [];
        // A make is included if its `categoryIds` array contains the selected categoryId
        return dropdownData.makes.filter(make => 
            Array.isArray(make.categoryIds) && make.categoryIds.includes(formData.categoryId)
        );
    }, [formData.categoryId, dropdownData.makes]);

    const filteredModels = useMemo(() => {
        if (!formData.make) return [];
        return dropdownData.models.filter(model => model.makeId === formData.make);
    }, [formData.make, dropdownData.models]);

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{product ? 'Edit Product' : 'Add New Product'}</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Product Name" name="name" value={formData.name} onChange={handleInputChange} required />
                        <Input label="Part Number / Product ID" name="partNumber" value={formData.partNumber} onChange={handleInputChange} required />
                        <Dropdown label="Product Category" name="categoryId" value={formData.categoryId} onChange={handleInputChange} options={dropdownData.categories} placeholder="Select Category..." />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Dropdown label="Make" name="make" value={formData.make} onChange={handleInputChange} options={filteredMakes} placeholder="Select Make..." disabled={!formData.categoryId} />
                        <Dropdown label="Model / Year" name="model" value={formData.model} onChange={handleInputChange} options={filteredModels} placeholder="Select Model/Year..." disabled={!formData.make} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                        <Input label="Selling Price (R)" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} />
                        <Input label="Cost Price (R)" name="price" type="number" value={formData.price} onChange={handleInputChange} />
                        <Dropdown label="Unit of Measure" name="unit" value={formData.unit} onChange={handleInputChange} options={dropdownData.units} placeholder="e.g., each, kg, box" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Stock on Hand" name="currentStock" type="number" value={formData.currentStock} onChange={handleInputChange} />
                        <Input label="Min Stock Level (Re-order)" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} />
                        <Input label="Standard Stock Level" name="standardStockLevel" type="number" value={formData.standardStockLevel} onChange={handleInputChange} />
                    </div>
                    <div className="pt-4 border-t border-gray-700">
                        <Input label="Image URL" name="photoUrl" value={formData.photoUrl} onChange={handleInputChange} placeholder="https://..." />
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end">
                    <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                        <Save size={16} className="mr-2" />
                        {isSubmitting ? 'Saving...' : 'Save Product'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
