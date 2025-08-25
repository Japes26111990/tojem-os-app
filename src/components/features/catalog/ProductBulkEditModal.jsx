// src/components/features/catalog/ProductBulkEditModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getProductCategories, getMakes, getModels, getUnits } from '../../../api/firestore';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import { X, Save, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductBulkEditModal = ({ selectedProductIds, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        categoryId: '',
        make: '',
        model: '',
        sellingPrice: '',
        price: '',
        unit: '',
        reorderLevel: '',
        standardStockLevel: '',
    });

    const [dropdownData, setDropdownData] = useState({
        categories: [], makes: [], models: [], units: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchDropdowns = async () => {
            const [cats, mks, mdls, uts] = await Promise.all([
                getProductCategories(), getMakes(), getModels(), getUnits()
            ]);
            setDropdownData({ categories: cats, makes: mks, models: mdls, units: uts });
        };
        fetchDropdowns();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'categoryId') updated.make = '';
            if (name === 'make') updated.model = '';
            return updated;
        });
    };

    const handleSubmit = async () => {
        const dataToUpdate = {};
        // Construct an object with only the fields that were actually changed
        for (const key in formData) {
            if (formData[key] !== '' && formData[key] !== null) {
                const value = formData[key];
                // Convert numeric fields from strings to numbers
                if (['sellingPrice', 'price', 'reorderLevel', 'standardStockLevel'].includes(key)) {
                    dataToUpdate[key] = parseFloat(value) || 0;
                } else {
                    dataToUpdate[key] = value;
                }
            }
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return toast.error("No changes were made.");
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            selectedProductIds.forEach(productId => {
                const docRef = doc(db, 'inventoryItems', productId);
                batch.update(docRef, dataToUpdate);
            });
            await batch.commit();
            toast.success(`${selectedProductIds.size} products updated successfully!`);
            onSave(); // This will trigger a refetch of data on the main page
            onClose();
        } catch (error) {
            toast.error(`Failed to update products: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredMakes = useMemo(() => {
        if (!formData.categoryId) return dropdownData.makes;
        return dropdownData.makes.filter(make => 
            Array.isArray(make.categoryIds) && make.categoryIds.includes(formData.categoryId)
        );
    }, [formData.categoryId, dropdownData.makes]);

    const filteredModels = useMemo(() => {
        if (!formData.make) return dropdownData.models;
        return dropdownData.models.filter(model => model.makeId === formData.make);
    }, [formData.make, dropdownData.models]);

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Bulk Edit {selectedProductIds.size} Products</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <p className="text-sm text-yellow-400 bg-yellow-900/50 p-3 rounded-md">NOTE: Only fill in the fields you want to change. Leave fields blank to keep their existing values.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Dropdown label="Product Category" name="categoryId" value={formData.categoryId} onChange={handleInputChange} options={dropdownData.categories} placeholder="No Change" />
                        <Dropdown label="Make" name="make" value={formData.make} onChange={handleInputChange} options={filteredMakes} placeholder="No Change" disabled={!formData.categoryId} />
                        <Dropdown label="Model / Year" name="model" value={formData.model} onChange={handleInputChange} options={filteredModels} placeholder="No Change" disabled={!formData.make} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                        <Input label="Selling Price (R)" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} placeholder="No Change" />
                        <Input label="Cost Price (R)" name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="No Change" />
                        <Dropdown label="Unit of Measure" name="unit" value={formData.unit} onChange={handleInputChange} options={dropdownData.units} placeholder="No Change" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Min Stock Level (Re-order)" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} placeholder="No Change" />
                        <Input label="Standard Stock Level" name="standardStockLevel" type="number" value={formData.standardStockLevel} onChange={handleInputChange} placeholder="No Change" />
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end">
                    <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                        <Save size={16} className="mr-2" />
                        {isSubmitting ? 'Saving...' : 'Save Changes to All'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProductBulkEditModal;