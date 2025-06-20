import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, getEmployees, updateDocument, deleteDocument, getAllInventoryItems, getTools, getToolAccessories } from '../../../api/firestore'; // Added getAllInventoryItems, getTools, getToolAccessories
import JobDetailsModal from './JobDetailsModal';
import { ChevronDown, ChevronRight } from 'lucide-react';

const StatusBadge = ({ status }) => {
    const statusColors = {
        'Pending': 'bg-yellow-500/20 text-yellow-300',
        'In Progress': 'bg-blue-500/20 text-blue-300',
        'Paused': 'bg-orange-500/20 text-orange-300',
        'Awaiting QC': 'bg-purple-500/20 text-purple-300',
        'Complete': 'bg-green-500/20 text-green-300',
        'Issue': 'bg-red-500/20 text-red-400',
        'Archived - Issue': 'bg-gray-600/20 text-gray-400'
    };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[status] || 'bg-gray-500/20 text-gray-300'}`}>{status}</span>;
};

const EfficiencyBadge = ({ actualMinutes, estimatedMinutes }) => {
    if (!actualMinutes || !estimatedMinutes) {
        return <span className="text-xs text-gray-500">N/A</span>;
    }
    const efficiency = (estimatedMinutes / actualMinutes) * 100;
    let color = 'bg-yellow-500/20 text-yellow-300';
    if (efficiency < 90) color = 'bg-red-500/20 text-red-400';
    if (efficiency > 110) color = 'bg-green-500/20 text-green-400';
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${color}`}>{Math.round(efficiency)}%</span>
};

