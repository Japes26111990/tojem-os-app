// src/components/features/kanban/KanbanBoard.jsx (UPDATED with Optimistic UI)
// The onDragEnd handler has been significantly improved to provide a smooth,
// instantaneous user experience by manually updating the local state immediately
// after a drag, preventing the "jumping" effect caused by Firestore latency.

import React, { useMemo, useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { logScanEvent } from '../../../api/firestore';
import toast from 'react-hot-toast';
import { GripVertical, GraduationCap } from 'lucide-react';
import { JOB_STATUSES } from '../../../config'; // Import JOB_STATUSES

const JobCard = ({ job, index }) => {
    const isTrainingRecommended = useMemo(() => {
        if (!job.requiredSkills || !job.employeeSkills) return false;
        return job.requiredSkills.some(reqSkill => {
            const employeeProficiency = job.employeeSkills[reqSkill.skillId] || 0;
            return reqSkill.minProficiency > 1 && employeeProficiency < reqSkill.minProficiency;
        });
    }, [job.requiredSkills, job.employeeSkills]);

    return (
        <Draggable draggableId={job.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`p-3 rounded-lg bg-gray-700 border border-gray-600 shadow-md mb-3 transition-all ${snapshot.isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}
                >
                    <div className="flex items-start gap-2">
                        <GripVertical className="text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-white text-sm">{job.partName}</p>
                            <p className="text-xs text-gray-400 font-mono">{job.jobId}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-blue-400">{job.employeeName || 'Unassigned'}</p>
                                {isTrainingRecommended && (
                                    <span title="Training recommended for this job">
                                        <GraduationCap size={16} className="text-yellow-400" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const KanbanColumn = ({ status, jobs }) => {
    const statusConfig = {
        [JOB_STATUSES.PENDING]: { title: 'Pending', color: 'border-t-yellow-400' },
        [JOB_STATUSES.IN_PROGRESS]: { title: 'In Progress', color: 'border-t-blue-400' },
        [JOB_STATUSES.AWAITING_QC]: { title: 'Awaiting QC', color: 'border-t-purple-400' },
    };
    const config = statusConfig[status];

    return (
        <div className={`bg-gray-800/50 rounded-xl p-4 w-full md:w-1/3 border-t-4 ${config.color}`}>
            <h3 className="font-bold text-white mb-4">{config.title} ({jobs.length})</h3>
            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[400px] transition-colors rounded-lg ${snapshot.isDraggingOver ? 'bg-blue-900/20' : ''}`}
                    >
                        {jobs.map((job, index) => (
                            <JobCard 
                                key={job.id} 
                                job={job} 
                                index={index} 
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

const KanbanBoard = ({ jobs, employees }) => {
    // --- NEW: Local state to manage the jobs for a smooth UI ---
    const [localJobs, setLocalJobs] = useState(jobs);

    // When the jobs from props change (from Firestore), update our local state
    useEffect(() => {
        const employeesMap = new Map(employees.map(e => [e.id, e]));
        const enrichedJobs = jobs.map(job => {
            const employee = employeesMap.get(job.employeeId);
            return {
                ...job,
                employeeSkills: employee ? employee.skills : {},
                employeeName: employee ? employee.name : 'Unassigned'
            };
        });
        setLocalJobs(enrichedJobs);
    }, [jobs, employees]);

    const columns = useMemo(() => {
        const pending = localJobs.filter(j => j.status === JOB_STATUSES.PENDING).sort((a,b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
        const inProgress = localJobs.filter(j => j.status === JOB_STATUSES.IN_PROGRESS);
        const awaitingQc = localJobs.filter(j => j.status === JOB_STATUSES.AWAITING_QC);
        return { 
            [JOB_STATUSES.PENDING]: pending, 
            [JOB_STATUSES.IN_PROGRESS]: inProgress, 
            [JOB_STATUSES.AWAITING_QC]: awaitingQc 
        };
    }, [localJobs]);

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return;
        }

        const jobToMove = localJobs.find(j => j.id === draggableId);
        if (!jobToMove) return;

        // WIP Limit Check
        if (destination.droppableId === JOB_STATUSES.IN_PROGRESS) {
            const employeeWip = localJobs.filter(j => j.employeeId === jobToMove.employeeId && j.status === JOB_STATUSES.IN_PROGRESS);
            if (employeeWip.length > 0) {
                toast.error(`${jobToMove.employeeName} is already working on another job.`);
                return;
            }
        }
        
        // --- THIS IS THE FIX: Optimistic UI Update ---
        // 1. Manually update the local state immediately for a smooth visual transition.
        const updatedJobs = localJobs.map(job => 
            job.id === draggableId 
                ? { ...job, status: destination.droppableId } 
                : job
        );
        setLocalJobs(updatedJobs);
        // --- END OF FIX ---

        // 2. Send the update to the backend in the background.
        // The Firestore listener will eventually send this same update back, but our UI won't flicker.
        logScanEvent(jobToMove, destination.droppableId)
            .then(() => {
                toast.success(`Job moved to "${destination.droppableId}"`);
            })
            .catch(error => {
                console.error("Failed to log scan event:", error);
                toast.error("Failed to update job status.");
                // If the backend update fails, revert the local state to show the error.
                setLocalJobs(jobs); 
            });
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex flex-col md:flex-row gap-6 h-full overflow-x-auto">
                <KanbanColumn status={JOB_STATUSES.PENDING} jobs={columns[JOB_STATUSES.PENDING]} />
                <KanbanColumn status={JOB_STATUSES.IN_PROGRESS} jobs={columns[JOB_STATUSES.IN_PROGRESS]} />
                <KanbanColumn status={JOB_STATUSES.AWAITING_QC} jobs={columns[JOB_STATUSES.AWAITING_QC]} />
            </div>
        </DragDropContext>
    );
};

export default KanbanBoard;
