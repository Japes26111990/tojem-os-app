// src/components/features/settings/UnitManager.jsx
import React, { useState, useEffect } from 'react';
import { addDoc, deleteDoc, doc, updateDoc, collection } from 'firebase/firestore'; // Added collection, doc, updateDoc, deleteDoc
import { db } from '../../../api/firebase'; // Import db
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';
import { getUnits } from '../../../api/firestore'; // Import getUnits

const UnitManager = ({ items, onDataChange }) => { // Removed makes from props
    const [newUnitName, setNewUnitName] = useState('');
    const [editingUnitId, setEditingUnitId] = useState(null);
    const [editingUnitName, setEditingUnitName] = useState('');

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        const name = (editingUnitId ? editingUnitName : newUnitName).trim();
        if (!name) {
            return toast.error("Unit name is required.");
        }

        try {
            if (editingUnitId) {
                await updateDoc(doc(db, 'units', editingUnitId), { name });
                toast.success("Unit updated!");
                setEditingUnitId(null);
                setEditingUnitName('');
            } else {
                await addDoc(collection(db, 'units'), { name }); // Changed to addDoc
                toast.success("Unit added!");
                setNewUnitName('');
            }
            onDataChange(); // Refresh data in parent (SettingsPage)
        } catch (error) {
            toast.error("Failed to save unit.");
        }
    };
    
    const handleDelete = (id) => {
        toast((t) => (
            <span>
                Delete this unit?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteDoc(doc(db, 'units', id)).then(() => {
                        toast.success("Unit deleted.");
                        onDataChange();
                    }).catch(() => toast.error("Failed to delete."));
                    toast.dismiss(t.id);
                }}>Delete</Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            </span>
        ));
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Units of Measure</h3>
            <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                <Input
                    label="New Unit Name"
                    type="text"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="e.g., each, kg, box..."
                    className="flex-grow"
                />
                <Button type="submit" variant="primary">Add Unit</Button>
            </form>
            <div className="space-y-3">
                {items.map(unit => (
                    <div key={unit.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                        {editingUnitId === unit.id ? (
                            <Input
                                type="text"
                                value={editingUnitName}
                                onChange={(e) => setEditingUnitName(e.target.value)}
                                className="flex-grow mr-2"
                                autoFocus
                            />
                        ) : (
                            <div>
                                <p className="text-gray-200">{unit.name}</p>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {editingUnitId === unit.id ? (
                                <>
                                    <Button onClick={handleAddOrUpdate} variant="success" size="sm">Save</Button>
                                    <Button onClick={() => setEditingUnitId(null)} variant="secondary" size="sm">Cancel</Button>
                                </>
                            ) : (
                                <>
                                    <Button onClick={() => { setEditingUnitId(unit.id); setEditingUnitName(unit.name); }} variant="secondary" size="sm">Edit</Button>
                                    <Button onClick={() => handleDelete(unit.id)} variant="danger" size="sm">Delete</Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UnitManager;
