// src/components/features/settings/SkillsManager.jsx (Upgraded with Toasts)

import React, { useState, useEffect } from 'react';
import { getSkills, addSkill, deleteSkill, updateSkill } from '../../../api/firestore'; 
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Edit, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const SkillsManager = () => {
    const [skills, setSkills] = useState([]);
    const [newSkillName, setNewSkillName] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingSkillId, setEditingSkillId] = useState(null);
    const [editingSkillName, setEditingSkillName] = useState('');

    const fetchSkills = async () => {
        setLoading(true);
        try {
            const fetchedSkills = await getSkills();
            setSkills(fetchedSkills);
        } catch (error) {
            console.error("Error fetching skills:", error);
            toast.error("Could not fetch skills.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSkills();
    }, []);

    const handleAddSkill = async (e) => {
        e.preventDefault();
        if (!newSkillName.trim()) return;
        try {
            await addSkill(newSkillName.trim());
            toast.success("Skill added.");
            setNewSkillName('');
            await fetchSkills();
        } catch (error) {
            console.error("Error adding skill:", error);
            toast.error("Failed to add skill.");
        }
    };

    const handleDeleteSkill = (skillId) => {
        toast((t) => (
            <span>
                Are you sure you want to delete this skill?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteSkill(skillId)
                        .then(() => {
                            toast.success("Skill deleted.");
                            fetchSkills();
                        })
                        .catch(err => {
                            toast.error("Failed to delete skill.");
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
        ), { icon: 'âš ï¸ ' });
    };

    const handleEditClick = (skill) => {
        setEditingSkillId(skill.id);
        setEditingSkillName(skill.name);
    };

    const handleCancelEdit = () => {
        setEditingSkillId(null);
        setEditingSkillName('');
    };

    const handleUpdateSkill = async (skillId) => {
        if (!editingSkillName.trim()) return;
        try {
            await updateSkill(skillId, { name: editingSkillName.trim() });
            toast.success("Skill updated.");
            setEditingSkillId(null);
            setEditingSkillName('');
            await fetchSkills();
        } catch (error) {
            console.error("Error updating skill:", error);
            toast.error("Failed to update skill.");
        }
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Skills</h3>
            <form onSubmit={handleAddSkill} className="flex items-center gap-4 mb-6">
                <Input
                    type="text"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="New skill name..."
                    className="flex-grow"
                />
                <Button type="submit" variant="primary">Add Skill</Button>
            </form>

            <div className="space-y-3">
                {loading ? (
                    <p className="text-gray-400">Loading skills...</p>
                ) : (
                    skills.map((skill) => (
                        <div key={skill.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-md">
                            {editingSkillId === skill.id ? (
                                <Input
                                    type="text"
                                    value={editingSkillName}
                                    onChange={(e) => setEditingSkillName(e.target.value)}
                                    className="flex-grow mr-2"
                                />
                            ) : (
                                <p className="text-gray-200">{skill.name}</p>
                            )}
                            <div className="flex items-center gap-2">
                                {editingSkillId === skill.id ? (
                                    <>
                                        <Button onClick={() => handleUpdateSkill(skill.id)} variant="icon" className="text-green-500 hover:text-green-400">
                                            <Check size={18} />
                                        </Button>
                                        <Button onClick={handleCancelEdit} variant="icon" className="text-red-500 hover:text-red-400">
                                            <X size={18} />
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button onClick={() => handleEditClick(skill)} variant="secondary" size="sm">
                                            <Edit size={16} className="mr-1" /> Edit
                                        </Button>
                                        <Button onClick={() => handleDeleteSkill(skill.id)} variant="danger" size="sm">
                                            <Trash2 size={16} className="mr-1" /> Delete
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SkillsManager;