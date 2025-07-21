// src/components/features/kanban/KanbanBoard.jsx

import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { logScanEvent } from '../../../api/firestore'; // UPDATED: Import logScanEvent
import toast from 'react-hot-toast';
import { GripVertical } from 'lucide-react';

const JobCard = ({ job, index, employeeName }) => {
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
                            <p className="text-xs text-blue-400 mt-1">{employeeName}</p>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};

const KanbanColumn = ({ status, jobs, employeesMap }) => {
    const statusConfig = {
        'Pending': { title: 'Pending', color: 'border-t-yellow-400' },
        'In Progress': { title: 'In Progress', color: 'border-t-blue-400' },
        'Awaiting QC': { title: 'Awaiting QC', color: 'border-t-purple-400' },
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
                                employeeName={employeesMap.get(job.employeeId)?.name || 'Unassigned'}
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
    const employeesMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

    const columns = useMemo(() => {
        const pending = jobs.filter(j => j.status === 'Pending').sort((a,b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
        const inProgress = jobs.filter(j => j.status === 'In Progress');
        const awaitingQc = jobs.filter(j => j.status === 'Awaiting QC');
        return { 'Pending': pending, 'In Progress': inProgress, 'Awaiting QC': awaitingQc };
    }, [jobs]);

    // --- UPDATED: This now calls logScanEvent instead of updateJobStatus ---
    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;

        if (source.droppableId !== destination.droppableId) {
            const job = jobs.find(j => j.id === draggableId);
            if (!job) return;

            // WIP Limit Check
            if (destination.droppableId === 'In Progress') {
                const employeeWip = jobs.filter(j => j.employeeId === job.employeeId && j.status === 'In Progress');
                if (employeeWip.length > 0) {
                    toast.error(`${job.employeeName} is already working on another job.`);
                    return;
                }
            }
            
            try {
                // Instead of updating the status directly, we log an event.
                // The backend Cloud Function will handle the actual update.
                await logScanEvent(job, destination.droppableId);
                toast.success(`Event logged for job ${job.jobId} to "${destination.droppableId}"`);
            } catch (error) {
                console.error("Failed to log scan event:", error);
                toast.error("Failed to log the status change event.");
            }
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex flex-col md:flex-row gap-6 h-full overflow-x-auto">
                <KanbanColumn status="Pending" jobs={columns['Pending']} employeesMap={employeesMap} />
                <KanbanColumn status="In Progress" jobs={columns['In Progress']} employeesMap={employeesMap} />
                <KanbanColumn status="Awaiting QC" jobs={columns['Awaiting QC']} employeesMap={employeesMap} />
            </div>
        </DragDropContext>
    );
};

export default KanbanBoard;
