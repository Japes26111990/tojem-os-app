import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, processQcDecision } from '../../../api/firestore'; // Use the new function
import Button from '../../ui/Button';

const QcQueue = () => {
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    if (window.confirm(`Are you sure you want to approve this job? This will deduct used items from stock.`)) {
      try {
        await processQcDecision(job, true); // Call with 'true' for approval
        alert('Job approved and stock updated!');
      } catch (err) {
        alert('Failed to process approval.');
        console.error(err);
      }
    }
  };

  const handleReject = async (job) => {
    const reason = prompt(`Please provide a reason for rejecting this job:`);
    if (reason) {
      try {
        await processQcDecision(job, false, reason); // Call with 'false' and a reason for rejection
        alert('Job marked with an issue, and stock has been deducted.');
      } catch (err) {
        alert('Failed to process rejection.');
        console.error(err);
      }
    }
  };

  if (loading) return <p className="text-center text-gray-400">Loading QC queue...</p>;

  return (
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
                  <Button onClick={() => handleReject(job)} variant="danger" className="py-1 px-3 text-sm">Reject</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {qcJobs.length === 0 && !loading && <p className="text-center p-8 text-gray-400">The QC queue is empty.</p>}
      </div>
    </div>
  );
};

export default QcQueue;
