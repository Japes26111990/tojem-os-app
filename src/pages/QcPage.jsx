// src/pages/QcPage.jsx (Upgraded with Toasts & Rejection Modal)

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, processQcDecision, getReworkReasons, getEmployees } from '../api/firestore';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

const RejectionModal = ({ job, reasons, onReject, onClose }) => {
    const [rejectionReasonId, setRejectionReasonId] = useState('');
    const [notes, setNotes] = useState('');
    const [preventDeduction, setPreventDeduction] = useState(false);
    const [requeueForRework, setRequeueForRework] = useState(false);
    const [reworkEmployeeId, setReworkEmployeeId] = useState('');
    const [allEmployees, setAllEmployees] = useState([]);

    useEffect(() => {
        getEmployees().then(setAllEmployees);
    }, []);

    const handleSubmit = () => {
        if (!rejectionReasonId) {
            return toast.error("Please select a reason for rejection.");
        }
        const reasonText = reasons.find(r => r.id === rejectionReasonId)?.name || 'Other';
        const fullReason = notes ? `${reasonText}: ${notes}` : reasonText;
        const selectedEmployee = allEmployees.find(emp => emp.id === reworkEmployeeId);

        const options = {
            rejectionReason: fullReason,
            preventStockDeduction: preventDeduction,
            reworkDetails: {
                requeue: requeueForRework,
                newEmployeeId: reworkEmployeeId || null,
                newEmployeeName: selectedEmployee ? selectedEmployee.name : null
            }
        };
        onReject(job, options);
    };

    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Reject Job: {job.partName}</h3>
                    <Button onClick={onClose} variant="secondary" className="p-2"><X size={20}/></Button>
                </div>
                <div className="p-6 space-y-4">
                    <Dropdown 
                        label="Reason for Rejection" 
                        options={reasons} 
                        value={rejectionReasonId} 
                        onChange={(e) => setRejectionReasonId(e.target.value)} 
                        placeholder="Select a failure mode..." 
                    />
                    <textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder="Add optional specific notes here..." 
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        rows="3"
                    ></textarea>
                    
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={preventDeduction} onChange={(e) => setPreventDeduction(e.target.checked)} className="h-4 w-4 rounded bg-gray-700 text-blue-600"/>
                        Do NOT deduct stock (parts are salvageable)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                        <input type="checkbox" checked={requeueForRework} onChange={(e) => setRequeueForRework(e.target.checked)} className="h-4 w-4 rounded bg-gray-700 text-blue-600"/>
                        Re-queue job for rework
                    </label>
                    {requeueForRework && (
                        <div className="animate-fade-in pl-6">
                            <Dropdown
                                label="Assign Rework to (Optional)"
                                options={allEmployees}
                                value={reworkEmployeeId}
                                onChange={(e) => setReworkEmployeeId(e.target.value)}
                                placeholder="Keep original employee or re-assign..."
                            />
                        </div>
                    )}
                </div>
                <div className="p-4 flex justify-end gap-2 bg-gray-900/50 rounded-b-xl">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSubmit} variant="danger">Confirm Rejection</Button>
                </div>
            </div>
        </div>
    );
};


const QcPage = () => {
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [jobToReject, setJobToReject] = useState(null); // State to control the modal

  useEffect(() => {
    const fetchReasons = async () => {
        const reasons = await getReworkReasons();
        setRejectionReasons(reasons);
    };
    fetchReasons();

    const unsubscribe = listenToJobCards((fetchedJobs) => {
       setAllJobs(fetchedJobs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const qcJobs = useMemo(() => {
    return allJobs.filter(job => job.status === 'Awaiting QC');
  }, [allJobs]);

  const handleApprove = async (job) => {
    // We use toast.promise to give the user immediate feedback
    const promise = processQcDecision(job, true);

    toast.promise(promise, {
        loading: `Approving job ${job.jobId}...`,
        success: 'Job approved and stock updated!',
        error: 'Failed to process approval.'
    });
  };

  const handleReject = async (job, options) => {
    const promise = processQcDecision(job, false, options);
    
    toast.promise(promise, {
        loading: 'Processing rejection...',
        success: 'Job rejection processed successfully.',
        error: 'Failed to process rejection.'
    });

    try {
        await promise;
        setJobToReject(null); // Close the modal on success
    } catch (err) {
        console.error(err); // The error is already shown by the toast
    }
  };

  if (loading) return <p className="text-center text-gray-400">Loading QC queue...</p>;
  
  return (
    <>
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Quality Control Queue</h2>
            <div className="bg-gray-800 p-2 sm:p-6 rounded-xl border border-gray-700 shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                            <tr className="border-b border-gray-600">
                                 <th className="p-3 text-sm font-semibold text-gray-400">Job ID</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Part</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Employee</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(qcJobs || []).map(job => (
                                 <tr key={job.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3 text-gray-400 text-xs font-mono">{job.jobId}</td>
                                    <td className="p-3 text-gray-300">{job.partName}</td>
                                     <td className="p-3 text-gray-300">{job.employeeName}</td>
                                    <td className="p-3 flex space-x-2">
                                        <Button onClick={() => handleApprove(job)} variant="primary" className="bg-green-600 hover:bg-green-700 py-1 px-3 text-sm">Approve</Button>
                                         <Button onClick={() => setJobToReject(job)} variant="danger" className="py-1 px-3 text-sm">Reject</Button>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                    {qcJobs.length === 0 && !loading && <p className="text-center p-8 text-gray-400">The QC queue is empty.</p>}
                </div>
            </div>
        </div>
        
        {jobToReject && (
             <RejectionModal 
                job={jobToReject}
                reasons={rejectionReasons}
                onClose={() => setJobToReject(null)}
                onReject={handleReject}
            />
        )}
    </>
  );
};

export default QcPage;