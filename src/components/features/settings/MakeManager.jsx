// src/components/features/settings/MakeManager.jsx
import React, { useState, useEffect } from 'react';
import { addDoc, deleteDoc, doc, updateDoc, collection } from 'firebase/firestore'; // Added collection, doc, updateDoc, deleteDoc
import { db } from '../../../api/firebase'; // Import db
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';
import { getMakes, getProductCategories } from '../../../api/firestore'; // Import getMakes, getProductCategories

const MakeManager = ({ items, categories, onDataChange }) => {
    const [newMakeName, setNewMakeName] = useState('');
    const [selectedCategoryIds, setSelectedCategoryIds] = useState(new Set());
    const [editingMakeId, setEditingMakeId] = useState(null);
    const [editingMakeName, setEditingMakeName] = useState('');
    const [editingCategoryIds, setEditingCategoryIds] = useState(new Set());

    const handleAddOrUpdateMake = async (e) => {
        e.preventDefault();
        const name = (editingMakeId ? editingMakeName : newMakeName).trim();
        const categoryIds = Array.from(editingMakeId ? editingCategoryIds : selectedCategoryIds);
        
        if (!name) return toast.error("Make name is required.");
        if (categoryIds.length === 0) return toast.error("Please select at least one category.");

        try {
            if (editingMakeId) {
                await updateDoc(doc(db, 'makes', editingMakeId), { name, categoryIds });
                toast.success("Make updated!");
                setEditingMakeId(null);
                setEditingMakeName('');
                setEditingCategoryIds(new Set());
            } else {
                await addDoc(collection(db, 'makes'), { name, categoryIds });
                toast.success("Make added!");
                setNewMakeName('');
                setSelectedCategoryIds(new Set());
            }
            onDataChange(); // Refresh data in parent (SettingsPage)
        } catch (error) {
            toast.error("Failed to save make.");
        }
    };
    
    const handleDeleteMake = (id) => {
        toast((t) => (
            <span>
                Delete this make?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteDoc(doc(db, 'makes', id)).then(() => {
                        toast.success("Make deleted.");
                        onDataChange();
                    }).catch(() => toast.error("Failed to delete."));
                    toast.dismiss(t.id);
                }}>Delete</Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            </span>
        ));
    };

    const handleEditClickMake = (make) => {
        setEditingMakeId(make.id);
        setEditingMakeName(make.name);
        setEditingCategoryIds(new Set(make.categoryIds || []));
    };

    const handleCancelEditMake = () => {
        setEditingMakeId(null);
        setEditingMakeName('');
        setEditingCategoryIds(new Set());
    };

    const handleCategoryToggle = (categoryId, isEditing) => {
        if (isEditing) {
            setEditingCategoryIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(categoryId)) {
                    newSet.delete(categoryId);
                } else {
                    newSet.add(categoryId);
                }
                return newSet;
            });
        } else {
            setSelectedCategoryIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(categoryId)) {
                    newSet.delete(categoryId);
                } else {
                    newSet.add(categoryId);
                }
                return newSet;
            });
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Makes</h3>
            <form onSubmit={handleAddOrUpdateMake} className="space-y-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <Input
                    label="New Make Name"
                    type="text"
                    value={newMakeName}
                    onChange={(e) => setNewMakeName(e.target.value)}
                    placeholder="Enter make name..."
                />
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Link to Categories</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-gray-800 rounded-md">
                        {categories.map(cat => (
                            <label key={cat.id} className="flex items-center space-x-2 text-gray-200">
                                <input
                                    type="checkbox"
                                    checked={selectedCategoryIds.has(cat.id)}
                                    onChange={() => handleCategoryToggle(cat.id, false)}
                                    className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{cat.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <Button type="submit" variant="primary" className="w-full">Add Make</Button>
            </form>
            <div className="space-y-3">
                {items.map(make => (
                    <div key={make.id} className="bg-gray-700 p-3 rounded-lg">
                        {editingMakeId === make.id ? (
                            <div className="space-y-3">
                                <Input
                                    label="Make Name"
                                    value={editingMakeName}
                                    onChange={(e) => setEditingMakeName(e.target.value)}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Update Linked Categories</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-gray-800 rounded-md">
                                        {categories.map(cat => (
                                            <label key={cat.id} className="flex items-center space-x-2 text-gray-200">
                                                <input
                                                    type="checkbox"
                                                    checked={editingCategoryIds.has(cat.id)}
                                                    onChange={() => handleCategoryToggle(cat.id, true)}
                                                    className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>{cat.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <Button onClick={handleCancelEditMake} variant="secondary" size="sm">Cancel</Button>
                                    <Button onClick={handleAddOrUpdateMake} variant="success" size="sm">Save</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-200 font-semibold">{make.name}</p>
                                    <p className="text-xs text-blue-400">
                                        { (make.categoryIds || []).map(id => categories.find(c=>c.id===id)?.name).join(', ') || 'Uncategorized' }
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => handleEditClickMake(make)} variant="secondary" size="sm">Edit</Button>
                                    <Button onClick={() => handleDeleteMake(make.id)} variant="danger" size="sm">Delete</Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MakeManager;
