// src/components/features/settings/EmployeeSkillsModal.jsx (Upgraded with Toasts)

import React, { useState, useEffect } from 'react';
import { getSkills, getEmployeeSkills, updateEmployeeSkillsAndLogHistory, getSkillHistoryForEmployee } from '../../../api/firestore';
import Button from '../../ui/Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const EmployeeSkillsModal = ({ employee, onClose }) => {
    const [allSkills, setAllSkills] = useState([]);
    const [employeeSkills, setEmployeeSkills] = useState({});
    const [skillHistory, setSkillHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const getProficiencyLabel = (level) => {
        switch (level) {
            case 0: return 'Not Acquired';
            case 1: return 'Beginner';
            case 2: return 'Basic';
            case 3: return 'Intermediate';
            case 4: return 'Advanced';
            case 5: return 'Expert';
            default: return 'N/A';
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [fetchedSkills, currentSkills, fetchedHistory] = await Promise.all([
                getSkills(),
                getEmployeeSkills(employee.id),
                getSkillHistoryForEmployee(employee.id)
            ]);
            setAllSkills(fetchedSkills);
            setEmployeeSkills(currentSkills || {});
            setSkillHistory(fetchedHistory.sort((a,b) => b.assessmentDate.toDate() - a.assessmentDate.toDate()));
        } catch (error) {
            console.error("Error fetching skills data:", error);
            toast.error("Failed to load skills data for this employee."); // --- REPLACE ALERT ---
        }
        setLoading(false);
    };

    useEffect(() => {
        if (employee) {
            fetchAllData();
        }
    }, [employee]);

    const handleProficiencyChange = (skillId, newProficiencyValue) => {
        setEmployeeSkills(prevSkills => {
            const updatedSkills = { ...prevSkills };
            const numericValue = Number(newProficiencyValue);

            if (numericValue === 0) {
                delete updatedSkills[skillId];
            } else {
                updatedSkills[skillId] = numericValue;
            }
            return updatedSkills;
        });
    };

    const handleSaveChanges = async () => {
        try {
            await updateEmployeeSkillsAndLogHistory(employee, employeeSkills, allSkills);
            toast.success(`Successfully updated skills for ${employee.name}.`); // --- REPLACE ALERT ---
            onClose();
        } catch (error) {
            console.error("Error saving employee skills:", error);
            toast.error("Failed to save skills. Please try again."); // --- REPLACE ALERT ---
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 w-full max-w-lg rounded-xl shadow-lg border border-gray-700 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-600">
                    <h3 className="text-xl font-bold text-white">Manage Skills for {employee.name}</h3>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={24} />
                    </Button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <p className="text-gray-300">Loading skills...</p>
                    ) : (
                        <>
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-3">Current Skill Ratings (0-5)</h4>
                                <p className="text-sm text-gray-400 mb-4">
                                    Rate proficiency from 0 (Not Acquired) to 5 (Expert).
                                    Skills rated 0 will not be saved.
                                </p>
                                <div className="space-y-4">
                                    {allSkills.map(skill => (
                                        <div key={skill.id} className="grid grid-cols-2 items-center gap-4">
                                            <label className="text-gray-200" htmlFor={`skill-${skill.id}`}>{skill.name}</label>
                                            <div>
                                                <input
                                                    id={`skill-${skill.id}`}
                                                    type="range"
                                                    min="0"
                                                    max="5"
                                                    step="1"
                                                    value={employeeSkills[skill.id] || 0}
                                                    onChange={(e) => handleProficiencyChange(skill.id, e.target.value)}
                                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-lg accent-blue-600"
                                                />
                                                <p className="text-center text-sm text-gray-400 mt-1">
                                                    {getProficiencyLabel(employeeSkills[skill.id] || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 border-t border-gray-700 pt-6">
                                <h4 className="text-lg font-semibold text-white mb-3">Skill Assessment History</h4>
                                {skillHistory.length > 0 ? (
                                    <ul className="space-y-2">
                                        {skillHistory.map(record => (
                                            <li key={record.id} className="bg-gray-700/50 p-3 rounded-lg text-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-white">{record.skillName}: {getProficiencyLabel(record.proficiency)}</p>
                                                    <p className="text-gray-400 text-xs">
                                                        Assessed: {record.assessmentDate ? new Date(record.assessmentDate.toDate()).toLocaleDateString('en-ZA') : 'N/A'}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-400 text-sm">No skill assessment history for this employee.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end items-center p-4 border-t border-gray-600 bg-gray-800/50 rounded-b-xl">
                    <Button onClick={onClose} variant="secondary" className="mr-2">Cancel</Button>
                    <Button onClick={handleSaveChanges} variant="primary">Save Changes</Button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeSkillsModal;
