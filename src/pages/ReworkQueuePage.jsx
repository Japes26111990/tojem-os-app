import React, { useEffect, useState } from 'react';
import { listenToReworkQueue, resolveReworkJob } from '../api/firestore';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const ReworkQueuePage = () => {
  const [reworks, setReworks] = useState([]);

  useEffect(() => {
    const unsub = listenToReworkQueue(setReworks);
    return () => unsub();
  }, []);

  const handleResolve = async (jobId) => {
    try {
      await resolveReworkJob(jobId);
      toast.success('Rework marked as resolved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to resolve rework');
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Rework Queue</h1>

      {reworks.length === 0 && (
        <p className="text-gray-400">No rework jobs currently pending.</p>
      )}

      <div className="space-y-4">
        {reworks.map(job => (
          <div
            key={job.id}
            className="bg-gray-800 border border-yellow-500/30 rounded p-4"
          >
            <p className="text-lg font-semibold text-yellow-400">
              {job.partName} – Job #{job.jobId}
            </p>
            <p className="text-sm text-gray-300">
              Reason: {job.reworkReason || 'N/A'}
            </p>
            <p className="text-sm text-gray-400">
              Department: {job.departmentName} | Qty: {job.quantity}
            </p>
            <Button
              className="mt-2 bg-green-600"
              onClick={() => handleResolve(job.jobId)}
            >
              Mark as Resolved
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReworkQueuePage;
