// FILE: src/components/features/settings/ToolsManager.jsx

import React, { useState, useEffect } from 'react';
import { getTools, addTool, deleteTool, updateDocument, getSkills } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Wrench, PlusCircle, Save } from 'lucide-react';

const ToolsManager = () => {
    const [tools, setTools] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [newToolName, setNewToolName] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingToolId, setEditingToolId] = useState(null);
    const [associatedSkills, setAssociatedSkills] = useState([]); // Array of { skillId, defaultMinimumProficiency, importanceWeight }

    const getProficiencyLabel = (level) => {
        switch (level) {
            case 0: return 'Not Applicable / No Minimum';
            case 1: return 'Beginner (1)';
            case 2: return 'Basic (2)';
            case 3: return 'Intermediate (3)';
            case 4: return 'Advanced (4)';
            case 5: return 'Expert (5)';
            default: return 'N/A';
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedTools, fetchedSkills] = await Promise.all([getTools(), getSkills()]);
            setTools(fetchedTools);
            setAllSkills(fetchedSkills);
        } catch (error) {
            console.error("Error fetching data for Tools Manager:", error);
            alert("Failed to load tools or skills.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // NEW: Dedicated function for toggling skill association
    const handleToggleSkillAssociation = (skillId, isChecked) => {
        setAssociatedSkills(prevSkills => {
            if (isChecked) {
                // Add skill with default values if checked
                return [...prevSkills, { skillId, defaultMinimumProficiency: 0, importanceWeight: 0 }];
            } else {
                // Remove skill if unchecked
                return prevSkills.filter(s => s.skillId !== skillId);
            }
        });
    };

    // MODIFIED: handleAssociatedSkillChange now only updates properties of an *existing* associated skill
    const handleAssociatedSkillChange = (skillId, field, value) => {
        setAssociatedSkills(prevSkills =>
            prevSkills.map(skill =>
                skill.skillId === skillId ? { ...skill, [field]: Number(value) } : skill
            )
        );
    };

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!newToolName.trim()) {
            alert("Tool name is required.");
            return;
        }
        try {
            const filteredAssociatedSkills = associatedSkills.filter(s =>
                s.defaultMinimumProficiency > 0 || s.importanceWeight > 0
            );

            const toolDataToSave = {
                name: newToolName.trim(),
                associatedSkills: filteredAssociatedSkills,
            };

            if (editingToolId) {
                await updateDocument('tools', editingToolId, toolDataToSave);
                alert("Tool updated successfully!");
            } else {
                await addTool(toolDataToSave);
                alert("Tool added successfully!");
            }
            setNewToolName('');
            setAssociatedSkills([]);
            setEditingToolId(null);
            fetchData();
        } catch (error) {
            console.error("Error saving tool:", error);
            alert(`Failed to ${editingToolId ? 'update' : 'add'} tool.`);
        }
    };

    const handleEdit = (tool) => {
        setNewToolName(tool.name);
        setEditingToolId(tool.id);
        setAssociatedSkills(tool.associatedSkills || []);
    };

    const handleCancelEdit = () => {
        setNewToolName('');
        setAssociatedSkills([]);
        setEditingToolId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this tool?")) {
            try {
                await deleteTool(id);
                alert("Tool deleted successfully!");
                fetchData();
            } catch (error) {
                console.error("Error deleting tool:", error);
                alert("Failed to delete tool.");
            }
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Tools</h3>
            <form onSubmit={handleAddOrUpdate} className="space-y-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <div className="flex items-center space-x-4">
                    <Input
                        name="toolName"
                        value={newToolName}
                        onChange={(e) => setNewToolName(e.target.value)}
                        placeholder={editingToolId ? "Edit tool name..." : "New tool name..."}
                        className="flex-grow"
                    />
                    {editingToolId && (
                        <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" variant="primary">
                        {editingToolId ? <><Save size={16} className="mr-2"/> Update Tool</> : <><PlusCircle size={16} className="mr-2"/> Add Tool</>}
                    </Button>
                </div>

                {/* Associated Skills Section */}
                {newToolName.trim() && (
                    <div className="border-t border-gray-700 pt-4 mt-4">
                        <h4 className="text-lg font-semibold text-white mb-3">Associated Skills for "{newToolName}"</h4>
                        <p className="text-sm text-gray-400 mb-4">
                            Define skills typically required to use this tool, along with a default minimum proficiency and importance.
                        </p>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {allSkills.map(skill => {
                                // NEW: Check if the skillId exists in the associatedSkills array
                                const currentAssociatedSkill = associatedSkills.find(s => s.skillId === skill.id);
                                const isIncluded = !!currentAssociatedSkill; // True if found, false otherwise

                                return (
                                    <div key={skill.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                        <div className="flex items-center gap-3 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={isIncluded} // Bind to isIncluded
                                                onChange={(e) => handleToggleSkillAssociation(skill.id, e.target.checked)} // New handler
                                                className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label className="font-bold text-white flex-grow">{skill.name}</label>
                                        </div>

                                        {isIncluded && ( // Only show inputs if skill is included
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-1">Default Min. Proficiency (0-5)</label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="5"
                                                        step="1"
                                                        value={currentAssociatedSkill.defaultMinimumProficiency || 0} // Use currentAssociatedSkill directly
                                                        onChange={(e) => handleAssociatedSkillChange(skill.id, 'defaultMinimumProficiency', e.target.value)}
                                                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg accent-blue-600"
                                                    />
                                                    <p className="text-center text-sm text-gray-400 mt-1">
                                                        {getProficiencyLabel(currentAssociatedSkill.defaultMinimumProficiency || 0)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Input
                                                        label="Importance Weight (0-10)"
                                                        type="number"
                                                        min="0"
                                                        max="10"
                                                        value={currentAssociatedSkill.importanceWeight || 0}
                                                        onChange={(e) => handleAssociatedSkillChange(skill.id, 'importanceWeight', e.target.value)}
                                                        placeholder="e.g., 5"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Higher value = more critical skill for this tool.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </form>
            <div className="space-y-3">
                {loading ? (
                    <p>Loading tools...</p>
                ) : (
                    (tools || []).map(tool => (
                        <div key={tool.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                            <p className="text-gray-200 flex items-center gap-2">
                                <Wrench size={18} className="text-gray-400"/> {tool.name}
                                {tool.associatedSkills?.length > 0 && (
                                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                        {tool.associatedSkills.length} Associated Skill(s)
                                    </span>
                                )}
                            </p>
                            <div className="flex space-x-2">
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