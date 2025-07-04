// src/components/features/job_cards/JobDetailsPanel.jsx

import React, { useEffect, useState } from 'react';
import { getJobByJobId, listenToJobCards } from '../../../api/firestore';
import toast from 'react-hot-toast';

const JobDetailsPanel = ({ jobId }) => {
  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const jobData = await getJobByJobId(jobId);
        setJob(jobData);

        if (jobData.parentJobId) {
          const unsub = listenToJobCards(all => {
            const siblings = all.filter(j => j.parentJobId === jobData.parentJobId);
            setRelatedJobs(siblings);
          });
          return () => unsub();
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load job details.");
      }
    };

    load();
  }, [jobId]);

  if (!job) return <p className="text-gray-400">Loading job details...</p>;

  return (
    <div className="bg-gray-800 p-6 rounded-xl text-white shadow-lg border border-gray-700">
      <h2 className="text-xl font-bold mb-2">{job.partName}</h2>
      <p className="text-sm text-gray-400 mb-2">{job.jobId}</p>
      <p><strong>Department:</strong> {job.departmentName}</p>
      <p><strong>Employee:</strong> {job.employeeName}</p>
      <p><strong>Status:</strong> {job.status}</p>
      <p><strong>Quantity:</strong> {job.quantity}</p>
      <p><strong>Estimated Time:</strong> {job.estimatedTime} mins</p>
      {job.totalCost && (
        <div className="mt-2">
          <p><strong>Total Cost:</strong> R{job.totalCost.toFixed(2)}</p>
          <ul className="text-sm text-gray-300">
            <li>Material: R{job.materialCost?.toFixed(2)}</li>
            <li>Labor: R{job.laborCost?.toFixed(2)}</li>
            <li>Machine: R{job.machineCost?.toFixed(2)}</li>
          </ul>
        </div>
      )}
      {job.issueReason && (
        <p className="text-red-400 mt-2"><strong>Issue:</strong> {job.issueReason}</p>
      )}

      {job.parentJobId && (
        <div className="mt-4">
          <h4 className="text-lg font-bold mb-1">Linked Stages (Batch ID: {job.parentJobId})</h4>
          <ul className="text-sm bg-gray-700 rounded-lg p-2 space-y-1">
            {relatedJobs.sort((a, b) => a.jobId.localeCompare(b.jobId)).map(j => (
              <li key={j.id} className={`${j.jobId === jobId ? 'text-blue-400' : 'text-white'}`}>
                {j.jobId}: {j.departmentName} — {j.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default JobDetailsPanel;
