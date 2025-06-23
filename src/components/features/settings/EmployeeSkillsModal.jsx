import React, { useState, useEffect } from 'react';
// 1. IMPORT THE CORRECT, NEW FUNCTION NAME
import { getSkills, getEmployeeSkills, updateEmployeeSkillsAndLogHistory } from '../../../api/firestore';
import Button from '../../ui/Button';
import { X } from 'lucide-react';

const EmployeeSkillsModal = ({ employee, onClose }) => {
    const [allSkills, setAllSkills] = useState([]);
    const [employeeSkills, setEmployeeSkills] = useState({});
    const [loading, setLoading] = useState(true);

    const proficiencyLevels = ['Not Acquired', 'Beginner', 'Intermediate', 'Expert'];

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [fetchedSkills, currentSkills] = await Promise.all([
                    getSkills(),
                    getEmployeeSkills(employee.id)
                ]);
                setAllSkills(fetchedSkills);
                setEmployeeSkills(currentSkills || {});
            } catch (error) {
                console.error("Error fetching skills data:", error);
                alert("Failed to load skills data for this employee.");
            }
            setLoading(false);
        };

        if (employee) {
            fetchAllData();
        }
    }, [employee]);

    const handleProficiencyChange = (skillId, newProficiency) => {
        setEmployeeSkills(prevSkills => {
            const updatedSkills = { ...prevSkills };
            if (newProficiency === 'Not Acquired') {
                delete updatedSkills[skillId];
            } else {
                updatedSkills[skillId] = newProficiency;
            }
            return updatedSkills;
        });
    };

    const handleSaveChanges = async () => {
        try {
            // 2. CALL THE NEW FUNCTION WITH THE CORRECT ARGUMENTS
            await updateEmployeeSkillsAndLogHistory(employee, employeeSkills, allSkills);
            alert(`Successfully updated skills for ${employee.name}.`);
            onClose();
        } catch (error) {
            console.error("Error saving employee skills:", error);
            alert("Failed to save skills. Please try again.");
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
                    <Button onClick={onClose} variant="icon" className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </Button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <p className="text-gray-300">Loading skills...</p>
                    ) : (
                        allSkills.map(skill => (
                            <div key={skill.id} className="grid grid-cols-2 items-center gap-4">
                                <label className="text-gray-200" htmlFor={`skill-${skill.id}`}>{skill.name}</label>
                                <select
                                    id={`skill-${skill.id}`}
                                    value={employeeSkills[skill.id] || 'Not Acquired'}
                                    onChange={(e) => handleProficiencyChange(skill.id, e.target.value)}
                                    className="bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                >
                                    {proficiencyLevels.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </div>
                        ))
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