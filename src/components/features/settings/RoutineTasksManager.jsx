// src/components/features/settings/RoutineTasksManager.jsx

import React, { useState, useEffect } from 'react';
import { getRoutineTasks, addRoutineTask, updateRoutineTask, deleteRoutineTask, getEmployees } from '../../../api/firestore';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import Textarea from '../../ui/Textarea';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const RoutineTasksManager = () => {
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]); // State for employees
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        schedule: 'daily',
        timeOfDay: '16:45',
        isPrintable: false, // New field
        assignedEmployeeId: '', // New field
    });

    const scheduleOptions = [
        { id: 'daily', name: 'Daily' },
        { id: 'weekly_monday', name: 'Weekly (Monday)' },
        { id: 'weekly_tuesday', name: 'Weekly (Tuesday)' },
        { id: 'weekly_wednesday', name: 'Weekly (Wednesday)' },
        { id: 'weekly_thursday', name: 'Weekly (Thursday)' },
        { id: 'weekly_friday', name: 'Weekly (Friday)' },
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedTasks, fetchedEmployees] = await Promise.all([
                getRoutineTasks(),
                getEmployees()
            ]);
            setTasks(fetchedTasks);
            setEmployees(fetchedEmployees);
        } catch (error) {
            console.error("Error fetching routine tasks or employees:", error);
            toast.error("Could not load required data.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', description: '', schedule: 'daily', timeOfDay: '16:45', isPrintable: false, assignedEmployeeId: '' });
    };

    const handleEditClick = (task) => {
        setEditingId(task.id);
        setFormData({
            name: task.name,
            description: task.description,
            schedule: task.schedule,
            timeOfDay: task.timeOfDay,
            isPrintable: task.isPrintable || false,
            assignedEmployeeId: task.assignedEmployeeId || '',
        });
    };

    const handleDelete = (taskId) => {
        toast((t) => (
            <span>
                Delete this routine task?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteRoutineTask(taskId)
                        .then(() => {
                            toast.success("Task deleted.");
                            fetchData();
                        })
                        .catch(err => toast.error("Failed to delete task."));
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.timeOfDay) {
            return toast.error("Please provide a task name and a time of day.");
        }

        try {
            if (editingId) {
                await updateRoutineTask(editingId, formData);
                toast.success("Routine task updated successfully!");
            } else {
                await addRoutineTask(formData);
                toast.success("Routine task added successfully!");
            }
            handleCancelEdit();
            fetchData();
        } catch (error) {
            console.error("Error saving routine task:", error);
            toast.error("Failed to save routine task.");
        }
    };

    const getEmployeeName = (employeeId) => {
        return employees.find(e => e.id === employeeId)?.name || 'Not Assigned';
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Routine Tasks</h3>
            <p className="text-sm text-gray-400 mb-4">
                Create recurring daily or weekly tasks. Printable tasks will generate a mini job card on the dashboard.
            </p>
            
            <form onSubmit={handleSubmit} className="p-4 mb-6 bg-gray-900/50 rounded-lg space-y-4">
                <h4 className="text-lg font-semibold text-white">{editingId ? 'Edit Task' : 'Add New Task'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input label="Task Name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., End of Day Cleanup" />
                    <Dropdown label="Schedule" name="schedule" value={formData.schedule} onChange={handleInputChange} options={scheduleOptions} />
                    <Input label="Time of Day" name="timeOfDay" type="time" value={formData.timeOfDay} onChange={handleInputChange} />
                    <Dropdown label="Assign To (Default)" name="assignedEmployeeId" value={formData.assignedEmployeeId} onChange={handleInputChange} options={employees} placeholder="Select Employee..." />
                </div>
                <Textarea label="Description / Checklist (one item per line)" name="description" value={formData.description} onChange={handleInputChange} placeholder="Sweep workshop floor&#10;Empty all bins" rows={3}/>
                <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input type="checkbox" name="isPrintable" checked={formData.isPrintable} onChange={handleInputChange} className="h-4 w-4 rounded bg-gray-700 text-blue-600"/>
                        Make this task a printable job card
                    </label>
                    <div className="flex justify-end gap-2">
                        {editingId && <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>}
                        <Button type="submit" variant="primary">
                            {editingId ? <><Edit size={16} className="mr-2"/>Save Changes</> : <><PlusCircle size={16} className="mr-2"/>Add Task</>}
                        </Button>
                    </div>
                </div>
            </form>

            <div className="space-y-3">
                <h4 className="text-lg font-semibold text-white">Scheduled Tasks</h4>
                {loading ? <p className="text-gray-400">Loading...</p> :
                    tasks.map(task => (
                        <div key={task.id} className="bg-gray-700 p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="font-bold text-white">{task.name}</p>
                                <p className="text-sm text-gray-400">
                                    {scheduleOptions.find(s => s.id === task.schedule)?.name} at {task.timeOfDay}
                                    <span className="mx-2">|</span>
                                    Assigned to: {getEmployeeName(task.assignedEmployeeId)}
                                    <span className="mx-2">|</span>
                                    <span className={task.isPrintable ? 'text-blue-400' : 'text-gray-500'}>{task.isPrintable ? 'Printable' : 'Not Printable'}</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => handleEditClick(task)} variant="secondary" size="sm" className="p-2"><Edit size={16}/></Button>
                                <Button onClick={() => handleDelete(task.id)} variant="danger" size="sm" className="p-2"><Trash2 size={16}/></Button>
                            </div>
                        </div>
                    ))
                }
                 {tasks.length === 0 && !loading && <p className="text-center text-gray-500 py-4">No routine tasks have been created yet.</p>}
            </div>
        </div>
    );
};

export default RoutineTasksManager;
