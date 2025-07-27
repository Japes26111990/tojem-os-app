// src/components/features/settings/ModelManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { getModels, addModel, deleteModel, updateDocument, getMakes } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import toast from 'react-hot-toast';

const ModelManager = () => {
    const [models, setModels] = useState([]);
    const [makes, setMakes] = useState([]);
    const [newModelName, setNewModelName] = useState('');
    const [selectedMakeId, setSelectedMakeId] = useState('');
    const [editingModelId, setEditingModelId] = useState(null);
    const [editingModelName, setEditingModelName] = useState('');

    const fetchData = async () => {
        const [fetchedModels, fetchedMakes] = await Promise.all([getModels(), getMakes()]);
        setModels(fetchedModels);
        setMakes(fetchedMakes);
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        const name = (editingModelId ? editingModelName : newModelName).trim();
        if (!name || !selectedMakeId) {
            return toast.error("Please select a make and enter a model name.");
        }

        try {
            if (editingModelId) {
                // Note: Updating the parent 'make' is not supported via this simple UI to prevent data integrity issues.
                await updateDocument('models', editingModelId, { name });
                toast.success("Model updated!");
                setEditingModelId(null);
                setEditingModelName('');
            } else {
                await addModel(name, selectedMakeId);
                toast.success("Model added!");
                setNewModelName('');
            }
            fetchData();
        } catch (error) {
            toast.error("Failed to save model.");
        }
    };
    
    const handleDelete = (id) => {
        toast((t) => (
            <span>
                Delete this model?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteModel(id).then(() => {
                        toast.success("Model deleted.");
                        fetchData();
                    }).catch(() => toast.error("Failed to delete."));
                    toast.dismiss(t.id);
                }}>Delete</Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            </span>
        ));
    };

    const makeMap = useMemo(() => new Map(makes.map(m => [m.id, m.name])), [makes]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Models/Years</h3>
            <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                <Dropdown
                    label="Parent Make"
                    value={selectedMakeId}
                    onChange={(e) => setSelectedMakeId(e.target.value)}
                    options={makes}
                    placeholder="Select a make..."
                />
                <Input
                    label="New Model/Year Name"
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="e.g., FH Series, 2022..."
                    className="flex-grow"
                />
                <Button type="submit" variant="primary">Add Model</Button>
            </form>
            <div className="space-y-3">
                {models.map(model => (
                    <div key={model.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                        {editingModelId === model.id ? (
                            <Input
                                type="text"
                                value={editingModelName}
                                onChange={(e) => setEditingModelName(e.target.value)}
                                className="flex-grow mr-2"
                                autoFocus
                            />
                        ) : (
                            <div>
                                <p className="text-gray-200">{model.name}</p>
                                <p className="text-xs text-blue-400">{makeMap.get(model.makeId) || 'Unlinked'}</p>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {editingModelId === model.id ? (
                                <>
                                    <Button onClick={handleAddOrUpdate} variant="success" size="sm">Save</Button>
                                    <Button onClick={() => setEditingModelId(null)} variant="secondary" size="sm">Cancel</Button>
                                </>
                            ) : (
                                <>
                                    <Button onClick={() => { setEditingModelId(model.id); setEditingModelName(model.name); setSelectedMakeId(model.makeId); }} variant="secondary" size="sm">Edit</Button>
                                    <Button onClick={() => handleDelete(model.id)} variant="danger" size="sm">Delete</Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ModelManager;
