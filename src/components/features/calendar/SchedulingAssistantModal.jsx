import React, { useState, useEffect } from 'react';
import { listenToJobCards } from '../../../api/firestore';
// --- THE FIX IS HERE ---
import { writeBatch, doc } from 'firebase/firestore'; // Added 'doc' to the import
import { db } from '../../../api/firebase';
import Button from '../../ui/Button';
import { X } from 'lucide-react';

const SchedulingAssistantModal = ({ onClose, onScheduleComplete }) => {
    const [pendingJobs, setPendingJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isScheduling, setIsScheduling] = useState(false);

    const [schedulePlan, setSchedulePlan] = useState([]);

    useEffect(() => {
        const unsubscribe = listenToJobCards((allJobs) => {
            const unscheduled = allJobs.filter(job => job.status === 'Pending' && !job.scheduledDate);
            setPendingJobs(unscheduled);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    const generateSchedule = () => {
        const workHoursPerDay = 8;
        const workMinutesPerDay = workHoursPerDay * 60;
        let dayIndex = 0;
        let dailyMinutes = 0;
        const plan = [];

        const sortedJobs = [...pendingJobs].sort((a, b) => (b.estimatedTime || 0) - (a.estimatedTime || 0));

        sortedJobs.forEach(job => {
            const jobDuration = job.estimatedTime || 60;

            if (dailyMinutes + jobDuration > workMinutesPerDay) {
                dayIndex++;
                dailyMinutes = 0;
            }
            
            let scheduledDate = new Date();
            let addedDays = 0;
            // Loop until we find the next workday
            while(addedDays < dayIndex){
                scheduledDate.setDate(scheduledDate.getDate() + 1);
                if (scheduledDate.getDay() !== 0 && scheduledDate.getDay() !== 6) { // If not Sunday or Saturday
                   addedDays++;
                }
            }
            
            const hour = 9 + Math.floor(dailyMinutes / 60);
            const minute = dailyMinutes % 60;
            scheduledDate.setHours(hour, minute, 0, 0);

            plan.push({ ...job, proposedDate: scheduledDate });
            dailyMinutes += jobDuration;
        });

        setSchedulePlan(plan);
    };

    const commitSchedule = async () => {
        if (schedulePlan.length === 0) return;
        setIsScheduling(true);
        try {
            const batch = writeBatch(db);
            schedulePlan.forEach(job => {
                const jobRef = doc(db, 'createdJobCards', job.id); // This line will now work
                batch.update(jobRef, { scheduledDate: job.proposedDate });
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
                        <p className="text-sm text-gray-400">Auto-schedule pending jobs for the upcoming week.</p>
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
                             <Button onClick={generateSchedule} disabled={loading || pendingJobs.length === 0}>
                                Generate Schedule
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
                        {loading ? <p>Loading pending jobs...</p> : 
                         schedulePlan.length > 0 ? (
                            <ul className="space-y-2">
                                {schedulePlan.map(job => (
                                    <li key={job.id} className="p-3 bg-gray-700 rounded-md text-sm">
                                        <p className="font-bold text-white">{job.partName} <span className="text-xs font-mono text-gray-400">({job.jobId})</span></p>
                                        <p className="text-blue-400">Scheduled for: {job.proposedDate.toLocaleString('en-ZA')}</p>
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