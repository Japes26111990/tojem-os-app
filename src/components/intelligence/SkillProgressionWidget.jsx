// src/components/intelligence/SkillProgressionWidget.jsx
import React, { useState, useEffect } from 'react';
import { getSkillHistoryForEmployee, getSkills, deleteDocument } from '../../api/firestore';
import Button from '../ui/Button';
import { Trash2 } from 'lucide-react';

const SkillProgressionWidget = ({ employeeId }) => {
    const [skillHistory, setSkillHistory] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [selectedSkillId, setSelectedSkillId] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const [history, skills] = await Promise.all([
                getSkillHistoryForEmployee(employeeId),
                getSkills()
            ]);

            const sortedHistory = history.sort((a, b) => {
                const dateA = a.assessmentDate?.toDate() || 0;
                const dateB = b.assessmentDate?.toDate() || 0;
                return dateB - dateA;
            });

            setSkillHistory(sortedHistory);
            setAllSkills(skills);
            
            if (sortedHistory.length > 0) {
                const skillCounts = sortedHistory.reduce((acc, record) => {
                    acc[record.skillId] = (acc[record.skillId] || 0) + 1;
                    return acc;
                }, {});
                const mostFrequentSkill = Object.keys(skillCounts).sort((a, b) => skillCounts[b] - skillCounts[a])[0];
                setSelectedSkillId(mostFrequentSkill);
            }
        } catch (error) {
            console.error("Error fetching skill progression data:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [employeeId]);

    const handleDeleteHistory = async (recordId) => {
        if (window.confirm("Are you sure you want to permanently delete this history record?")) {
            try {
                await deleteDocument('skillHistory', recordId);
                setSkillHistory(prev => prev.filter(record => record.id !== recordId));
            } catch (error) {
                console.error("Error deleting history record:", error);
            }
        }
    };

    const filteredHistory = skillHistory.filter(record => record.skillId === selectedSkillId);

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Skill Progression Tracker</h3>
            
            {loading ? (
                <p className="text-gray-400">Loading history...</p>
            ) : allSkills.length === 0 || skillHistory.length === 0 ? (
                <p className="text-gray-400">No skill history available for this employee yet.</p>
            ) : (
                <>
                    <div className="mb-4">
                        <label htmlFor="skill-select" className="block text-sm font-medium text-gray-300 mb-1">
                            Select a skill to see its progression:
                        </label>
                        <select
                            id="skill-select"
                            value={selectedSkillId}
                            onChange={(e) => setSelectedSkillId(e.target.value)}
                            className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        >
                            <option value="" disabled>-- Select a Skill --</option>
                            {allSkills
                                .filter(skill => skillHistory.some(h => h.skillId === skill.id))
                                .map(skill => (
                                <option key={skill.id} value={skill.id}>{skill.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        {filteredHistory.length > 0 ? (
                            filteredHistory.map(record => (
                                <div key={record.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-md">
                                    <div className="flex flex-col">
                                        <p className="font-semibold text-blue-400">{record.proficiency}</p>
                                        <p className="text-gray-500 text-xs">
                                            {record.assessmentDate ? new Date(record.assessmentDate.toDate()).toLocaleString() : 'Date unknown'}
                                        </p>
                                    </div>
                                    <Button onClick={() => handleDeleteHistory(record.id)} variant="icon" className="text-red-500 hover:text-red-400">
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400">Please select a skill to view its history.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SkillProgressionWidget;
