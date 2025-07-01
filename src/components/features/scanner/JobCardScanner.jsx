// src/components/features/scanner/JobCardScanner.jsx

import React, { useState, useEffect, useRef } from 'react';
import { getJobByJobId, updateJobStatus, getDepartments, getEmployees, updateDocument } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { ShieldAlert, QrCode, X, User, CheckCircle, PauseCircle, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import QrScannerModal from './QrScannerModal';

const JobCardScanner = () => {
    const [jobIdInput, setJobIdInput] = useState('');
    const [jobData, setJobData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Initialize isScannerOpen to false. It will only open when the user clicks the "Scan Job Card" button.
    const [isScannerOpen, setIsScannerOpen] = useState(false); 
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedEmp, setSelectedEmp] = useState('');
    const wakeLockRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            const [depts, emps] = await Promise.all([getDepartments(), getEmployees()]);
            setDepartments(depts);
            setEmployees(emps);
        };
        fetchInitialData();
    }, []);

    const acquireWakeLock = async () => {
        if ('wakeLock' in navigator) {
            try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                timeoutRef.current = setTimeout(() => {
                    if (wakeLockRef.current) {
                        wakeLockRef.current.release();
                        wakeLockRef.current = null;
                    }
                }, 300000); // 5 minutes
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
            }
        }
    };

    const releaseWakeLock = () => {
        if (wakeLockRef.current) {
            wakeLockRef.current.release();
            wakeLockRef.current = null;
            clearTimeout(timeoutRef.current);
        }
    };

    const handleFindJob = async (scannedId) => {
        const idToFind = scannedId || jobIdInput;
        if (!idToFind.trim()) return;

        setLoading(true);
        try {
            const job = await getJobByJobId(idToFind.trim());
            setJobData(job);
            setIsModalOpen(true); // Open the job details modal
            setIsScannerOpen(false); // Close the scanner when the job modal opens
            await acquireWakeLock();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
            setJobIdInput('');
        }
    };

    const handleScanSuccess = (decodedText) => {
        // When a QR code is successfully scanned, trigger the job lookup
        handleFindJob(decodedText);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setJobData(null);
        setSelectedDept('');
        setSelectedEmp('');
        releaseWakeLock();
        setIsScannerOpen(true); // Automatically re-open the scanner after the modal closes
    };

    const handleAssignment = async () => {
        if (!selectedEmp) return toast.error("Please select an employee.");
        const employee = employees.find(e => e.id === selectedEmp);
        if (!employee) return toast.error("Selected employee not found.");

        try {
            await updateDocument('createdJobCards', jobData.id, {
                employeeId: employee.id,
                employeeName: employee.name
            });
            toast.success(`Job assigned to ${employee.name}`);
            // Re-fetch job data to update the modal with the new assignment
            const updatedJob = await getJobByJobId(jobData.jobId);
            setJobData(updatedJob);
        } catch (error) {
            toast.error("Failed to assign job.");
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!jobData.employeeId || jobData.employeeId === 'unassigned') {
            return toast.error("Please assign an employee before starting the job.");
        }
        
        const promise = updateJobStatus(jobData.id, newStatus);
        
        toast.promise(promise, {
            loading: 'Updating status...',
            success: `Job status updated to "${newStatus}"!`,
            error: 'Failed to update status.',
        });

        await promise;
        handleCloseModal(); // This will now automatically re-open the scanner
    };
    
    // --- RESTORED: Halt Job Functionality ---
    const handleFlagIssue = () => {
        if (!jobData) return;
        toast((t) => (
            <div className="flex flex-col gap-2 p-2">
                <span className="font-bold text-white">Halt Job: {jobData.partName}</span>
                <p className="text-sm text-gray-300">Please provide a reason for halting this job:</p>
                <Input
                  id="halt-reason-input"
                  placeholder="e.g., material defect, tool problem..."
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                    <Button variant="danger" size="sm" onClick={() => {
                        const reason = document.getElementById('halt-reason-input').value;
                        if (reason && reason.trim()) {
                            updateJobStatus(jobData.id, 'Halted - Issue', { haltReason: reason.trim() })
                                .then(() => {
                                    toast.success(`Job halted. Management notified.`);
                                    handleCloseModal(); // This will now automatically re-open the scanner
                                })
                                .catch(err => toast.error("Failed to halt job."));
                            toast.dismiss(t.id);
                        } else {
                            toast.error("A reason is required to halt a job.");
                        }
                    }}>
                        Confirm Halt
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => toast.dismiss(t.id)}>
                        Cancel
                    </Button>
                </div>
            </div>
        ), { duration: 15000 }); // Give user more time to type
    };

    const filteredEmployees = employees.filter(e => e.departmentId === selectedDept);

    // Determine button disabled states and styles based on current job status
    const isPending = jobData?.status === 'Pending';
    const isInProgress = jobData?.status === 'In Progress';
    const isPaused = jobData?.status === 'Paused';
    const isHalted = jobData?.status === 'Halted - Issue';
    const isCompletedOrIssue = jobData?.status === 'Complete' || jobData?.status === 'Issue' || jobData?.status === 'Archived - Issue';

    return (
        <>
            {/* This div contains the main content of the scanner page, including the "Scan Job Card" button */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl mx-auto text-center">
                <h3 className="text-2xl font-bold text-white mb-4">Job Card Scanner</h3>
                <p className="text-gray-400 mb-6">Scan a job card's QR code to begin.</p>
                {/* Button to manually open the scanner */}
                <Button 
                    variant="primary" 
                    className="w-full max-w-xs mx-auto py-4 text-lg"
                    onClick={() => setIsScannerOpen(true)} // This button explicitly opens the scanner
                >
                    <QrCode size={24} className="mr-2"/>
                    Scan Job Card
                </Button>
            </div>

            {/* This modal displays job details after a scan */}
            {isModalOpen && jobData && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
                        <div className="flex justify-between items-center p-4 border-b border-gray-700">
                            <h3 className="text-xl font-bold text-white">{jobData.partName}</h3>
                            <Button onClick={handleCloseModal} variant="secondary" className="p-2"><X size={20}/></Button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-400">Current Status</p>
                                <p className="text-lg font-bold text-yellow-300">{jobData.status}</p>
                            </div>
                            
                            <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
                                <div className="flex items-center gap-3">
                                    <User size={20} className="text-gray-400"/>
                                    <div>
                                        <p className="text-sm text-gray-400">Assigned To</p>
                                        <p className="font-semibold text-white">{jobData.employeeName || 'Unassigned'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 items-end">
                                    <Dropdown label="Department" options={departments} value={selectedDept} onChange={e => setSelectedDept(e.target.value)} placeholder="Select Dept..."/>
                                    <Dropdown label="Employee" options={filteredEmployees} value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} placeholder="Select Employee..." disabled={!selectedDept}/>
                                </div>
                                <Button onClick={handleAssignment} className="w-full" disabled={!selectedEmp}>Assign / Re-assign</Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {/* Start / Resume Button */}
                                <Button 
                                    onClick={() => handleStatusUpdate('In Progress')} 
                                    disabled={!jobData.employeeId || jobData.employeeId === 'unassigned' || isInProgress || isCompletedOrIssue} 
                                    className="flex-col h-20"
                                    variant={isInProgress ? 'secondary' : 'primary'} // Indicate active status
                                >
                                    <PlayCircle/>
                                    <span className="mt-1 text-xs">{isInProgress ? 'In Progress' : 'Start / Resume'}</span>
                                </Button>
                                {/* Pause Button */}
                                <Button 
                                    onClick={() => handleStatusUpdate('Paused')} 
                                    variant={isPaused ? 'secondary' : 'primary'} // Indicate active status
                                    disabled={!isInProgress || isCompletedOrIssue} 
                                    className="flex-col h-20"
                                >
                                    <PauseCircle/>
                                    <span className="mt-1 text-xs">{isPaused ? 'Paused' : 'Pause'}</span>
                                </Button>
                                {/* Complete Button */}
                                <Button 
                                    onClick={() => handleStatusUpdate('Awaiting QC')} 
                                    variant="success" 
                                    disabled={!isInProgress && !isPaused || isCompletedOrIssue} 
                                    className="flex-col h-20"
                                >
                                    <CheckCircle/>
                                    <span className="mt-1 text-xs">Complete</span>
                                </Button>
                                {/* Halt Job Button */}
                                <Button 
                                    onClick={handleFlagIssue} 
                                    variant="danger" 
                                    disabled={!isInProgress && !isPaused || isCompletedOrIssue || isHalted} 
                                    className="flex-col h-20"
                                >
                                    <ShieldAlert/>
                                    <span className="mt-1 text-xs">{isHalted ? 'Halted' : 'Halt Job'}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* This modal is the actual QR scanner camera feed */}
            {isScannerOpen && (
                <QrScannerModal 
                    onClose={() => setIsScannerOpen(false)} // Allow manual close of scanner
                    onScanSuccess={handleScanSuccess}
                />
            )}
        </>
    );
};

export default JobCardScanner;
