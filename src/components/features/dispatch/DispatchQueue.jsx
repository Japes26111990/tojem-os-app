// src/components/features/dispatch/DispatchQueue.jsx (New File)

import React, { useState, useEffect, useMemo } from 'react';
import { getEmployees, listenToJobCards, updateJobPriorities } from '../../../api/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Save } from 'lucide-react';
import Button from '../../ui/Button';
import toast from 'react-hot-toast';

const JobItem = ({ job, index }) => (
    <Draggable draggableId={job.id} index={index}>
        {(provided, snapshot) => (
            <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${snapshot.isDragging ? 'bg-blue-600 shadow-lg' : 'bg-gray-700'}`}
            >
                <GripVertical className="text-gray-500" />
                <div>
                    <p className="font-semibold text-white">{job.partName}</p>
                    <p className="text-xs text-gray-400">{job.jobId}</p>
                </div>
            </div>
        )}
    </Draggable>
);

const EmployeeQueue = ({ employee, jobs }) => {
    const [orderedJobs, setOrderedJobs] = useState(jobs);

    useEffect(() => {
        setOrderedJobs(jobs);
    }, [jobs]);

    const handleSavePriority = async () => {
        try {
            await updateJobPriorities(orderedJobs);
            toast.success(`Priorities saved for ${employee.name}`);
        } catch (error) {
            toast.error("Failed to save priorities.");
            console.error(error);
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-white">{employee.name}'s Queue</h4>
                <Button onClick={handleSavePriority} size="sm" variant="secondary">
                    <Save size={16} className="mr-2" />
                    Save Priority
                </Button>
            </div>
            <Droppable droppableId={employee.id}>
                {(provided, snapshot) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`space-y-2 p-2 rounded-lg min-h-[100px] transition-colors ${snapshot.isDraggingOver ? 'bg-gray-900/50' : ''}`}
                    >
                        {orderedJobs.map((job, index) => (
                            <JobItem key={job.id} job={job} index={index} />
                        ))}
                        {provided.placeholder}
                        {orderedJobs.length === 0 && <p className="text-sm text-center text-gray-500 pt-4">No pending jobs.</p>}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

const DispatchQueue = () => {
    const [employees, setEmployees] = useState([]);
    const [jobsByEmployee, setJobsByEmployee] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitialData = async () => {
            const emps = await getEmployees();
            setEmployees(emps.filter(e => e.employeeType === 'permanent')); // Only show permanent staff queues
        };
        fetchInitialData();

        const unsubscribe = listenToJobCards(allJobs => {
            const pendingJobs = allJobs.filter(j => j.status === 'Pending' && j.employeeId);
            
            // Sort jobs by their priority field first, then by creation date
            pendingJobs.sort((a, b) => {
                const priorityA = a.priority ?? Infinity;
                const priorityB = b.priority ?? Infinity;
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                return a.createdAt.seconds - b.createdAt.seconds;
            });

            const grouped = pendingJobs.reduce((acc, job) => {
                if (!acc[job.employeeId]) {
                    acc[job.employeeId] = [];
                }
                acc[job.employeeId].push(job);
                return acc;
            }, {});
            setJobsByEmployee(grouped);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const onDragEnd = (result) => {
        const { source, destination } = result;
        if (!destination) return;

        const sourceEmployeeId = source.droppableId;
        const destEmployeeId = destination.droppableId;

        const newJobsByEmployee = { ...jobsByEmployee };

        if (sourceEmployeeId === destEmployeeId) {
            // Reordering within the same list
            const items = Array.from(newJobsByEmployee[sourceEmployeeId]);
            const [reorderedItem] = items.splice(source.index, 1);
            items.splice(destination.index, 0, reorderedItem);
            newJobsByEmployee[sourceEmployeeId] = items;
        } else {
            // Moving from one list to another
            const sourceItems = Array.from(newJobsByEmployee[sourceEmployeeId]);
            const destItems = newJobsByEmployee[destEmployeeId] ? Array.from(newJobsByEmployee[destEmployeeId]) : [];
            const [movedItem] = sourceItems.splice(source.index, 1);
            
            // Update the employeeId on the moved item
            const destEmployee = employees.find(e => e.id === destEmployeeId);
            movedItem.employeeId = destEmployeeId;
            movedItem.employeeName = destEmployee.name;

            destItems.splice(destination.index, 0, movedItem);
            
            newJobsByEmployee[sourceEmployeeId] = sourceItems;
            newJobsByEmployee[destEmployeeId] = destItems;
        }

        setJobsByEmployee(newJobsByEmployee);
    };

    if (loading) return <p className="text-center text-gray-400">Loading Dispatch Queues...</p>;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {employees.map(employee => (
                    <EmployeeQueue 
                        key={employee.id}
                        employee={employee}
                        jobs={jobsByEmployee[employee.id] || []}
                    />
                ))}
            </div>
        </DragDropContext>
    );
};

export default DispatchQueue;
