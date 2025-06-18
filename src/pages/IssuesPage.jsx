import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { listenToJobCards, updateJobStatus } from '../api/firestore';
import JobDetailsModal from '../components/features/tracking/JobDetailsModal';
import Button from '../components/ui/Button';

const IssuesPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);

    useEffect(() => {
        const unsubscribe = listenToJobCards((fetchedJobs) => {
            setJobs(fetchedJobs);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filter for only jobs with the 'Issue' status
    const issueJobs = useMemo(() => {
        return jobs.filter(job => job.status === 'Issue');
    }, [jobs]);

    // Action to archive the job, effectively removing it from this list
    const handleArchive = async (jobId) => {
        if (window.confirm("Are you sure you want to archive this issue? This action cannot be undone.")) {
            try {
                // We'll give it a new status to filter it out permanently
                await updateJobStatus(jobId, 'Archived - Issue');
                alert("Issue has been archived.");
            } catch (error) {
                console.error("Failed to archive issue:", error);
                alert("Error: Could not archive the issue.");
            }
        }
    };

    return (
        <>
            <MainLayout>
                <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-white">Jobs Requiring Attention</h2>

                    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-600 bg-gray-900/50">
                                        <th className="p-3 text-sm font-semibold text-gray-400">Part</th>
                                        <th className="p-3 text-sm font-semibold text-gray-400">Employee</th>
                                        <th className="p-3 text-sm font-semibold text-gray-400">Reason for Rejection</th>
                                        <th className="p-3 text-sm font-semibold text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="4" className="text-center p-8 text-gray-400">Loading issues...</td></tr>
                                    ) : issueJobs.length === 0 ? (
                                        <tr><td colSpan="4" className="text-center p-8 text-gray-400">No jobs require attention.</td></tr>
                                    ) : (
                                        issueJobs.map(job => (
                                            <tr key={job.id} className="border-b border-gray-700">
                                                <td className="p-3 text-gray-200">{job.partName} <span className="text-xs text-gray-500 block">{job.jobId}</span></td>
                                                <td className="p-3 text-gray-300">{job.employeeName}</td>
                                                <td className="p-3 text-red-400 italic">{job.issueReason || 'No reason provided.'}</td>
                                                <td className="p-3 text-right flex gap-2 justify-end">
                                                    <Button variant="secondary" onClick={() => setSelectedJob(job)}>View Details</Button>
                                                    <Button variant="danger" onClick={() => handleArchive(job.id)}>Archive</Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </MainLayout>

            {/* Reuse the JobDetailsModal we already built! */}
            {selectedJob && (
                <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} />
            )}
        </>
    );
};

export default IssuesPage;