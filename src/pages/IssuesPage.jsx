import React, { useState, useEffect, useMemo } from 'react';
// MainLayout import removed
import { listenToJobCards, updateJobStatus, getEmployees, getAllInventoryItems, getTools, getToolAccessories, deleteDocument } from '../api/firestore';
import JobDetailsModal from '../components/features/tracking/JobDetailsModal';
import Button from '../components/ui/Button';
import { useSearchParams, useNavigate } from 'react-router-dom';

const IssuesPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);
    const [employeeHourlyRates, setEmployeeHourlyRates] = useState({});
    const [allEmployees, setAllEmployees] = useState([]);
    const [allInventoryItems, setAllInventoryItems] = useState([]);
    const [allTools, setAllTools] = useState([]);
    const [allToolAccessories, setAllToolAccessories] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        let unsubscribeJobs;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [fetchedEmployees, fetchedInventory, fetchedTools, fetchedToolAccessories] = await Promise.all([
                    getEmployees(),
                    getAllInventoryItems(),
                    getTools(),
                    getToolAccessories(),
                ]);
                setAllEmployees(fetchedEmployees);
                setAllInventoryItems(fetchedInventory);
                setAllTools(fetchedTools);
                setAllToolAccessories(fetchedToolAccessories);

                const rates = fetchedEmployees.reduce((acc, emp) => {
                    acc[emp.id] = emp.hourlyRate || 0;
                    return acc;
                }, {});
                setEmployeeHourlyRates(rates);

                unsubscribeJobs = listenToJobCards((fetchedJobs) => {
                    setJobs(fetchedJobs);
                    setLoading(false);
                });
            } catch (error) {
                console.error("Failed to fetch initial data for issues page:", error);
                setLoading(false);
            }
        };

        fetchData();
        return () => { if (unsubscribeJobs) unsubscribeJobs(); };
    }, []);

    useEffect(() => {
        const jobIdFromUrl = searchParams.get('jobId');
        if (jobIdFromUrl && !loading && jobs.length > 0) {
            const jobToOpen = jobs.find(job => job.jobId === jobIdFromUrl);
            if (jobToOpen) {
                setSelectedJob(jobToOpen);
            }
        }
    }, [searchParams, loading, jobs]);

    const issueJobs = useMemo(() => jobs.filter(job => job.status === 'Issue'), [jobs]);

    const handleArchive = async (jobId) => {
        if (window.confirm("Are you sure you want to archive this issue? This action cannot be undone.")) {
            try {
                await updateJobStatus(jobId, 'Archived - Issue');
                alert("Issue has been archived.");
            } catch (error) {
                console.error("Failed to archive issue:", error);
                alert("Error: Could not archive the issue.");
            }
        }
    };

    const handleUpdateJob = async (jobDocId, updatedData) => {
        try {
            await updateDocument('createdJobCards', jobDocId, updatedData);
        } catch (error) {
            console.error("Error updating job from modal:", error);
            throw error;
        }
    };

    const handleDeleteJob = async (jobDocId) => {
        if (window.confirm(`Are you sure you want to permanently delete job "${selectedJob?.jobId}"?`)) {
            try {
                await deleteDocument('createdJobCards', jobDocId);
                alert("Job deleted successfully!");
                setSelectedJob(null);
                navigate('/issues', { replace: true });
            } catch (error) {
                console.error("Error deleting job from modal:", error);
                alert("Failed to delete job.");
            }
        }
    };

    const handleCloseModal = () => {
        setSelectedJob(null);
        navigate('/issues', { replace: true });
    };

    return (
        <>
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

            {selectedJob && (
                <JobDetailsModal 
                    job={selectedJob} 
                    onClose={handleCloseModal}
                    currentTime={Date.now()} 
                    employeeHourlyRates={employeeHourlyRates} 
                    allEmployees={allEmployees} 
                    onUpdateJob={handleUpdateJob} 
                    onDeleteJob={handleDeleteJob} 
                    allInventoryItems={allInventoryItems} 
                    allTools={allTools} 
                    allToolAccessories={allToolAccessories} 
                />
            )}
        </>
    );
};

export default IssuesPage;