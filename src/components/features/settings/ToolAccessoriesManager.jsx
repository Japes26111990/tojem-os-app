import React, { useState, useEffect, useMemo } from 'react';
import { getTools, getToolAccessories, addToolAccessory, deleteToolAccessory, updateDocument } from '../../../api/firestore'; // updateDocument imported
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';

const ToolAccessoriesManager = () => {
    const [tools, setTools] = useState([]);
    const [accessories, setAccessories] = useState([]);
    const [newAccessoryName, setNewAccessoryName] = useState('');
    const [selectedToolId, setSelectedToolId] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingAccessoryId, setEditingAccessoryId] = useState(null); // State to track which accessory is being edited

    const fetchData = async () => {
        setLoading(true);
        const [fetchedTools, fetchedAccessories] = await Promise.all([getTools(), getToolAccessories()]); // Fetches tools  and accessories 
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
            alert("Please select a parent tool and enter an accessory name.");
            return;
        }
        try {
            const dataToSave = { name: newAccessoryName, toolId: selectedToolId };

            if (editingAccessoryId) {
                // If editingAccessoryId is set, update the existing accessory
                await updateDocument('toolAccessories', editingAccessoryId, dataToSave); // Uses updateDocument for generic update 
                alert("Accessory updated successfully!");
            } else {
                // Otherwise, add a new accessory
                await addToolAccessory(dataToSave); // Adds new accessory 
                alert("Accessory added successfully!");
            }
            setNewAccessoryName(''); // Clear input field
            setSelectedToolId(''); // Clear selected tool
            setEditingAccessoryId(null); // Exit editing mode
            fetchData(); // Refresh the list
        } catch (error) {
            console.error("Error saving accessory:", error);
            alert(`Failed to ${editingAccessoryId ? 'update' : 'add'} accessory.`);
        }
    };

    const handleEdit = (accessory) => { // Handler for edit button click
        setNewAccessoryName(accessory.name); // Pre-fill form with accessory's current name
        setSelectedToolId(accessory.toolId); // Pre-fill with parent tool ID
        setEditingAccessoryId(accessory.id); // Set the ID of the accessory being edited
    };

    const handleCancelEdit = () => { // Handler to cancel editing
        setNewAccessoryName(''); // Clear input field
        setSelectedToolId(''); // Clear selected tool
        setEditingAccessoryId(null); // Exit editing mode
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this accessory?")) {
            await deleteToolAccessory(id); // Deletes tool accessory 
            fetchData(); // Refresh the list
        }
    };
    
    // Group accessories by their parent tool for a clean display
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
                    placeholder={editingAccessoryId ? "Edit accessory name..." : "New accessory name..."} // Dynamic placeholder
                />
                {editingAccessoryId && ( // Show Cancel button only when in editing mode
                    <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" variant="primary">
                    {editingAccessoryId ? "Update Accessory" : "Add Accessory"} {/* Dynamic button text */}
                </Button>
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
                                    <div className="flex space-x-2"> {/* Container for action buttons */}
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