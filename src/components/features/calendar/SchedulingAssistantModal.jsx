// src/components/features/calendar/SchedulingAssistantModal.jsx (Fully Expanded & Corrected)

import React, { useState, useEffect } from 'react';
import { listenToJobCards, getEmployees, getSkills, getDepartmentSkills } from '../../../api/firestore';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Button from '../../ui/Button';
import { X, Bot, Clock } from 'lucide-react';

const SchedulingAssistantModal = ({ onClose, onScheduleComplete }) => {
    const [pendingJobs, setPendingJobs] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
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
                const [employees, skills] = await Promise.all([
                    getEmployees(),
                    getSkills()
                ]);
                setAllEmployees(employees);
                setAllSkills(skills);
            } catch (error) {
                console.error("Error fetching employees or skills for scheduling:", error);
                alert("Failed to load employee/skill data for scheduling.");
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

        const availableEmployees = allEmployees.map(emp => ({
            ...emp,
            skillsMap: new Map(Object.entries(emp.skills || {})),
        }));

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

            let assignedEmployee = null;
            let proposedStartTime = null;
            let bestEmployeeScore = -1;
            
            const requiredSkills = job.requiredSkills || [];

            for (const emp of availableEmployees) {
                let skillMatchScore = 0;
                let meetsAllMinimums = true;

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

                if (!meetsAllMinimums) {
                    continue;
                }
                
                const empAvailability = employeeAvailability.get(emp.id);
                let currentEmpTime = new Date(Math.max(currentDay.getTime(), empAvailability.freeUntil.getTime()));
                currentEmpTime.setSeconds(0,0);
                while (currentEmpTime.getDay() === 0 || currentEmpTime.getDay() === 6) {
                    currentEmpTime.setDate(currentEmpTime.getDate() + 1);
                    currentEmpTime.setHours(9, 0, 0, 0);
                    empAvailability.dailyMinutesAssigned = 0;
                }
                if (currentEmpTime.getHours() < 9 || currentEmpTime.getHours() >= (9 + workHoursPerDay)) {
                    currentEmpTime.setDate(currentEmpTime.getDate() + 1);
                    currentEmpTime.setHours(9, 0, 0, 0);
                    empAvailability.dailyMinutesAssigned = 0;
                }
                if (empAvailability.dailyMinutesAssigned + jobDuration > workMinutesPerDay) {
                     currentEmpTime.setDate(currentEmpTime.getDate() + 1);
                     currentEmpTime.setHours(9, 0, 0, 0);
                     empAvailability.dailyMinutesAssigned = 0;
                     while (currentEmpTime.getDay() === 0 || currentEmpTime.getDay() === 6) {
                        currentEmpTime.setDate(currentEmpTime.getDate() + 1);
                        currentEmpTime.setHours(9, 0, 0, 0);
                     }
                }

                const timeToFree = (currentEmpTime.getTime() - new Date().getTime()) / (1000 * 60);
                const currentScore = (skillMatchScore * 1000) - timeToFree;

                if (currentScore > bestEmployeeScore) {
                    bestEmployeeScore = currentScore;
                    assignedEmployee = emp;
                    proposedStartTime = currentEmpTime;
                }
            }

            if (assignedEmployee && proposedStartTime) {
                const empAvailability = employeeAvailability.get(assignedEmployee.id);
                const jobEndTime = new Date(proposedStartTime.getTime() + jobDuration * 60 * 1000);
                empAvailability.freeUntil = jobEndTime;
                empAvailability.dailyMinutesAssigned += jobDuration;
                plan.push({
                    ...job,
                    proposedDate: proposedStartTime,
                    proposedEmployeeId: assignedEmployee.id,
                    proposedEmployeeName: assignedEmployee.name
                });
            } else {
                plan.push({ ...job, proposedDate: new Date(currentDay), proposedEmployeeId: 'unassigned', proposedEmployeeName: 'Unassigned (No qualified employee found)' });
                currentDay.setDate(currentDay.getDate() + 1);
                currentDay.setHours(9, 0, 0, 0);
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
            alert("Failed to save the schedule. Please try again.");
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
                        <p className="text-sm text-gray-400">Auto-schedule pending jobs based on employee skills and availability.</p>
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
                        {loading ? <p>Loading pending jobs, employees, and skills...</p> : 
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
