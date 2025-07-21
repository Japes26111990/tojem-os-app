// src/components/features/tracking/TrainingModal.jsx (NEW FILE)

import React, { useMemo } from 'react';
import Button from '../../ui/Button';
import { X, GraduationCap, Link as LinkIcon } from 'lucide-react';

const TrainingModal = ({ job, onClose, allSkills, trainingResources }) => {
    
    const trainingSuggestions = useMemo(() => {
        if (!job || !job.requiredSkills || !job.employeeSkills || !allSkills || !trainingResources) {
            return [];
        }

        const allSkillsMap = new Map(allSkills.map(s => [s.id, s.name]));
        
        return job.requiredSkills
            .map(reqSkill => {
                const employeeProficiency = job.employeeSkills[reqSkill.skillId] || 0;
                if (reqSkill.minProficiency > 1 && employeeProficiency < reqSkill.minProficiency) {
                    const relevantResources = trainingResources.filter(res => res.skillId === reqSkill.skillId);
                    return {
                        skillName: allSkillsMap.get(reqSkill.skillId) || 'Unknown Skill',
                        requiredLevel: reqSkill.minProficiency,
                        currentLevel: employeeProficiency,
                        resources: relevantResources,
                    };
                }
                return null;
            })
            .filter(Boolean); // Remove null entries
    }, [job, allSkills, trainingResources]);

    return (
        <div 
            onClick={onClose} 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <GraduationCap className="text-yellow-400" />
                        Training Recommendations
                    </h3>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-gray-400">
                        Based on the requirements for <strong className="text-white">{job.partName}</strong> and the assigned employee's current skill set.
                    </p>
                    {trainingSuggestions.map((suggestion, index) => (
                        <div key={index} className="bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="font-bold text-white">{suggestion.skillName}</h4>
                            <p className="text-xs text-gray-400">
                                Required Proficiency: Level {suggestion.requiredLevel} | Current: Level {suggestion.currentLevel}
                            </p>
                            {suggestion.resources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                                    {suggestion.resources.map(res => (
                                        <a 
                                            key={res.id} 
                                            href={res.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-center text-sm text-blue-400 hover:underline"
                                        >
                                            <LinkIcon size={14} className="mr-2"/>
                                            {res.resourceName} ({res.type})
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                 <div className="p-4 bg-gray-900/50 flex justify-end">
                    <Button onClick={onClose} variant="secondary">Close</Button>
                </div>
            </div>
        </div>
    );
};

export default TrainingModal;
