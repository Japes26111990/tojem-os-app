import React, { useState, useEffect } from 'react';
import { getTools, addTool, deleteTool } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const ToolsManager = () => {
  const [tools, setTools] = useState([]);
  const [newToolName, setNewToolName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTools = async () => {
    setLoading(true);
    const fetchedTools = await getTools();
    setTools(fetchedTools);
    setLoading(false);
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newToolName.trim()) return;
    try {
      await addTool(newToolName);
      setNewToolName('');
      fetchTools();
    } catch (error) {
      console.error("Error adding tool:", error);
      alert("Failed to add tool.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this tool?")) {
      try {
        await deleteTool(id);
        fetchTools();
      } catch (error) {
        console.error("Error deleting tool:", error);
        alert("Failed to delete tool.");
      }
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Tools</h3>
      <form onSubmit={handleAdd} className="flex items-center space-x-4 mb-6">
        <Input
          name="newTool"
          value={newToolName}
          onChange={(e) => setNewToolName(e.target.value)}
          placeholder="New tool name..."
          className="flex-grow"
        />
        <Button type="submit" variant="primary">Add Tool</Button>
      </form>
      <div className="space-y-3">
        {/* --- FIX APPLIED HERE --- */}
        {loading ? <p>Loading tools...</p> : (tools || []).map(tool => (
          <div key={tool.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-200">{tool.name}</p>
            <Button onClick={() => handleDelete(tool.id)} variant="danger" className="py-1 px-3 text-xs">
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolsManager;