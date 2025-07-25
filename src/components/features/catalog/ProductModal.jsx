// src/components/features/catalog/ProductModal.jsx

import React, { useState, useEffect } from 'react';
import { addInventoryItem, updateInventoryItem } from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductModal = ({ product, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        partNumber: '',
        make: '',
        model: '',
        manufacturer: '',
        sellingPrice: '',
        photoUrl: '',
        category: 'Product', // This is fixed for this modal
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                partNumber: product.partNumber || '',
                make: product.make || '',
                model: product.model || '',
                manufacturer: product.manufacturer || '',
                sellingPrice: product.sellingPrice || '',
                photoUrl: product.photoUrl || '',
                category: 'Product',
            });
        }
    }, [product]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{product ? 'Edit Product' : 'Add New Product'}</h2>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20} /></Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Product Name" name="name" value={formData.name} onChange={handleInputChange} required />
                        <Input label="Part Number" name="partNumber" value={formData.partNumber} onChange={handleInputChange} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Manufacturer" name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} placeholder="e.g., Volvo" />
                        <Input label="Make" name="make" value={formData.make} onChange={handleInputChange} placeholder="e.g., FH Series" />
                        <Input label="Model" name="model" value={formData.model} onChange={handleInputChange} placeholder="e.g., 2018" />
                    </div>
                    <Input label="Selling Price (R)" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} />
                    <Input label="Image URL" name="photoUrl" value={formData.photoUrl} onChange={handleInputChange} placeholder="https://..." />
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
