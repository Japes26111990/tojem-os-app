// src/components/features/dashboard/RoutineTasksWidget.jsx (UPDATED with Fallback UI)
// The widget now displays a user-friendly message when there are no tasks for the day,
// instead of just disappearing from the UI.

import React from 'react';
import { CheckSquare, Square } from 'lucide-react';

const RoutineTasksWidget = ({ tasks }) => {
    // A simple (non-functional) handler for now. In a future version, this could save completion status to Firestore.
    const handleToggle = (taskName) => {
        console.log(`Task "${taskName}" toggled.`);
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
            <h3 className="font-bold text-white mb-4">
                Today's Routine Tasks
            </h3>
            {/* --- NEW: Conditional Rendering Logic --- */}
            {(!tasks || tasks.length === 0) ? (
                <div className="flex items-center justify-center h-full text-center text-gray-500">
                    <p>No routine tasks scheduled for today.</p>
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
                                <button onClick={() => handleToggle(task.name)} className="text-gray-300 hover:text-white">
                                    <Square size={24} />
                                </button>
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
