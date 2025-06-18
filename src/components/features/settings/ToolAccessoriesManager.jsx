import React, { useState, useEffect, useMemo } from 'react';
import { getTools, getToolAccessories, addToolAccessory, deleteToolAccessory } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';

const ToolAccessoriesManager = () => {
  const [tools, setTools] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [newAccessoryName, setNewAccessoryName] = useState('');
  const [selectedToolId, setSelectedToolId] = useState('');
  const [loading, setLoading] = useState(true);

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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newAccessoryName.trim() || !selectedToolId) {
      alert("Please select a parent tool and enter an accessory name.");
      return;
    }
    try {
      await addToolAccessory({ name: newAccessoryName, toolId: selectedToolId });
      setNewAccessoryName('');
      fetchData(); // Refresh the list
    } catch (error) {
      console.error("Error adding accessory:", error);
      alert("Failed to add accessory.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this accessory?")) {
      await deleteToolAccessory(id);
      fetchData();
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
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
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
          placeholder="e.g., 5mm HSS Drill Bit"
        />
        <Button type="submit" variant="primary">Add Accessory</Button>
      </form>

      <div className="space-y-4 mt-6">
        {loading ? <p>Loading...</p> : groupedAccessories.map(group => (
          <div key={group.toolName}>
            <h4 className="font-semibold text-blue-400 border-b border-gray-700 pb-1 mb-2">{group.toolName} Accessories</h4>
            <ul className="space-y-2">
                {group.items.map(item => (
                    <li key={item.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg text-sm">
                        <p className="text-gray-200">{item.name}</p>
                        <Button onClick={() => handleDelete(item.id)} variant="danger" className="py-0.5 px-2 text-xs">Delete</Button>
                    </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToolAccessoriesManager;