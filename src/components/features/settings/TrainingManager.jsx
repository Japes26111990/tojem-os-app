// src/components/features/settings/TrainingManager.jsx (Upgraded with Toasts)

import React, { useState, useEffect } from 'react';
import {
    getSkills,
    getTrainingResources,
    addTrainingResource,
    updateTrainingResource,
    deleteTrainingResource
} from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const TrainingManager = () => {
    const [resources, setResources] = useState([]);
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        skillId: '',
        resourceName: '',
        type: 'Video',
        url: ''
    });

    const resourceTypes = [
        { id: 'Video', name: 'Video' },
        { id: 'Document', name: 'Document' },
        { id: 'External Link', name: 'External Link' }
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedResources, fetchedSkills] = await Promise.all([
                getTrainingResources(),
                getSkills()
            ]);
            setResources(fetchedResources);
            setSkills(fetchedSkills);
        } catch (error) {
            console.error("Error fetching training data:", error);
            toast.error("Could not load training data."); // --- REPLACE ALERT ---
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ skillId: '', resourceName: '', type: 'Video', url: '' });
    };

    const handleEditClick = (resource) => {
        setEditingId(resource.id);
        setFormData({
            skillId: resource.skillId,
            resourceName: resource.resourceName,
            type: resource.type,
            url: resource.url
        });
    };

    const handleDelete = (resourceId) => {
        // --- REPLACE window.confirm ---
        toast((t) => (
            <span>
                Are you sure you want to delete this resource?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteTrainingResource(resourceId)
                        .then(() => {
                            toast.success("Resource deleted.");
                            fetchData();
                        })
                        .catch(err => {
                            toast.error("Failed to delete resource.");
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.skillId || !formData.resourceName.trim() || !formData.url.trim()) {
            return toast.error("Please select a skill and fill in the resource name and URL."); // --- REPLACE ALERT ---
        }

        try {
            if (editingId) {
                await updateTrainingResource(editingId, formData);
                toast.success("Resource updated successfully!"); // --- REPLACE ALERT ---
            } else {
                await addTrainingResource(formData);
                toast.success("Resource added successfully!"); // --- REPLACE ALERT ---
            }
            handleCancelEdit();
            fetchData();
        } catch (error) {
            console.error("Error saving resource:", error);
            toast.error("Failed to save training resource."); // --- REPLACE ALERT ---
        }
    };

    const getSkillName = (skillId) => {
        return skills.find(s => s.id === skillId)?.name || 'Unknown Skill';
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Training Resources</h3>
            
            <form onSubmit={handleSubmit} className="p-4 mb-6 bg-gray-900/50 rounded-lg space-y-4">
                <h4 className="text-lg font-semibold text-white">{editingId ? 'Edit Resource' : 'Add New Resource'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Dropdown label="Associated Skill" name="skillId" value={formData.skillId} onChange={handleInputChange} options={skills} placeholder="Select skill..." required/>
                    <Input label="Resource Name" name="resourceName" value={formData.resourceName} onChange={handleInputChange} placeholder="e.g., Advanced TIG Welding" required/>
                    <Input label="URL" name="url" value={formData.url} onChange={handleInputChange} placeholder="https://..." required/>
                    <Dropdown label="Type" name="type" value={formData.type} onChange={handleInputChange} options={resourceTypes} />
                </div>
                <div className="flex justify-end gap-2">
                    {editingId && <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>}
                    <Button type="submit" variant="primary">
                        {editingId ? <><Edit size={16} className="mr-2"/>Save Changes</> : <><PlusCircle size={16} className="mr-2"/>Add Resource</>}
                    </Button>
                </div>
            </form>

            <div className="space-y-3">
                {loading ? <p className="text-gray-400">Loading...</p> :
                    resources.map(resource => (
                        <div key={resource.id} className="bg-gray-700 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="font-bold text-white">{resource.resourceName}</p>
                                <p className="text-sm text-purple-400 font-semibold">{getSkillName(resource.skillId)}</p>
                                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline break-all">{resource.url}</a>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => handleEditClick(resource)} variant="secondary" size="sm" className="p-2"><Edit size={16}/></Button>
                                <Button onClick={() => handleDelete(resource.id)} variant="danger" size="sm" className="p-2"><Trash2 size={16}/></Button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default TrainingManager;
