// src/components/features/settings/ToolsManager.jsx

import React, { useState, useEffect } from 'react';
import { getTools, addTool, deleteTool, updateDocument, getSkills } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Wrench, PlusCircle, Save, DollarSign, Clock } from 'lucide-react'; // --- CORRECTED: Removed 'Tool' icon ---
import toast from 'react-hot-toast';

const ToolsManager = () => {
    const [tools, setTools] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const initialFormState = {
        name: '',
        hourlyRate: '', 
        capacityMinutesPerDay: '',
        maintenanceIntervalHours: '',
        associatedSkills: [],
    };
    const [formData, setFormData] = useState(initialFormState);
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
            toast.error("Failed to load tools or skills.");
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
        setFormData(initialFormState);
        setEditingToolId(null);
    };

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Tool name is required.");
            return;
        }
        try {
            const filteredAssociatedSkills = (formData.associatedSkills || []).filter(s =>
                s.defaultMinimumProficiency > 0 || s.importanceWeight > 0
            );
            const toolDataToSave = {
                name: formData.name.trim(),
                hourlyRate: Number(formData.hourlyRate) || 0,
                capacityMinutesPerDay: Number(formData.capacityMinutesPerDay) || 0,
                maintenanceIntervalHours: Number(formData.maintenanceIntervalHours) || 0,
                associatedSkills: filteredAssociatedSkills,
            };
            
            if (editingToolId) {
                await updateDocument('tools', editingToolId, toolDataToSave);
                toast.success("Tool updated successfully!");
            } else {
                await addTool(toolDataToSave);
                toast.success("Tool added successfully!");
            }
            resetForm();
            fetchData();
        } catch (error) {
            console.error("Error saving tool:", error);
            toast.error(`Failed to ${editingToolId ? 'update' : 'add'} tool.`);
        }
    };

    const handleEdit = (tool) => {
        setEditingToolId(tool.id);
        setFormData({
            name: tool.name,
            hourlyRate: tool.hourlyRate || '',
            capacityMinutesPerDay: tool.capacityMinutesPerDay || '',
            maintenanceIntervalHours: tool.maintenanceIntervalHours || '',
            associatedSkills: tool.associatedSkills || [],
        });
    };
    
    const handleDelete = (id) => {
        toast((t) => (
            <span>
                Are you sure you want to delete this tool?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteTool(id)
                        .then(() => {
                            toast.success("Tool deleted.");
                            fetchData();
                        })
                        .catch(err => {
                            toast.error("Failed to delete tool.");
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

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Tools, Machine Rates & Capacity</h3>
            <form onSubmit={handleAddOrUpdate} className="space-y-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        <Input
                            label="Hourly Rate (R)"
                            name="hourlyRate"
                            type="number"
                            value={formData.hourlyRate}
                            onChange={handleInputChange}
                            placeholder="e.g., 25.50"
                        />
                    </div>
                    <div>
                        <Input
                            label="Capacity (minutes/day)"
                            name="capacityMinutesPerDay"
                            type="number"
                            value={formData.capacityMinutesPerDay}
                            onChange={handleInputChange}
                            placeholder="e.g., 450 for 8hr day"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <Input
                            label="Maintenance Interval (hours)"
                            name="maintenanceIntervalHours"
                            type="number"
                            value={formData.maintenanceIntervalHours}
                            onChange={handleInputChange}
                            placeholder="e.g., 200"
                        />
                    </div>
                </div>


                {formData.name.trim() && (
                    <div className="border-t border-gray-700 pt-4 mt-4">
                         <h4 className="text-lg font-semibold text-white mb-3">Associated Skills for "{formData.name}"</h4>
                         <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {allSkills.map(skill => {
                                const currentAssociatedSkill = formData.associatedSkills?.find(s => s.skillId === skill.id);
                                const isIncluded = !!currentAssociatedSkill;

                                return (
                                    <div key={skill.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                        <div className="flex items-center gap-3 mb-2">
                                            <input
                                                type="checkbox"
                                                checked={isIncluded}
                                                onChange={(e) => handleToggleSkillAssociation(skill.id, e.target.checked)}
                                                className="h-4 w-4 rounded bg-gray-700 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label className="font-bold text-white flex-grow">{skill.name}</label>
                                        </div>

                                        {isIncluded && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-400 mb-1">Default Min. Proficiency (0-5)</label>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="5"
                                                        step="1"
                                                        value={currentAssociatedSkill.defaultMinimumProficiency || 0}
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
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
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
                        </p>
                        <div className="flex items-center gap-4">
                             {tool.capacityMinutesPerDay > 0 && (
                                <span className="text-xs flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full" title="Daily Capacity">
                                    <Clock size={12}/>
                                    {`${tool.capacityMinutesPerDay} min/day`}
                                </span>
                            )}
                            {tool.hourlyRate > 0 && (
                                <span className="text-xs flex items-center gap-1 bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full" title="Operating Cost">
                                    <DollarSign size={12}/>
                                    {`R${tool.hourlyRate.toFixed(2)}/hr`}
                                </span>
                            )}
                            {tool.maintenanceIntervalHours > 0 && (
                                <span className="text-xs flex items-center gap-1 bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full" title="Maintenance Interval">
                                    {/* --- CORRECTED: Use Wrench icon --- */}
                                    <Wrench size={12}/>
                                    {`${tool.maintenanceIntervalHours} hrs`}
                                </span>
                            )}
                            <div className="flex space-x-2">
                                <Button onClick={() => handleEdit(tool)} variant="secondary" className="py-1 px-3 text-xs">Manage</Button>
                                <Button onClick={() => handleDelete(tool.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ToolsManager;
