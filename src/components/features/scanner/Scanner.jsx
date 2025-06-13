import React, { useState } from 'react';
import { getJobByJobId, updateJobStatus } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const Scanner = () => {
  const [jobIdInput, setJobIdInput] = useState('');
  const [foundJob, setFoundJob] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFindJob = async (e) => {
    e.preventDefault();
    if (!jobIdInput.trim()) return;
    setLoading(true);
    setError('');
    setFoundJob(null);
    try {
      const job = await getJobByJobId(jobIdInput);
      setFoundJob(job);
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
      alert(`Job status for ${foundJob.jobId} updated to "${newStatus}"!`);
      // Reset the scanner for the next job
      setFoundJob(null);
      setJobIdInput('');
      setError('');
    } catch (err) {
      setError("Failed to update status. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-2xl mx-auto">
      <form onSubmit={handleFindJob} className="flex items-center space-x-4">
        <Input
          name="jobId"
          value={jobIdInput}
          onChange={(e) => setJobIdInput(e.target.value)}
          placeholder="Scan or type Job ID..."
          className="flex-grow"
        />
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
            {/* We can add more logic here later to show/hide buttons based on current status */}
            <Button onClick={() => handleUpdateStatus('In Progress')}>Start Job</Button>
            <Button onClick={() => handleUpdateStatus('Paused')} variant="secondary">Pause</Button>
            <Button onClick={() => handleUpdateStatus('Awaiting QC')} >Complete Job</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;