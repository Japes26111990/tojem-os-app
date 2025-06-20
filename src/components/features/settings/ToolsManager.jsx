import React, { useState, useEffect } from 'react';
import { getTools, addTool, deleteTool, updateDocument } from '../../../api/firestore'; // updateDocument imported
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const ToolsManager = () => {
    const [tools, setTools] = useState([]);
    const [newToolName, setNewToolName] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingToolId, setEditingToolId] = useState(null); // State to track which tool is being edited

    const fetchTools = async () => {
        setLoading(true);
        const fetchedTools = await getTools(); // Fetches tools from Firestore 
        setTools(fetchedTools);
        setLoading(false);
    };

    useEffect(() => {
        fetchTools();
    }, []);

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!newToolName.trim()) return;

        try {
            if (editingToolId) {
                // If editingToolId is set, update the existing tool
                await updateDocument('tools', editingToolId, { name: newToolName }); // Uses updateDocument for generic update 
                alert("Tool updated successfully!");
            } else {
                // Otherwise, add a new tool
                await addTool(newToolName); // Adds new tool 
                alert("Tool added successfully!");
            }
            setNewToolName(''); // Clear input field
            setEditingToolId(null); // Exit editing mode
            fetchTools(); // Refresh the list of tools
        } catch (error) {
            console.error("Error saving tool:", error);
            alert(`Failed to ${editingToolId ? 'update' : 'add'} tool.`);
        }
    };

    const handleEdit = (tool) => {
        setNewToolName(tool.name); // Pre-fill form with tool's current name
        setEditingToolId(tool.id); // Set the ID of the tool being edited
    };

    const handleCancelEdit = () => {
        setNewToolName(''); // Clear input field
        setEditingToolId(null); // Exit editing mode
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this tool?")) {
            try {
                await deleteTool(id); // Deletes tool 
                alert("Tool deleted successfully!");
                fetchTools(); // Refresh the list
            } catch (error) {
                console.error("Error deleting tool:", error);
                alert("Failed to delete tool.");
            }
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Tools</h3>
            <form onSubmit={handleAddOrUpdate} className="flex items-center space-x-4 mb-6">
                <Input
                    name="toolName"
                    value={newToolName}
                    onChange={(e) => setNewToolName(e.target.value)}
                    placeholder={editingToolId ? "Edit tool name..." : "New tool name..."} // Dynamic placeholder
                    className="flex-grow"
                />
                {editingToolId && ( // Show Cancel button only when in editing mode
                    <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" variant="primary">
                    {editingToolId ? "Update Tool" : "Add Tool"} {/* Dynamic button text */}
                </Button>
            </form>
            <div className="space-y-3">
                {loading ? (
                    <p>Loading tools...</p>
                ) : (
                    (tools || []).map(tool => (
                        <div key={tool.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                            <p className="text-gray-200">{tool.name}</p>
                            <div className="flex space-x-2"> {/* Container for action buttons */}
                                <Button onClick={() => handleEdit(tool)} variant="secondary" className="py-1 px-3 text-xs">
                                    Edit
                                </Button>
                                <Button onClick={() => handleDelete(tool.id)} variant="danger" className="py-1 px-3 text-xs">
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ToolsManager;