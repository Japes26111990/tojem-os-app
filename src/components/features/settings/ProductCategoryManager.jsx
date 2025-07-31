// src/components/features/settings/ProductCategoryManager.jsx
import React, { useState, useMemo } from 'react';
import { addDoc, deleteDoc, doc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import toast from 'react-hot-toast';

// This is a generic, reusable component for managing simple or parent-child collections.
const GenericManager = ({ title, collectionName, items, onDataChange, parentCollection, parentName, parentIdField }) => {
    const [newItemName, setNewItemName] = useState('');
    const [editingItemId, setEditingItemId] = useState(null);
    const [editingItemName, setEditingItemName] = useState('');
    const [selectedParentId, setSelectedParentId] = useState('');
    const [editingParentId, setEditingParentId] = useState('');

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        const name = (editingItemId ? editingItemName : newItemName).trim();
        if (!name) return toast.error("Name is required.");
        
        const data = { name };

        if (parentCollection) {
            const parentId = editingItemId ? editingParentId : selectedParentId;
            if (!parentId) return toast.error(`Please select a parent ${parentName}.`);
            data[parentIdField] = parentId;
        }

        try {
            if (editingItemId) {
                await updateDoc(doc(db, collectionName, editingItemId), data);
                toast.success(`${title.slice(7)} updated!`);
                handleCancelEdit();
            } else {
                await addDoc(collection(db, collectionName), data);
                toast.success(`${title.slice(7)} added!`);
                setNewItemName('');
                setSelectedParentId('');
            }
            onDataChange();
        } catch (error) {
            toast.error(`Failed to save ${title.slice(7).toLowerCase()}.`);
        }
    };
    
    const handleDelete = (id) => {
        toast((t) => (
            <span>
                Delete this item?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteDoc(doc(db, collectionName, id)).then(() => {
                        toast.success("Item deleted.");
                        onDataChange();
                    }).catch(() => toast.error("Failed to delete."));
                    toast.dismiss(t.id);
                }}>Delete</Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            </span>
        ));
    };
    
    const parentMap = useMemo(() => {
        if (!parentCollection) return null;
        return new Map(parentCollection.map(p => [p.id, p.name]));
    }, [parentCollection]);

    const handleEditClick = (item) => {
        setEditingItemId(item.id);
        setEditingItemName(item.name);
        if (parentCollection) {
            setEditingParentId(item[parentIdField] || '');
        }
    };
    
    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditingItemName('');
        setEditingParentId('');
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
            <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                {parentCollection && (
                    <Dropdown
                        label={`Parent ${parentName}`}
                        value={selectedParentId}
                        onChange={(e) => setSelectedParentId(e.target.value)}
                        options={parentCollection}
                        placeholder={`Select a ${parentName}...`}
                    />
                )}
                <Input
                    label={`New ${title.slice(7).toLowerCase()} name`}
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter name..."
                    className="flex-grow"
                />
                <Button type="submit" variant="primary">Add {title.slice(7)}</Button>
            </form>
            <div className="space-y-3">
                {items.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                        {editingItemId === item.id ? (
                             <div className="flex-grow flex items-end gap-2">
                                <Input
                                    label="Name"
                                    type="text"
                                    value={editingItemName}
                                    onChange={(e) => setEditingItemName(e.target.value)}
                                    className="flex-grow"
                                    autoFocus
                                />
                                {parentCollection && (
                                    <Dropdown
                                        label={`Parent ${parentName}`}
                                        value={editingParentId}
                                        onChange={(e) => setEditingParentId(e.target.value)}
                                        options={parentCollection}
                                    />
                                )}
                            </div>
                        ) : (
                            <div>
                                <p className="text-gray-200">{item.name}</p>
                                {parentMap && item[parentIdField] && <p className="text-xs text-blue-400">{parentMap.get(item[parentIdField]) || 'Unlinked'}</p>}
                            </div>
                        )}
                        <div className="flex items-center gap-2 ml-4">
                            {editingItemId === item.id ? (
                                <>
                                    <Button onClick={handleAddOrUpdate} variant="success" size="sm">Save</Button>
                                    <Button onClick={handleCancelEdit} variant="secondary" size="sm">Cancel</Button>
                                </>
                            ) : (
                                <>
                                    <Button onClick={() => handleEditClick(item)} variant="secondary" size="sm">Edit</Button>
                                    <Button onClick={() => handleDelete(item.id)} variant="danger" size="sm">Delete</Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Export pre-configured versions of the GenericManager for each use case
export const ProductCategoryManager = ({ items, onDataChange }) => <GenericManager title="Manage Product Categories" collectionName="productCategories" items={items} onDataChange={onDataChange} />;
export const MakeManager = ({ items, categories, onDataChange }) => <GenericManager title="Manage Makes" collectionName="makes" items={items} parentCollection={categories} parentName="Category" parentIdField="categoryIds" onDataChange={onDataChange} />;
export const ModelManager = ({ items, makes, onDataChange }) => <GenericManager title="Manage Models/Years" collectionName="models" items={items} parentCollection={makes} parentName="Make" parentIdField="makeId" onDataChange={onDataChange} />;
export const UnitManager = ({ items, onDataChange }) => <GenericManager title="Manage Units of Measure" collectionName="units" items={items} onDataChange={onDataChange} />;