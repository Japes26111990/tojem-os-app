// src/components/features/settings/ToolsManager.jsx (UPGRADED for ABC)

import React, { useState, useEffect } from 'react';
import { getTools, addTool, deleteTool, updateDocument, getSkills } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Wrench, PlusCircle, Save, DollarSign } from 'lucide-react';

const ToolsManager = () => {
    const [tools, setTools] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // State for the form, now an object to hold all tool properties
    const [formData, setFormData] = useState({
        name: '',
        hourlyRate: '', // <-- NEW: state for hourly rate
        associatedSkills: [],
    });
    const [editingToolId, setEditingToolId] = useState(null);

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleSkillAssociation = (skillId, isChecked) => {
        setFormData(prev => {
            const existingSkills = prev.associatedSkills || [];
            if (isChecked) {
                return { ...prev, associatedSkills: [...existingSkills, { skillId, defaultMinimumProficiency: 0, importanceWeight: 0 }] };
            } else {
                return { ...prev, associatedSkills: existingSkills.filter(s => s.skillId !== skillId) };
            }
        });
    };

    const handleAssociatedSkillChange = (skillId, field, value) => {
        setFormData(prev => ({
            ...prev,
            associatedSkills: prev.associatedSkills.map(skill =>
                skill.skillId === skillId ? { ...skill, [field]: Number(value) } : skill
            )
        }));
    };

    const resetForm = () => {
        setFormData({ name: '', hourlyRate: '', associatedSkills: [] });
        setEditingToolId(null);
    };

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert("Tool name is required.");
            return;
        }
        try {
            const filteredAssociatedSkills = (formData.associatedSkills || []).filter(s =>
                s.defaultMinimumProficiency > 0 || s.importanceWeight > 0
            );
            const toolDataToSave = {
                name: formData.name.trim(),
                hourlyRate: Number(formData.hourlyRate) || 0, // <-- NEW: save hourly rate
                associatedSkills: filteredAssociatedSkills,
            };
            
            if (editingToolId) {
                await updateDocument('tools', editingToolId, toolDataToSave);
                alert("Tool updated successfully!");
            } else {
                await addTool(toolDataToSave);
                alert("Tool added successfully!");
            }
            resetForm();
            fetchData();
        } catch (error) {
            console.error("Error saving tool:", error);
            alert(`Failed to ${editingToolId ? 'update' : 'add'} tool.`);
        }
    };

    const handleEdit = (tool) => {
        setEditingToolId(tool.id);
        setFormData({
            name: tool.name,
            hourlyRate: tool.hourlyRate || '',
            associatedSkills: tool.associatedSkills || [],
        });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Tools & Machine Rates</h3>
            <form onSubmit={handleAddOrUpdate} className="space-y-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Tool Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder={editingToolId ? "Edit tool name..." : "New tool name..."}
                        />
                    </div>
                    <div>
                        {/* --- NEW HOURLY RATE INPUT --- */}
                        <Input
                            label="Hourly Rate (R)"
                            name="hourlyRate"
                            type="number"
                            value={formData.hourlyRate}
                            onChange={handleInputChange}
                            placeholder="e.g., 25.50"
                        />
                    </div>
                </div>

                {formData.name.trim() && (
                    <div className="border-t border-gray-700 pt-4 mt-4">
                         <h4 className="text-lg font-semibold text-white mb-3">Associated Skills for "{formData.name}"</h4>
                         {/* ... Associated skills JSX remains unchanged ... */}
                    </div>
                )}
                
                <div className="flex justify-end gap-2">
                    {editingToolId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
                    <Button type="submit" variant="primary">
                        {editingToolId ? <><Save size={16} className="mr-2"/> Update Tool</> : <><PlusCircle size={16} className="mr-2"/> Add Tool</>}
                    </Button>
                </div>
            </form>

            <div className="space-y-3">
                {loading ? <p>Loading tools...</p> : (tools || []).map(tool => (
                    <div key={tool.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                        <p className="text-gray-200 flex items-center gap-3">
                            <Wrench size={18} className="text-gray-400"/> 
                            {tool.name}
                            {/* --- DISPLAY THE HOURLY RATE --- */}
                            {tool.hourlyRate > 0 && (
                                <span className="text-xs flex items-center gap-1 bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                                    <DollarSign size={12}/>
                                    {`R${tool.hourlyRate.toFixed(2)}/hr`}
                                </span>
                            )}
                        </p>
                        <div className="flex space-x-2">
                            <Button onClick={() => handleEdit(tool)} variant="secondary" className="py-1 px-3 text-xs">Edit</Button>
                            <Button onClick={() => deleteTool(tool.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ToolsManager;