const JobRow = ({ job, onClick, currentTime, employeeHourlyRates }) => {
    const calculateLiveDuration = (j, cTime) => {
        if (!j.startedAt) return null;
        let durationSeconds;
        const startTime = j.startedAt.seconds * 1000;
        const pausedMilliseconds = j.totalPausedMilliseconds || 0;
        if (j.status === 'Complete' || j.status === 'Awaiting QC' || j.status === 'Issue' || j.status === 'Archived - Issue') {
            if (!j.completedAt) return null;
            durationSeconds = (j.completedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'In Progress') {
            durationSeconds = (cTime - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'Paused' && j.pausedAt) {
            durationSeconds = (j.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else {
            return null;
        }
        if (durationSeconds < 0) return null;
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        return { text: `${minutes}m ${seconds}s`, totalMinutes: durationSeconds / 60 };
    };

    const calculateLiveCost = (j, cTime, rates) => {
        // If totalCost is already set (e.g., after QC approval), use that value
        if (j.totalCost !== undefined && j.totalCost !== null) {
            return `R ${j.totalCost.toFixed(2)}`;
        }
        if (!j.employeeId || !rates[j.employeeId]) return 'N/A';
        const hourlyRate = rates[j.employeeId];
        if (hourlyRate === 0) return 'N/A';
        let activeSeconds = 0;
        const startTime = j.startedAt ? j.startedAt.seconds * 1000 : null;
        const pausedMilliseconds = j.totalPausedMilliseconds || 0;
        if (j.status === 'In Progress') {
            if (startTime) {
                activeSeconds = (cTime - startTime - pausedMilliseconds) / 1000;
            }
        } else if (j.status === 'Paused' && j.pausedAt && startTime) {
            activeSeconds = (j.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else {
            return 'N/A';
        }
        activeSeconds = Math.max(0, activeSeconds);
        const activeHours = activeSeconds / 3600;
        const liveLaborCost = activeHours * hourlyRate;
        
        const currentMaterialCost = j.materialCost || 0;
        const totalLiveCost = liveLaborCost + currentMaterialCost;
        return `R ${totalLiveCost.toFixed(2)}`;
    };

    const liveDuration = calculateLiveDuration(job, currentTime);
    const liveCost = calculateLiveCost(job, currentTime, employeeHourlyRates);
    const formatDate = (timestamp) => new Date(timestamp.seconds * 1000).toLocaleString();

    return (
        <tr onClick={() => onClick(job)} className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer">
            <td className="p-3 text-gray-300 text-sm">{formatDate(job.createdAt)}</td>
            <td className="p-3 text-gray-300">{job.partName}</td>
            <td className="p-3 text-gray-300">{job.employeeName}</td>
            <td className="p-3"><StatusBadge status={job.status} /></td>
            <td className="p-3 text-gray-300 text-sm font-semibold">{liveDuration ? liveDuration.text : 'N/A'}</td>
            <td className="p-3"><EfficiencyBadge actualMinutes={liveDuration?.totalMinutes} estimatedMinutes={job.estimatedTime} /></td>
            <td className="p-3 text-gray-200 text-sm font-semibold font-mono text-right">{liveCost}</td>
        </tr>
    );
};

const LiveTrackingTable = () => {
    const [jobs, setJobs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [allInventoryItems, setAllInventoryItems] = useState([]); // State for all inventory items
    const [allTools, setAllTools] = useState([]); // State for all tools
    const [allToolAccessories, setAllToolAccessories] = useState([]); // State for all tool accessories
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());

    const fetchAllRequiredData = async () => { // Renamed from fetchJobsAndEmployees for clarity
        setLoading(true);
        try {
            const [fetchedEmployees, fetchedInventory, fetchedTools, fetchedToolAccessories] = await Promise.all([
                getEmployees(),
                getAllInventoryItems(), // Fetch all inventory items
                getTools(), // Fetch all tools
                getToolAccessories(), // Fetch all tool accessories
            ]);
            setEmployees(fetchedEmployees);
            setAllInventoryItems(fetchedInventory);
            setAllTools(fetchedTools);
            setAllToolAccessories(fetchedToolAccessories);
            
            // Use onSnapshot for real-time updates on jobs
            const unsubscribe = listenToJobCards((fetchedJobs) => {
                setJobs(fetchedJobs);
                setLoading(false);
            });
            return unsubscribe; // Return unsubscribe to be called on cleanup
        } catch (error) {
            console.error("Failed to fetch initial data for tracking table:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        let unsubscribeJobs;
        (async () => {
            unsubscribeJobs = await fetchAllRequiredData();
        })();
        
        const intervalId = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => {
            if (unsubscribeJobs) unsubscribeJobs();
            clearInterval(intervalId);
        };
    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

    const employeeHourlyRates = useMemo(() => {
        return employees.reduce((acc, emp) => {
            acc[emp.id] = emp.hourlyRate || 0;
            return acc;
        }, {});
    }, [employees]);

    const { activeJobs, completedAndArchivedJobs } = useMemo(() => {
        const statusOrder = { 'In Progress': 1, 'Paused': 2, 'Awaiting QC': 3, 'Pending': 4 };
        
        const active = jobs
            .filter(job => ['In Progress', 'Paused', 'Awaiting QC', 'Pending'].includes(job.status))
            .sort((a, b) => {
                const statusCompare = statusOrder[a.status] - statusOrder[b.status];
                if (statusCompare !== 0) return statusCompare;
                const timeA = a.status === 'In Progress' 
                || a.status === 'Paused' ? a.startedAt : a.createdAt;
                const timeB = b.status === 'In Progress' || b.status === 'Paused' ? b.startedAt : b.createdAt;
                if (timeA && timeB) {
                    return timeB.seconds - timeA.seconds;
                }
                return 0;
            });
        const completed = jobs.filter(job => ['Complete', 'Issue', 'Archived - Issue'].includes(job.status));
        return { activeJobs: active, completedAndArchivedJobs: completed 
        };
    }, [jobs]);

    // Handler for updating a job from the modal
    const handleUpdateJob = async (jobId, updatedData) => {
        try {
            await updateDocument('createdJobCards', jobId, updatedData);
            // The listenToJobCards will automatically update the state, no need for manual setJobs
        } catch (error) {
            console.error("Error updating job from modal:", error);
            throw error; // Re-throw to be caught by the modal's save handler
        }
    };

    // Handler for deleting a job from the modal
    const handleDeleteJob = async (jobId) => {
        try {
            await deleteDocument('createdJobCards', jobId);
            // The listenToJobCards will automatically update the state
        } catch (error) {
            console.error("Error deleting job from modal:", error);
            throw error; // Re-throw to be caught by the modal's delete handler
        }
    };

    if (loading) return <p className="text-center text-gray-400">Loading jobs...</p>;

    return (
        <>
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-600 bg-gray-900/50">
                                <th className="p-3 text-sm font-semibold text-gray-400">Created</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Part</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Employee</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Status</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Actual Time</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Efficiency</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Job Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeJobs.map(job => (
                                <JobRow
                                    key={job.id}
                                    job={job}
                                    onClick={() => setSelectedJob(job)}
                                    currentTime={currentTime}
                                    employeeHourlyRates={employeeHourlyRates}
                                />
                            ))}
                        </tbody>
                    </table>
                    <div className="border-t border-gray-700">
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            className="w-full flex items-center justify-between p-3 text-left text-sm font-semibold text-gray-300 bg-gray-900/30 hover:bg-gray-700/50 transition-colors"
                        >
                            <span>Completed & Archived Jobs ({completedAndArchivedJobs.length})</span>
                            {showCompleted ?
                            <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                        {showCompleted && (
                            <table className="w-full text-left">
                                <thead className="invisible h-0">
                                    <tr>
                                        <th className="p-0">Created</th><th className="p-0">Part</th><th className="p-0">Employee</th>
                                        <th className="p-0">Status</th><th className="p-0">Actual Time</th><th className="p-0">Efficiency</th>
                                        <th className="p-0 text-right">Job Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {completedAndArchivedJobs.map(job => (
                                        <JobRow
                                            key={job.id}
                                            job={job}
                                            onClick={() => setSelectedJob(job)}
                                            currentTime={currentTime}
                                            employeeHourlyRates={employeeHourlyRates}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                {selectedJob && (
                    <JobDetailsModal
                        job={selectedJob}
                        onClose={() => setSelectedJob(null)}
                        currentTime={currentTime}
                        employeeHourlyRates={employeeHourlyRates}
                        allEmployees={employees} // Pass allEmployees for dropdown in edit mode
                        onUpdateJob={handleUpdateJob} // Pass update handler
                        onDeleteJob={handleDeleteJob} // Pass delete handler
                        allInventoryItems={allInventoryItems} // Pass all inventory items for consumable editor
                        allTools={allTools} // Pass all tools for tool/accessory selection
                        allToolAccessories={allToolAccessories} // Pass all tool accessories for selection
                    />
                )}
            </div>
        </>
    );
};

export default LiveTrackingTable;