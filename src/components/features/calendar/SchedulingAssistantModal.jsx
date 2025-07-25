// src/components/features/calendar/SchedulingAssistantModal.jsx

import React, { useState, useEffect } from 'react';
import { listenToJobCards, getEmployees, getSkills, getTools } from '../../../api/firestore';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Button from '../../ui/Button';
import { X, Bot, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const SchedulingAssistantModal = ({ onClose, onScheduleComplete }) => {
    const [pendingJobs, setPendingJobs] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [allTools, setAllTools] = useState([]); // <-- NEW: State for tools
    const [loading, setLoading] = useState(true);
    const [isScheduling, setIsScheduling] = useState(false);
    const [schedulePlan, setSchedulePlan] = useState([]);

    useEffect(() => {
        const unsubscribe = listenToJobCards((allJobs) => {
            const unscheduled = allJobs.filter(job => job.status === 'Pending' && !job.scheduledDate);
            setPendingJobs(unscheduled);
        });

        const fetchAdditionalData = async () => {
             try {
                const [employees, skills, tools] = await Promise.all([ // <-- FETCH TOOLS
                    getEmployees(),
                    getSkills(),
                    getTools()
                ]);
                setAllEmployees(employees);
                setAllSkills(skills);
                setAllTools(tools); // <-- SET TOOLS
            } catch (error) {
                console.error("Error fetching data for scheduling:", error);
                toast.error("Failed to load employee/skill/tool data.");
            } finally {
                 setLoading(false);
            }
        };

        fetchAdditionalData();

        return () => unsubscribe();
    }, []);

    const generateSchedule = async () => {
        setIsScheduling(true);
        const workHoursPerDay = 8;
        const workMinutesPerDay = workHoursPerDay * 60;

        const availableEmployees = allEmployees.map(emp => ({ ...emp, skillsMap: new Map(Object.entries(emp.skills || {})) }));
        
        // --- NEW: Track tool availability ---
        const toolAvailability = new Map(allTools.map(tool => [tool.id, {
            freeUntil: new Date(),
            dailyMinutesAssigned: 0,
            capacity: tool.capacityMinutesPerDay || Infinity, // Default to infinite capacity if not set
        }]));

        const employeeAvailability = new Map(availableEmployees.map(emp => [emp.id, {
            freeUntil: new Date(),
            dailyMinutesAssigned: 0,
        }]));
        
        const plan = [];
        const sortedJobs = [...pendingJobs].sort((a, b) => (b.estimatedTime || 0) - (a.estimatedTime || 0));
        let currentDay = new Date();
        currentDay.setHours(9, 0, 0, 0);

        for (const job of sortedJobs) {
            const jobDuration = job.estimatedTime || 60;
            const requiredToolIds = (job.tools || []).map(t => t.id);

            let assignedEmployee = null;
            let proposedStartTime = null;
            let bestEmployeeScore = -Infinity;
            
            for (const emp of availableEmployees) {
                // Employee skill check (same as before)
                let skillMatchScore = 0;
                let meetsAllMinimums = true;
                const requiredSkills = job.requiredSkills || [];
                if (requiredSkills.length > 0) {
                    for (const required of requiredSkills) {
                        const employeeProficiency = emp.skillsMap.get(required.skillId) || 0;
                        if (employeeProficiency < required.minProficiency) {
                            meetsAllMinimums = false;
                            break;
                        }
                        skillMatchScore += employeeProficiency; 
                    }
                } else {
                    meetsAllMinimums = true;
                    skillMatchScore = 1;
                }
                if (!meetsAllMinimums) continue;
                
                // --- NEW: Determine the earliest possible start time based on BOTH employee and tool availability ---
                const empAvailability = employeeAvailability.get(emp.id);
                let potentialStartTime = new Date(Math.max(currentDay.getTime(), empAvailability.freeUntil.getTime()));

                for (const toolId of requiredToolIds) {
                    const toolAvail = toolAvailability.get(toolId);
                    if (toolAvail) {
                        potentialStartTime = new Date(Math.max(potentialStartTime.getTime(), toolAvail.freeUntil.getTime()));
                    }
                }
                // --- END NEW LOGIC ---

                // Adjust for working hours and daily capacity (for both employee and tools)
                potentialStartTime.setSeconds(0,0);
                while (potentialStartTime.getDay() === 0 || potentialStartTime.getDay() === 6) {
                    potentialStartTime.setDate(potentialStartTime.getDate() + 1);
                    potentialStartTime.setHours(9, 0, 0, 0);
                }
                if (potentialStartTime.getHours() < 9 || potentialStartTime.getHours() >= (9 + workHoursPerDay)) {
                    potentialStartTime.setDate(potentialStartTime.getDate() + 1);
                    potentialStartTime.setHours(9, 0, 0, 0);
                }
                
                // Check if both employee and ALL required tools have capacity for this job on the potential start day
                let hasCapacity = empAvailability.dailyMinutesAssigned + jobDuration <= workMinutesPerDay;
                for (const toolId of requiredToolIds) {
                    const toolAvail = toolAvailability.get(toolId);
                    if (toolAvail && (toolAvail.dailyMinutesAssigned + jobDuration > toolAvail.capacity)) {
                        hasCapacity = false;
                        break;
                    }
                }

                if (!hasCapacity) {
                     potentialStartTime.setDate(potentialStartTime.getDate() + 1);
                     potentialStartTime.setHours(9, 0, 0, 0);
                     // Reset daily counters for the next day
                     empAvailability.dailyMinutesAssigned = 0;
                     requiredToolIds.forEach(toolId => {
                         const toolAvail = toolAvailability.get(toolId);
                         if (toolAvail) toolAvail.dailyMinutesAssigned = 0;
                     });
                }

                const timeToFree = (potentialStartTime.getTime() - new Date().getTime()) / (1000 * 60);
                const currentScore = (skillMatchScore * 1000) - timeToFree;

                if (currentScore > bestEmployeeScore) {
                    bestEmployeeScore = currentScore;
                    assignedEmployee = emp;
                    proposedStartTime = potentialStartTime;
                }
            }

            if (assignedEmployee && proposedStartTime) {
                const jobEndTime = new Date(proposedStartTime.getTime() + jobDuration * 60 * 1000);
                
                // Update availability for the assigned employee
                const empAvailability = employeeAvailability.get(assignedEmployee.id);
                empAvailability.freeUntil = jobEndTime;
                empAvailability.dailyMinutesAssigned += jobDuration;

                // --- NEW: Update availability for the used tools ---
                requiredToolIds.forEach(toolId => {
                    const toolAvail = toolAvailability.get(toolId);
                    if (toolAvail) {
                        toolAvail.freeUntil = jobEndTime;
                        toolAvail.dailyMinutesAssigned += jobDuration;
                    }
                });

                plan.push({
                    ...job,
                    proposedDate: proposedStartTime,
                    proposedEmployeeId: assignedEmployee.id,
                    proposedEmployeeName: assignedEmployee.name
                });
            } else {
                plan.push({ ...job, proposedDate: new Date(currentDay), proposedEmployeeId: 'unassigned', proposedEmployeeName: 'Unassigned (No qualified employee/tool found)' });
            }
        }
        setSchedulePlan(plan);
        setIsScheduling(false);
    };

    const commitSchedule = async () => {
        if (schedulePlan.length === 0) return;
        setIsScheduling(true);
        try {
            const batch = writeBatch(db);
            schedulePlan.forEach(job => {
                if(job.proposedEmployeeId !== 'unassigned') {
                    const jobRef = doc(db, 'createdJobCards', job.id);
                    batch.update(jobRef, {
                        scheduledDate: job.proposedDate,
                        employeeId: job.proposedEmployeeId,
                        employeeName: job.proposedEmployeeName
                    });
                }
            });
            await batch.commit();
            onScheduleComplete();
        } catch (error) {
            console.error("Error committing schedule:", error);
            toast.error("Failed to save the schedule. Please try again.");
        } finally {
            setIsScheduling(false);
        }
    };
    
    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl h-[90vh] flex flex-col"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Scheduling Assistant</h2>
                        <p className="text-sm text-gray-400">Auto-schedule pending jobs based on employee skills and tool availability.</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>

                <div className="p-6 flex-grow overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-white">
                            {schedulePlan.length > 0 ? 'Proposed Schedule' : `Found ${pendingJobs.length} Unscheduled Jobs`}
                        </h3>
                        {schedulePlan.length === 0 ? (
                             <Button onClick={generateSchedule} disabled={loading || pendingJobs.length === 0 || isScheduling}>
                                {isScheduling ? <><Clock size={16} className="mr-2 animate-spin"/> Generating...</> : <><Bot size={18} className="mr-2"/>Generate Optimal Schedule</>}
                             </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button onClick={() => setSchedulePlan([])} variant="secondary">Clear</Button>
                                <Button onClick={commitSchedule} variant="primary" disabled={isScheduling}>
                                    {isScheduling ? 'Saving...' : 'Commit Schedule to Calendar'}
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        {loading ? <p>Loading data...</p> : 
                         schedulePlan.length > 0 ? (
                            <ul className="space-y-2">
                                {schedulePlan.map(job => (
                                    <li key={job.id} className="p-3 bg-gray-700 rounded-md text-sm">
                                        <p className="font-bold text-white">{job.partName} <span className="text-xs font-mono text-gray-400">({job.jobId})</span></p>
                                        <p className="text-blue-400">Scheduled for: {job.proposedDate.toLocaleString('en-ZA')} by {job.proposedEmployeeName}</p>
                                    </li>
                                ))}
                            </ul>
                         ) : (
                            <ul className="space-y-2">
                                {pendingJobs.map(job => (
                                    <li key={job.id} className="p-2 bg-gray-700 rounded-md text-sm">
                                        {job.partName} ({job.estimatedTime || 'N/A'} mins)
                                    </li>
                                ))}
                                {pendingJobs.length === 0 && <p className="text-gray-500 text-center">No unscheduled jobs found.</p>}
                            </ul>
                         )
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SchedulingAssistantModal;
