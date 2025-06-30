import React, { useState, useEffect, useMemo } from 'react';
import { getTools, getToolAccessories, addToolAccessory, deleteToolAccessory, updateDocument } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const ToolAccessoriesManager = () => {
    const [tools, setTools] = useState([]);
    const [accessories, setAccessories] = useState([]);
    const [newAccessoryName, setNewAccessoryName] = useState('');
    const [selectedToolId, setSelectedToolId] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingAccessoryId, setEditingAccessoryId] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        const [fetchedTools, fetchedAccessories] = await Promise.all([getTools(), getToolAccessories()]);
        setTools(fetchedTools);
        setAccessories(fetchedAccessories);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!newAccessoryName.trim() || !selectedToolId) {
            toast.error("Please select a parent tool and enter an accessory name."); // --- REPLACE ALERT ---
            return;
        }
        try {
            const dataToSave = { name: newAccessoryName, toolId: selectedToolId };

            if (editingAccessoryId) {
                await updateDocument('toolAccessories', editingAccessoryId, dataToSave);
                toast.success("Accessory updated successfully!"); // --- REPLACE ALERT ---
            } else {
                await addToolAccessory(dataToSave);
                toast.success("Accessory added successfully!"); // --- REPLACE ALERT ---
            }
            setNewAccessoryName('');
            setSelectedToolId('');
            setEditingAccessoryId(null);
            fetchData();
        } catch (error) {
            console.error("Error saving accessory:", error);
            toast.error(`Failed to ${editingAccessoryId ? 'update' : 'add'} accessory.`); // --- REPLACE ALERT ---
        }
    };

    const handleEdit = (accessory) => {
        setNewAccessoryName(accessory.name);
        setSelectedToolId(accessory.toolId);
        setEditingAccessoryId(accessory.id);
    };

    const handleCancelEdit = () => {
        setNewAccessoryName('');
        setSelectedToolId('');
        setEditingAccessoryId(null);
    };

    const handleDelete = (id) => {
        // --- REPLACE window.confirm ---
        toast((t) => (
            <span>
                Are you sure you want to delete this accessory?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteToolAccessory(id)
                        .then(() => {
                            toast.success("Accessory deleted.");
                            fetchData();
                        })
                        .catch(err => {
                            toast.error("Failed to delete accessory.");
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
        ), { icon: '⚠️' });
    };
    
    const groupedAccessories = useMemo(() => {
        const groups = {};
        accessories.forEach(acc => {
            if (!groups[acc.toolId]) {
                const tool = tools.find(t => t.id === acc.toolId);
                groups[acc.toolId] = { toolName: tool ? tool.name : 'Unknown Tool', items: [] };
            }
            groups[acc.toolId].items.push(acc);
        });
        return Object.values(groups);
    }, [accessories, tools]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Tool Accessories</h3>
            <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                <Dropdown
                    label="Parent Tool"
                    name="toolId"
                    value={selectedToolId}
                    onChange={(e) => setSelectedToolId(e.target.value)}
                    options={tools}
                    placeholder="Select a tool..."
                />
                <Input
                    label="Accessory Name"
                    name="accessoryName"
                    value={newAccessoryName}
                    onChange={(e) => setNewAccessoryName(e.target.value)}
                    placeholder={editingAccessoryId ? "Edit accessory name..." : "New accessory name..."}
                />
                <div className="flex gap-2">
                    {editingAccessoryId && (
                        <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" variant="primary" className="flex-grow">
                        {editingAccessoryId ? "Update" : "Add"}
                    </Button>
                </div>
            </form>
            <div className="space-y-4 mt-6">
                {loading ? (
                    <p>Loading...</p>
                ) : (groupedAccessories.map(group => (
                    <div key={group.toolName}>
                        <h4 className="font-semibold text-blue-400 border-b border-gray-700 pb-1 mb-2">{group.toolName} Accessories</h4>
                        <ul className="space-y-2">
                            {group.items.map(item => (
                                <li key={item.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm">
                                    <p className="text-gray-200">{item.name}</p>
                                    <div className="flex space-x-2">
                                        <Button onClick={() => handleEdit(item)} variant="secondary" className="py-0.5 px-2 text-xs">
                                            Edit
                                        </Button>
                                        <Button onClick={() => handleDelete(item.id)} variant="danger" className="py-0.5 px-2 text-xs">
                                            Delete
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )))}
            </div>
        </div>
    );
};

export default ToolAccessoriesManager;
