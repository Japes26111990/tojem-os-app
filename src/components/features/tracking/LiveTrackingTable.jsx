// src/components/features/tracking/LiveTrackingTable.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, getEmployees, updateDocument, deleteDocument, getAllInventoryItems, getTools, getToolAccessories } from '../../../api/firestore';
import JobDetailsModal from './JobDetailsModal';
import { ChevronDown, ChevronRight, GraduationCap } from 'lucide-react';
import { calculateJobDuration } from '../../../utils/jobUtils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';

// Badge component to visually represent the job status
const StatusBadge = ({ status }) => {
    const statusColors = {
        'Pending': 'bg-yellow-500/20 text-yellow-300',
        'In Progress': 'bg-blue-500/20 text-blue-300',
        'Paused': 'bg-orange-500/20 text-orange-300',
        'Awaiting QC': 'bg-purple-500/20 text-purple-300',
        'Complete': 'bg-green-500/20 text-green-300',
        'Issue': 'bg-red-500/20 text-red-400',
        'Halted - Issue': 'bg-red-700/30 text-red-300',
        'Archived - Issue': 'bg-gray-600/20 text-gray-400'
    };
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[status] || 'bg-gray-500/20 text-gray-300'}`}>{status}</span>;
};

// Badge component to show job efficiency percentage
const EfficiencyBadge = ({ actualMinutes, estimatedMinutes }) => {
    if (actualMinutes === null || estimatedMinutes === null || actualMinutes === 0 || !estimatedMinutes) {
        return <span className="text-xs text-gray-500">N/A</span>;
    }
    const efficiency = (estimatedMinutes / actualMinutes) * 100;
    let color = 'bg-yellow-500/20 text-yellow-300';
    if (efficiency < 90) color = 'bg-red-500/20 text-red-400';
    if (efficiency > 110) color = 'bg-green-500/20 text-green-400';
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${color}`}>{Math.round(efficiency)}%</span>
};

// Component for a single row in the jobs table
const JobRow = ({ job, onClick, currentTime, employeeHourlyRates, overheadCostPerHour }) => {
    const liveDuration = calculateJobDuration(job, currentTime);

    // Logic to determine if training is recommended for the assigned employee
    const isTrainingRecommended = useMemo(() => {
        if (!job.requiredSkills || !job.employeeSkills) return false;
        return job.requiredSkills.some(reqSkill => {
            const employeeProficiency = job.employeeSkills[reqSkill.skillId] || 0;
            return reqSkill.minProficiency > 1 && employeeProficiency < reqSkill.minProficiency;
        });
    }, [job.requiredSkills, job.employeeSkills]);

    // Calculates the live cost of the job, including labor and overheads
    const calculateLiveCost = (j, cTime, rates, overheadRate) => {
        if (j.status === 'Complete' && typeof j.totalCost === 'number') {
            return `R ${j.totalCost.toFixed(2)}`;
        }
        if (!j.employeeId || !rates[j.employeeId]) return 'N/A';
        
        const directRate = rates[j.employeeId];
        const burdenedRate = directRate + overheadRate;
        
        const durationResult = calculateJobDuration(j, cTime);
        let liveLaborCost = 0;
        if (durationResult) {
            liveLaborCost = (durationResult.totalMinutes / 60) * burdenedRate;
        }
        
        const currentMaterialCost = j.materialCost || 0;
        const totalLiveCost = liveLaborCost + currentMaterialCost;
        return `R ${totalLiveCost.toFixed(2)}`;
    };

    const liveCost = calculateLiveCost(job, currentTime, employeeHourlyRates, overheadCostPerHour);
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString('en-ZA');
    };

    return (
        <tr onClick={() => onClick(job)} className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer">
            <td className="p-3 text-gray-300 text-sm">{formatDate(job.createdAt)}</td>
            <td className="p-3 text-gray-300">
                <div className="flex items-center gap-2">
                    {job.partName}
                    {isTrainingRecommended && (
                        <span title="Training recommended for this job">
                            <GraduationCap size={16} className="text-yellow-400" />
                        </span>
                    )}
                </div>
            </td>
            <td className="p-3 text-gray-300">{job.employeeName}</td>
            <td className="p-3"><StatusBadge status={job.status} /></td>
            <td className="p-3 text-gray-300 text-sm font-semibold">{liveDuration ? liveDuration.text : 'N/A'}</td>
            <td className="p-3"><EfficiencyBadge actualMinutes={liveDuration?.totalMinutes} estimatedMinutes={job.estimatedTime} /></td>
            <td className="p-3 text-gray-200 text-sm font-semibold font-mono text-right">{liveCost}</td>
        </tr>
    );
};

