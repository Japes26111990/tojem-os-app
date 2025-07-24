import React, { useState, useEffect, useMemo } from 'react';
import { 
    getLearningPaths, 
    addLearningPath, 
    updateLearningPath, 
    deleteLearningPath, 
    getSkills 
} from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Book, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LearningPathManager = () => {
    const [paths, setPaths] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPath, setSelectedPath] = useState(null);
    const [newPathName, setNewPathName] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedPaths, fetchedSkills] = await Promise.all([
                getLearningPaths(),
                getSkills()
            ]);
            setPaths(fetchedPaths);
            setAllSkills(fetchedSkills);
        } catch (error) {
            console.error("Error fetching learning path data:", error);
            toast.error("Could not load learning path data.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddPath = async (e) => {
        e.preventDefault();
        if (!newPathName.trim()) return;
        await addLearningPath({ name: newPathName });
        toast.success("Learning Path created.");
        setNewPathName('');
        fetchData();
    };
    
    const handleDeletePath = async (pathId) => {
        toast((t) => (
            <span>
                Delete this Learning Path?
                <Button variant="danger" size="sm" className="ml-2" onClick={async () => {
                    await deleteLearningPath(pathId);
                    toast.success("Learning Path deleted.");
                    setSelectedPath(null);
                    fetchData();
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

    const handleToggleSkillInPath = async (skillId) => {
        if (!selectedPath) return;

        const currentSkillIds = selectedPath.skillIds || [];
        const updatedSkillIds = currentSkillIds.includes(skillId)
            ? currentSkillIds.filter(id => id !== skillId)
            : [...currentSkillIds, skillId];
        
        try {
            await updateLearningPath(selectedPath.id, { skillIds: updatedSkillIds });
            const updatedPath = { ...selectedPath, skillIds: updatedSkillIds };
            setSelectedPath(updatedPath);
            // Also update the main paths list for immediate UI feedback
            setPaths(prevPaths => prevPaths.map(p => p.id === updatedPath.id ? updatedPath : p));
            toast.success("Path updated.");
        } catch (error) {
            toast.error("Failed to update path.");
        }
    };

    const availableSkills = useMemo(() => {
        if (!selectedPath) return allSkills;
        const pathSkillIds = new Set(selectedPath.skillIds || []);
        return allSkills.filter(skill => !pathSkillIds.has(skill.id));
    }, [allSkills, selectedPath]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6">Manage Learning Paths</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: List and Add Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h4 className="font-bold text-lg text-white mb-2">Existing Paths</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {paths.map(path => (
                                <div 
                                    key={path.id}
                                    onClick={() => setSelectedPath(path)}
                                    className={`p-3 rounded-md cursor-pointer transition-colors ${selectedPath?.id === path.id ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    <p className="font-semibold">{path.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <form onSubmit={handleAddPath} className="space-y-3 border-t border-gray-700 pt-6">
                        <h4 className="font-bold text-lg text-white">Add New Path</h4>
                        <Input label="Path Name" value={newPathName} onChange={e => setNewPathName(e.target.value)} placeholder="e.g., Team Leader Track"/>
                        <Button type="submit" variant="primary" className="w-full">Create Path</Button>
                    </form>
                </div>

                {/* Right Column: Editor */}
                <div className="lg:col-span-2">
                    {selectedPath ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xl font-bold text-blue-400">{selectedPath.name}</h4>
                                <Button onClick={() => handleDeletePath(selectedPath.id)} variant="danger" size="sm"><Trash2 size={14} className="mr-1"/>Delete Path</Button>
                            </div>
                            
                            {/* Skills in Path */}
                            <div>
                                <h5 className="font-semibold text-white mb-2">Skills in this Path</h5>
                                <div className="space-y-2">
                                    {(selectedPath.skillIds || []).map(skillId => {
                                        const skill = allSkills.find(s => s.id === skillId);
                                        return (
                                            <div key={skillId} className="flex items-center justify-between bg-gray-700/50 p-2 rounded-md">
                                                <p className="text-gray-200">{skill?.name || 'Unknown Skill'}</p>
                                                <Button onClick={() => handleToggleSkillInPath(skillId)} variant="danger" size="sm" className="p-1 h-7 w-7"><Trash2 size={14}/></Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Add Skills to Path */}
                            <div>
                                <h5 className="font-semibold text-white mb-2 pt-4 border-t border-gray-700">Add Skills</h5>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {availableSkills.map(skill => (
                                         <div key={skill.id} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-md">
                                            <p className="text-gray-300">{skill.name}</p>
                                            <Button onClick={() => handleToggleSkillInPath(skill.id)} variant="secondary" size="sm" className="p-1 h-7 w-7"><PlusCircle size={14}/></Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-gray-900/50 p-6 rounded-xl border-2 border-dashed border-gray-700 text-gray-500">
                           <p>Select a Learning Path to manage its skills.</p>
                       </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LearningPathManager;
