// src/components/features/scanner/Scanner.jsx (Upgraded with Camera Scanning)

import React, { useState } from 'react';
import { getJobByJobId, updateJobStatus } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { ShieldAlert, QrCode } from 'lucide-react'; // --- IMPORT QrCode ICON ---
import toast from 'react-hot-toast';
import QrScannerModal from './QrScannerModal'; // --- IMPORT THE NEW MODAL ---

const Scanner = () => {
  const [jobIdInput, setJobIdInput] = useState('');
  const [foundJob, setFoundJob] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false); // --- STATE FOR MODAL ---

  const handleFindJob = async (e) => {
    e.preventDefault();
    if (!jobIdInput.trim()) return;
    
    setLoading(true);
    setError('');
    setFoundJob(null);

    try {
      const job = await getJobByJobId(jobIdInput);
      setFoundJob(job);
      toast.success(`Found job: ${job.partName}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!foundJob) return;
    try {
      await updateJobStatus(foundJob.id, newStatus);
      toast.success(`Job status updated to "${newStatus}"!`);
      setFoundJob(null);
      setJobIdInput('');
      setError('');
    } catch (err) {
      setError("Failed to update status. Please try again.");
      console.error(err);
    }
  };
  
  const handleFlagIssue = async () => {
    if (!foundJob) return;

    toast((t) => (
      <div className="flex flex-col gap-2">
        <span>Please provide a reason for halting this job:</span>
        <input
          id="halt-reason-input"
          type="text"
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          placeholder="e.g., material defect..."
        />
        <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={() => {
                const reason = document.getElementById('halt-reason-input').value;
                if (reason && reason.trim()) {
                    updateJobStatus(foundJob.id, 'Halted - Issue', { haltReason: reason.trim() })
                        .then(() => {
                            toast.success(`Job ${foundJob.jobId} halted. Management notified.`);
                            setFoundJob(null);
                            setJobIdInput('');
                            setError('');
                        })
                        .catch(err => {
                            setError("Failed to halt job. Please try again.");
                            console.error(err);
                        });
                    toast.dismiss(t.id);
                } else {
                    toast.error("A reason is required to halt a job.");
                }
            }}>
                Halt Job
            </Button>
            <Button variant="secondary" size="sm" onClick={() => toast.dismiss(t.id)}>
                Cancel
            </Button>
        </div>
      </div>
    ));
  };

  // --- HANDLER FOR SUCCESSFUL SCAN ---
  const handleScanSuccess = (decodedText) => {
    setJobIdInput(decodedText);
    setIsScannerOpen(false);
  };

  return (
    <>
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl mx-auto">
        <form onSubmit={handleFindJob} className="flex items-center space-x-2">
          <div className="relative flex-grow">
            <Input
              name="jobId"
              value={jobIdInput}
              onChange={(e) => setJobIdInput(e.target.value)}
              placeholder="Scan or type Job ID..."
              className="pl-10"
            />
            <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          {/* --- BUTTON TO OPEN SCANNER MODAL --- */}
          <Button type="button" variant="secondary" onClick={() => setIsScannerOpen(true)}>
            Scan
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Finding...' : 'Find Job'}
          </Button>
        </form>

        {error && <p className="mt-4 text-center text-red-400">{error}</p>}

        {foundJob && (
          <div className="mt-6 border-t border-gray-700 pt-6">
            <h3 className="text-xl font-bold text-white">{foundJob.partName}</h3>
            <p className="text-gray-400">Assigned to: {foundJob.employeeName}</p>
            <p className="text-gray-400">Current Status: <span className="font-semibold text-yellow-300">{foundJob.status}</span></p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button onClick={() => handleUpdateStatus('In Progress')}>Start / Resume</Button>
              <Button onClick={() => handleUpdateStatus('Paused')} variant="secondary">Pause</Button>
              <Button onClick={() => handleUpdateStatus('Awaiting QC')} >Complete Job</Button>
              
              <Button onClick={handleFlagIssue} variant="danger">
                <ShieldAlert size={16} className="mr-2" />
                Flag Issue
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* --- RENDER THE MODAL CONDITIONALLY --- */}
      {isScannerOpen && (
        <QrScannerModal 
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </>
  );
};

export default Scanner;