// Main component for the live tracking table
const LiveTrackingTable = ({ overheadCostPerHour }) => {
    // State management for component data
    const [allJobs, setAllJobs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [allInventoryItems, setAllInventoryItems] = useState([]);
    const [allTools, setAllTools] = useState([]);
    const [allToolAccessories, setAllToolAccessories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());
    
    // State for pagination
    const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
    const [hasMoreJobs, setHasMoreJobs] = useState(true);

    // Hooks for routing and URL parameters
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const JOBS_PER_PAGE = 25;

    // Fetches initial static data like employees, inventory, etc.
    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [fetchedEmployees, fetchedInventory, fetchedTools, fetchedToolAccessories] = await Promise.all([
                getEmployees(),
                getAllInventoryItems(),
                getTools(),
                getToolAccessories(),
            ]);
            setEmployees(fetchedEmployees);
            setAllInventoryItems(fetchedInventory);
            setAllTools(fetchedTools);
            setAllToolAccessories(fetchedToolAccessories);
        } catch (error) {
            console.error("Failed to fetch initial data for tracking table:", error);
        }
    };
    
    // Effect to fetch data and set up listeners when the component mounts
    useEffect(() => {
        fetchInitialData();
        
        const unsubscribe = listenToJobCards(({ jobs, lastVisible }) => {
            setAllJobs(jobs);
            setLastVisibleDoc(lastVisible);
            setHasMoreJobs(jobs.length === JOBS_PER_PAGE);
            setLoading(false);
        }, { limit: JOBS_PER_PAGE });

        // Set up an interval to update the current time for live duration calculations
        const intervalId = setInterval(() => setCurrentTime(Date.now()), 1000);

        // Cleanup function to unsubscribe from listeners and clear intervals
        return () => {
            unsubscribe();
            clearInterval(intervalId);
        };
    }, []);
    
    // Effect to check for a jobId in the URL and open the corresponding modal
    useEffect(() => {
        const jobIdFromUrl = searchParams.get('jobId');
        if (jobIdFromUrl && !loading && allJobs.length > 0) {
            const jobToOpen = allJobs.find(job => job.jobId === jobIdFromUrl);
            if (jobToOpen) {
                setSelectedJob(jobToOpen);
            }
        }
    }, [searchParams, loading, allJobs]);

    // Handles loading more jobs for pagination
    const handleLoadMore = () => {
        if (!hasMoreJobs || loadingMore) return;
        setLoadingMore(true);

        const unsubscribe = listenToJobCards(({ jobs, lastVisible }) => {
            unsubscribe();
            setAllJobs(prevJobs => [...prevJobs, ...jobs]);
            setLastVisibleDoc(lastVisible);
            setHasMoreJobs(jobs.length === JOBS_PER_PAGE);
            setLoadingMore(false);
        }, { limit: JOBS_PER_PAGE, startAfter: lastVisibleDoc });
    };

    // Memoized calculation of employee hourly rates to prevent recalculation on every render
    const employeeHourlyRates = useMemo(() => {
        return employees.reduce((acc, emp) => {
            acc[emp.id] = emp.hourlyRate || 0;
            return acc;
        }, {});
    }, [employees]);

    // Memoized enrichment of job data with employee skills for performance analysis
    const enrichedJobs = useMemo(() => {
        const employeesMap = new Map(employees.map(e => [e.id, e]));
        return allJobs.map(job => {
            const employee = employeesMap.get(job.employeeId);
            return {
                ...job,
                employeeSkills: employee ? employee.skills : {}
            };
        });
    }, [allJobs, employees]);

    // Memoized separation of jobs into active and completed lists
    const { activeJobs, completedAndArchivedJobs } = useMemo(() => {
        const statusOrder = { 'In Progress': 1, 'Paused': 2, 'Awaiting QC': 3, 'Pending': 4 };
        
        const active = enrichedJobs
            .filter(job => ['In Progress', 'Paused', 'Awaiting QC', 'Pending'].includes(job.status))
            .sort((a, b) => {
                const statusCompare = statusOrder[a.status] - statusOrder[b.status];
                if (statusCompare !== 0) return statusCompare;
                const timeA = a.status === 'In Progress' || a.status === 'Paused' ? a.startedAt : a.createdAt;
                const timeB = b.status === 'In Progress' || b.status === 'Paused' ? b.startedAt : b.createdAt;
                if (timeA && timeB) {
                    return timeB.seconds - timeA.seconds;
                }
                return 0;
            });
        const completed = enrichedJobs.filter(job => ['Complete', 'Issue', 'Archived - Issue'].includes(job.status));
        return { activeJobs: active, completedAndArchivedJobs: completed };
    }, [enrichedJobs]);

    // Handlers for updating and deleting jobs from the details modal
    const handleUpdateJob = async (jobId, updatedData) => {
        try {
            await updateDocument('createdJobCards', jobId, updatedData);
        } catch (error) {
            console.error("Error updating job from modal:", error);
            throw error;
        }
    };

    const handleDeleteJob = async (jobId) => {
        try {
            await deleteDocument('createdJobCards', jobId);
        } catch (error) {
            console.error("Error deleting job from modal:", error);
            throw error;
        }
    };

    // Closes the details modal and removes the jobId from the URL
    const handleCloseModal = () => {
        setSelectedJob(null);
        navigate('/tracking', { replace: true });
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
                                    overheadCostPerHour={overheadCostPerHour}
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
                            {showCompleted ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
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
                                            overheadCostPerHour={overheadCostPerHour}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {hasMoreJobs && (
                        <div className="p-4 text-center border-t border-gray-700">
                            <Button onClick={handleLoadMore} disabled={loadingMore}>
                                {loadingMore ? 'Loading...' : 'Load More Jobs'}
                            </Button>
                        </div>
                    )}
                </div>
                {selectedJob && (
                    <JobDetailsModal
                        job={selectedJob}
                        onClose={handleCloseModal}
                        currentTime={Date.now()}
                        employeeHourlyRates={employeeHourlyRates}
                        overheadCostPerHour={overheadCostPerHour}
                        // --- FIX: Pass the correct 'employees' state variable ---
                        allEmployees={employees} 
                        allInventoryItems={allInventoryItems}
                        allTools={allTools}
                        allToolAccessories={allToolAccessories}
                        onUpdateJob={handleUpdateJob}
                        onDeleteJob={handleDeleteJob}
                    />
                )}
            </div>
        </>
    );
};

export default LiveTrackingTable;
