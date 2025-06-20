import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards } from '../../../api/firestore';
import JobDetailsModal from './JobDetailsModal';
import { ChevronDown, ChevronRight } from 'lucide-react';

const StatusBadge = ({ status }) => {
    const statusColors = {
        'Pending': 'bg-yellow-500/20 text-yellow-300',
        'In Progress': 'bg-blue-500/20 text-blue-300',
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

const JobRow = ({ job, onClick }) => {
    const formatFinalDuration = (j) => {
        if (!j.startedAt || !j.completedAt) return null;
        let durationSeconds = j.completedAt.seconds - j.startedAt.seconds;
        if (j.totalPausedMilliseconds) {
            durationSeconds -= Math.floor(j.totalPausedMilliseconds / 1000);
        }
        if (durationSeconds < 0) return null;
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return { text: `${minutes}m ${seconds}s`, totalMinutes: minutes + seconds / 60 };
    };

    const finalDuration = formatFinalDuration(job);
    const formatDate = (timestamp) => new Date(timestamp.seconds * 1000).toLocaleString();

    return (
        <tr onClick={onClick} className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer">
            <td className="p-3 text-gray-300 text-sm">{formatDate(job.createdAt)}</td>
            <td className="p-3 text-gray-300">{job.partName}</td>
            <td className="p-3 text-gray-300">{job.employeeName}</td>
            <td className="p-3"><StatusBadge status={job.status} /></td>
            <td className="p-3 text-gray-300 text-sm font-semibold">{finalDuration ? finalDuration.text : 'N/A'}</td>
            <td className="p-3"><EfficiencyBadge actualMinutes={finalDuration?.totalMinutes} estimatedMinutes={job.estimatedTime} /></td>
            <td className="p-3 text-gray-200 text-sm font-semibold font-mono text-right">{job.totalCost ? `R ${job.totalCost.toFixed(2)}` : 'N/A'}</td>
        </tr>
    );
};

const LiveTrackingTable = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [showCompleted, setShowCompleted] = useState(false);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = listenToJobCards((fetchedJobs) => {
            setJobs(fetchedJobs);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const { activeJobs, completedAndArchivedJobs } = useMemo(() => {
        const statusOrder = { 'In Progress': 1, 'Pending': 2, 'Awaiting QC': 3 };

        const active = jobs
            .filter(job => ['In Progress', 'Pending', 'Awaiting QC'].includes(job.status))
            .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

        const completed = jobs.filter(job => ['Complete', 'Issue', 'Archived - Issue'].includes(job.status));

        return { activeJobs: active, completedAndArchivedJobs: completed };
    }, [jobs]);

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
                                <JobRow key={job.id} job={job} onClick={() => setSelectedJob(job)} />
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
                                 {/* We add a head here for alignment, but hide it visually */}
                                 <thead className="invisible h-0">
                                    <tr>
                                        <th className="p-0">Created</th><th className="p-0">Part</th><th className="p-0">Employee</th>
                                        <th className="p-0">Status</th><th className="p-0">Actual Time</th><th className="p-0">Efficiency</th>
                                        <th className="p-0 text-right">Job Cost</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {completedAndArchivedJobs.map(job => (
                                        <JobRow key={job.id} job={job} onClick={() => setSelectedJob(job)} />
                                    ))}
                                 </tbody>
                             </table>
                        )}
                    </div>
                </div>
            </div>

            {selectedJob && (
                <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} />
            )}
        </>
    );
};

export default LiveTrackingTable;