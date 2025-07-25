// src/components/features/dashboard/RoutineTasksWidget.jsx

import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { markRoutineTaskAsDone } from '../../../api/firestore';
import Button from '../../ui/Button';
import { Check, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const RoutineTasksWidget = ({ tasks, onTaskComplete }) => {
    const { user } = useAuth();

    const handleMarkAsDone = async (task) => {
        if (!user) return toast.error("Could not identify user.");
        
        // Allow completion if the task is assigned to the current user, or if the user is a Manager
        if (task.assignedEmployeeId === user.uid || user.role === 'Manager') {
            try {
                await markRoutineTaskAsDone(task.id, task.name, user.uid, user.email);
                toast.success(`Task "${task.name}" marked as complete.`);
                onTaskComplete(); // Refresh the list on the dashboard
            } catch (error) {
                toast.error("Failed to mark task as complete.");
                console.error(error);
            }
        } else {
            toast.error("This task is assigned to another employee.");
        }
    };

    const handlePrint = async (task) => {
        const qrCodeDataUrl = await QRCode.toDataURL(`ROUTINE_${task.id}`, { width: 80 });
        const printContents = `
            <div style="font-family: sans-serif; padding: 20px; color: #333; border: 2px solid #333; width: 300px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 10px; border-bottom: 1px solid #ccc;">
                    <div>
                        <h2 style="font-size: 20px; font-weight: bold; margin: 0;">Routine Task</h2>
                        <p style="font-size: 16px; color: #333; margin: 5px 0 0 0;">${task.name}</p>
                    </div>
                    <img src="${qrCodeDataUrl}" alt="QR Code" />
                </div>
                <div style="margin-top: 15px;">
                    <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">Checklist:</h3>
                    <ul style="list-style: square; padding-left: 20px; margin: 0; font-size: 13px;">
                        ${(task.description || '').split('\n').map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                <div style="margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 12px;">
                    <p><strong>Assigned To:</strong> ${task.assignedEmployeeId ? 'Employee Name' : 'Any'}</p>
                    <p><strong>Time:</strong> ${task.timeOfDay}</p>
                </div>
            </div>
        `;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`<html><head><title>Routine Task</title></head><body>${printContents}</body></html>`);
            printWindow.document.close();
            printWindow.onload = () => { setTimeout(() => printWindow.print(), 500); };
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
            <h3 className="font-bold text-white mb-4">
                Today's Routine Tasks
            </h3>
            {(!tasks || tasks.length === 0) ? (
                <div className="flex items-center justify-center h-full text-center text-gray-500">
                    <p>All routine tasks for today are complete.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tasks.map((task, index) => (
                        <div key={index} className="bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-white">{task.name}</p>
                                    <p className="text-xs text-gray-400">Scheduled for {task.timeOfDay}</p>
                                </div>
                                {task.isPrintable ? (
                                    <Button onClick={() => handlePrint(task)} variant="secondary" size="sm">
                                        <Printer size={16} className="mr-2"/> Print
                                    </Button>
                                ) : (
                                    <Button 
                                        onClick={() => handleMarkAsDone(task)} 
                                        variant="success" 
                                        size="sm"
                                        disabled={user.role !== 'Manager' && task.assignedEmployeeId && task.assignedEmployeeId !== user.uid}
                                    >
                                        <Check size={16} className="mr-2"/> Done
                                    </Button>
                                )}
                            </div>
                            {task.description && (
                                <ul className="mt-2 list-disc list-inside pl-1 text-sm text-gray-300 space-y-1">
                                    {task.description.split('\n').map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RoutineTasksWidget;
