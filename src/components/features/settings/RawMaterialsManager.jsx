// src/components/features/settings/RawMaterialsManager.jsx (Upgraded with Toasts)

import React, { useState, useEffect } from 'react';
import { getRawMaterials, addRawMaterial, deleteRawMaterial, updateDocument } from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const RawMaterialsManager = () => {
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        itemCode: '',
        price: '',
        unit: 'kg',
        currentStock: '',
        reorderLevel: '',
        standardStockLevel: '',
        countMethod: 'Weight',
        containerWeight: '',
        unitWeight: '',
    });

    const fetchData = async () => {
        setIsLoading(true);
        const fetchedMaterials = await getRawMaterials();
        setMaterials(fetchedMaterials);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error("Please provide a material name."); // --- REPLACE ALERT ---
            return;
        }
        try {
            await addRawMaterial(formData);
            toast.success('Raw material added successfully!'); // --- REPLACE ALERT ---
            setFormData({
                name: '', itemCode: '', price: '', unit: 'kg',
                currentStock: '', reorderLevel: '', standardStockLevel: '',
                countMethod: 'Weight', containerWeight: '', unitWeight: ''
            });
            fetchData();
        } catch (error) {
            toast.error('Failed to add raw material.'); // --- REPLACE ALERT ---
            console.error(error);
        }
    };

    const handleUpdate = async (id, updatedData) => {
        try {
            await updateDocument('rawMaterials', id, updatedData);
            toast.success("Raw material updated.");
            fetchData();
        } catch (error) {
            toast.error("Failed to update raw material.");
            console.error("Failed to update raw material: ", error);
        }
    };
    
    const handleDelete = (id) => {
        // --- REPLACE window.confirm ---
        toast((t) => (
            <span>
                Are you sure you want to delete this raw material?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteRawMaterial(id)
                        .then(() => {
                            toast.success("Raw material deleted.");
                            fetchData();
                        })
                        .catch(err => {
                            toast.error("Failed to delete raw material.");
                            console.error(err);
                        });
                    toast.dismiss(t.id);
                }}>
                    Delete
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), {
            icon: '⚠️',
        });
    };

    if (isLoading) return <p>Loading raw materials...</p>;

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-bold text-white">Add New Raw Material</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input name="name" label="Material Name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Mild Steel Sheet" />
                    <Input name="itemCode" label="Item Code" value={formData.itemCode} onChange={handleInputChange} placeholder="e.g., STL-001" />
                    <Input name="price" label="Price" type="number" value={formData.price} onChange={handleInputChange} placeholder="e.g., 25.50" />
                    <Input name="unit" label="Unit of Measure" value={formData.unit} onChange={handleInputChange} placeholder="e.g., kg, meter" />
                    <Input name="currentStock" label="In Stock" type="number" value={formData.currentStock} onChange={handleInputChange} placeholder="e.g., 500" />
                    <Input name="reorderLevel" label="Re-order At" type="number" value={formData.reorderLevel} onChange={handleInputChange} placeholder="e.g., 100" />
                    <Input name="standardStockLevel" label="Standard Stock Level" type="number" value={formData.standardStockLevel} onChange={handleInputChange} placeholder="e.g., 600" />
                    <Dropdown 
                        name="countMethod" 
                        label="Count Method" 
                        value={formData.countMethod} 
                        onChange={handleInputChange}
                    >
                        <option value="Quantity">Quantity</option>
                        <option value="Weight">Weight</option>
                    </Dropdown>
                    {formData.countMethod === 'Weight' && (
                        <>
                            <Input name="containerWeight" label="Container Weight (g)" type="number" value={formData.containerWeight} onChange={handleInputChange} placeholder="e.g., 50" />
                            <Input name="unitWeight" label="Weight per Unit (g)" type="number" value={formData.unitWeight} onChange={handleInputChange} placeholder="e.g., 1" />
                        </>
                    )}
                </div>
                <Button type="submit" variant="primary">Add Raw Material</Button>
            </form>

            <div className="bg-gray-800 p-4 rounded-lg">
                 <h3 className="text-lg font-bold text-white mb-4">Existing Raw Materials</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                         <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                            <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">Code</th>
                                <th className="p-2">In Stock</th>
                                <th className="p-2">Count Method</th>
                                <th className="p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.map(mat => (
                                <EditableMaterialRow 
                                    key={mat.id} 
                                    material={mat} 
                                    onUpdate={handleUpdate}
                                    onDelete={() => handleDelete(mat.id)} 
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const EditableMaterialRow = ({ material, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(material);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onUpdate(material.id, editData);
        setIsEditing(false);
    };

    if (!isEditing) {
        return (
            <tr className="border-b border-gray-700">
                <td className="p-2 text-white">{material.name}</td>
                <td className="p-2">{material.itemCode}</td>
                <td className="p-2">{material.currentStock}</td>
                <td className="p-2">{material.countMethod || 'Weight'}</td>
                <td className="p-2 flex gap-2">
                    <Button onClick={() => setIsEditing(true)} size="sm">Edit</Button>
                    <Button onClick={onDelete} variant="danger" size="sm">Delete</Button>
                </td>
            </tr>
        )
    }

    return (
        <tr className="bg-gray-900">
            <td className="p-2"><Input name="name" value={editData.name} onChange={handleInputChange} /></td>
            <td className="p-2"><Input name="itemCode" value={editData.itemCode} onChange={handleInputChange} /></td>
            <td className="p-2"><Input name="currentStock" type="number" value={editData.currentStock} onChange={handleInputChange} /></td>
            <td className="p-2">
                <Dropdown name="countMethod" value={editData.countMethod} onChange={handleInputChange}>
                    <option value="Quantity">Quantity</option>
                    <option value="Weight">Weight</option>
                </Dropdown>
            </td>
            <td className="p-2 flex gap-2">
                <Button onClick={handleSave} variant="success" size="sm">Save</Button>
                <Button onClick={() => setIsEditing(false)} variant="secondary" size="sm">Cancel</Button>
            </td>
        </tr>
    );
}

export default RawMaterialsManager;
