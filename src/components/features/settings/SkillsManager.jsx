import React, { useState, useEffect } from 'react';
// Corrected firestore path
import { getSkills, addSkill, deleteSkill, updateSkill } from '../../../api/firestore'; 
// CORRECTED UI COMPONENT PATHS
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Edit, Trash2, Check, X } from 'lucide-react';

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
            alert("Could not fetch skills.");
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
            setNewSkillName('');
            await fetchSkills(); // Refresh list
        } catch (error) {
            console.error("Error adding skill:", error);
            alert("Failed to add skill.");
        }
    };

    const handleDeleteSkill = async (skillId) => {
        if (window.confirm("Are you sure you want to delete this skill?")) {
            try {
                await deleteSkill(skillId);
                await fetchSkills(); // Refresh list
            } catch (error) {
                console.error("Error deleting skill:", error);
                alert("Failed to delete skill.");
            }
        }
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
            setEditingSkillId(null);
            setEditingSkillName('');
            await fetchSkills(); // Refresh list
        } catch (error) {
            console.error("Error updating skill:", error);
            alert("Failed to update skill.");
        }
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Skills</h3>
            {/* Add Skill Form */}
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

            {/* Skills List */}
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
