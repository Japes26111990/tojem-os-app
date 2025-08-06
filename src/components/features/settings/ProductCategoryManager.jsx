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
    
    // State for both single (string) and multi-select (array)
    const [selectedParentId, setSelectedParentId] = useState('');
    const [selectedParentIds, setSelectedParentIds] = useState([]);
    const [editingParentId, setEditingParentId] = useState('');
    const [editingParentIds, setEditingParentIds] = useState([]);

    // Determine if this manager should use multi-select based on the field name
    const isMultiSelect = parentIdField === 'categoryIds';

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        const name = (editingItemId ? editingItemName : newItemName).trim();
        if (!name) return toast.error("Name is required.");
        
        const data = { name };

        if (parentCollection) {
            if (isMultiSelect) {
                const parentIds = editingItemId ? editingParentIds : selectedParentIds;
                if (parentCollection.length > 0 && parentIds.length === 0) {
                     return toast.error(`Please select at least one parent ${parentName}.`);
                }
                data[parentIdField] = parentIds;
            } else {
                const parentId = editingItemId ? editingParentId : selectedParentId;
                if (!parentId) return toast.error(`Please select a parent ${parentName}.`);
                data[parentIdField] = parentId;
            }
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
                setSelectedParentIds([]);
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
            if (isMultiSelect) {
                const parentIds = item[parentIdField];
                setEditingParentIds(Array.isArray(parentIds) ? parentIds : []);
            } else {
                setEditingParentId(item[parentIdField] || '');
            }
        }
    };
    
    const handleCancelEdit = () => {
        setEditingItemId(null);
        setEditingItemName('');
        setEditingParentIds([]);
        setEditingParentId('');
    };

    const handleParentSelectionChange = (parentId, isSelected, isEditing) => {
        const stateSetter = isEditing ? setEditingParentIds : setSelectedParentIds;
        stateSetter(prevIds => {
            const currentIds = Array.isArray(prevIds) ? prevIds : [];
            if (isSelected) {
                return [...currentIds, parentId];
            } else {
                return currentIds.filter(id => id !== parentId);
            }
        });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
            <form onSubmit={handleAddOrUpdate} className="space-y-4 mb-6">
                <Input
                    label={`New ${title.slice(7).toLowerCase()} name`}
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter name..."
                    className="flex-grow"
                    disabled={!!editingItemId}
                />
                {parentCollection && parentCollection.length > 0 && (
                    isMultiSelect ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Parent {parentName}(s)</label>
                            <div className="max-h-32 overflow-y-auto bg-gray-900/50 p-3 rounded-lg space-y-2">
                                {parentCollection.map(parent => (
                                    <label key={parent.id} className="flex items-center gap-2 text-gray-200">
                                        <input
                                            type="checkbox"
                                            checked={selectedParentIds.includes(parent.id)}
                                            onChange={(e) => handleParentSelectionChange(parent.id, e.target.checked, false)}
                                            className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                            disabled={!!editingItemId}
                                        />
                                        {parent.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Dropdown
                            label={`Parent ${parentName}`}
                            value={selectedParentId}
                            onChange={(e) => setSelectedParentId(e.target.value)}
                            options={parentCollection}
                            placeholder={`Select a ${parentName}...`}
                            disabled={!!editingItemId}
                        />
                    )
                )}
                <Button type="submit" variant="primary" disabled={!!editingItemId}>Add {title.slice(7)}</Button>
            </form>
            <div className="space-y-3">
                {items.map(item => (
                    <div key={item.id} className="bg-gray-700 p-3 rounded-lg">
                        {editingItemId === item.id ? (
                             <div className="space-y-3">
                                <Input
                                    label="Name"
                                    type="text"
                                    value={editingItemName}
                                    onChange={(e) => setEditingItemName(e.target.value)}
                                    autoFocus
                                />
                                {parentCollection && parentCollection.length > 0 && (
                                     isMultiSelect ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">Parent {parentName}(s)</label>
                                            <div className="max-h-32 overflow-y-auto bg-gray-900/50 p-3 rounded-lg space-y-2">
                                                {parentCollection.map(parent => (
                                                    <label key={parent.id} className="flex items-center gap-2 text-gray-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={editingParentIds.includes(parent.id)}
                                                            onChange={(e) => handleParentSelectionChange(parent.id, e.target.checked, true)}
                                                            className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        {parent.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                     ) : (
                                        <Dropdown
                                            label={`Parent ${parentName}`}
                                            value={editingParentId}
                                            onChange={(e) => setEditingParentId(e.target.value)}
                                            options={parentCollection}
                                        />
                                     )
                                )}
                                <div className="flex items-center gap-2 justify-end">
                                    <Button onClick={() => handleAddOrUpdate({ preventDefault: () => {} })} variant="success" size="sm">Save</Button>
                                    <Button onClick={handleCancelEdit} variant="secondary" size="sm">Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-200">{item.name}</p>
                                    {parentMap && (
                                        <p className="text-xs text-blue-400">
                                            {isMultiSelect 
                                                ? (Array.isArray(item[parentIdField]) ? item[parentIdField] : []).map(id => parentMap.get(id) || 'Unlinked').join(', ')
                                                : parentMap.get(item[parentIdField]) || 'Unlinked'
                                            }
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <Button onClick={() => handleEditClick(item)} variant="secondary" size="sm">Edit</Button>
                                    <Button onClick={() => handleDelete(item.id)} variant="danger" size="sm">Delete</Button>
                                </div>
                            </div>
                        )}
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
