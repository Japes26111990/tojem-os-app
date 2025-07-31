// src/pages/IssuesPage.jsx (Upgraded with Toasts)

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, updateDocument, getEmployees, getAllInventoryItems, getTools, getToolAccessories, deleteDocument } from '../api/firestore';
import JobDetailsModal from '../components/features/tracking/JobDetailsModal';
import Button from '../components/ui/Button';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, HardHat } from 'lucide-react';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

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

                // --- FIX: Destructure the 'jobs' array from the object ---
                unsubscribeJobs = listenToJobCards(({ jobs: fetchedJobs }) => {
                    if (Array.isArray(fetchedJobs)) {
                        setJobs(fetchedJobs);
                    }
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

    const { haltedJobs, qcRejectedJobs } = useMemo(() => {
        // Add a guard clause to ensure 'jobs' is an array
        if (!Array.isArray(jobs)) {
            return { haltedJobs: [], qcRejectedJobs: [] };
        }
        const halted = jobs.filter(job => job.status === 'Halted - Issue');
        const rejected = jobs.filter(job => job.status === 'Issue');
        return { haltedJobs: halted, qcRejectedJobs: rejected };
    }, [jobs]);

    const handleArchive = (jobId) => {
        // --- REPLACE window.confirm ---
        toast((t) => (
            <span>
                Are you sure you want to archive this issue?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    updateDocument('createdJobCards', jobId, { status: 'Archived - Issue' })
                        .then(() => toast.success("Issue has been archived."))
                        .catch(err => {
                            toast.error("Error: Could not archive the issue.");
                            console.error("Failed to archive issue:", err);
                        });
                    toast.dismiss(t.id);
                }}>
                    Archive
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), { icon: 'âš ï¸ ' });
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
        try {
            await deleteDocument('createdJobCards', jobDocId);
            toast.success("Job deleted successfully!"); // --- REPLACE ALERT ---
            setSelectedJob(null);
            navigate('/issues', { replace: true });
        } catch (error) {
            console.error("Error deleting job from modal:", error);
            toast.error("Failed to delete job."); // --- REPLACE ALERT ---
        }
    };

    const handleCloseModal = () => {
        setSelectedJob(null);
        navigate('/issues', { replace: true });
    };

    return (
        <>
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Issues & Halts</h2>
                
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><HardHat className="text-yellow-400"/> Live Halted Jobs (Andon Cord)</h3>
                    <div className="bg-gray-800 rounded-lg border border-yellow-500/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-600 bg-gray-900/50">
                                        <th className="p-3 text-sm font-semibold text-gray-400">Part</th>
                                        <th className="p-3 text-sm font-semibold text-gray-400">Employee</th>
                                        <th className="p-3 text-sm font-semibold text-gray-400">Reason for Halt</th>
                                        <th className="p-3 text-sm font-semibold text-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="4" className="text-center p-8 text-gray-400">Loading...</td></tr>
                                    ) : haltedJobs.length === 0 ? (
                                        <tr><td colSpan="4" className="text-center p-8 text-gray-400">No jobs are currently halted on the floor.</td></tr>
                                    ) : (
                                        haltedJobs.map(job => (
                                            <tr key={job.id} className="border-b border-gray-700">
                                                <td className="p-3 text-gray-200">{job.partName} <span className="text-xs text-gray-500 block">{job.jobId}</span></td>
                                                <td className="p-3 text-gray-300">{job.employeeName}</td>
                                                <td className="p-3 text-yellow-400 italic">{(job.issueLog && job.issueLog.length > 0) ? job.issueLog[job.issueLog.length - 1].reason : 'No reason provided.'}</td>
                                                <td className="p-3 text-right flex gap-2 justify-end">
                                                    <Button variant="secondary" onClick={() => setSelectedJob(job)}>Review & Resolve</Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div>
                     <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="text-red-400"/> QC Rejected Jobs</h3>
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
                                        <tr><td colSpan="4" className="text-center p-8 text-gray-400">Loading...</td></tr>
                                    ) : qcRejectedJobs.length === 0 ? (
                                        <tr><td colSpan="4" className="text-center p-8 text-gray-400">No jobs rejected at QC.</td></tr>
                                    ) : (
                                        qcRejectedJobs.map(job => (
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