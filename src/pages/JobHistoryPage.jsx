// src/pages/JobHistoryPage.jsx

import React, { useState, useEffect } from 'react';
import { listenToJobCards } from '../api/firestore';
import JobDetailsPanel from '../components/features/job_cards/JobDetailsPanel';
import Input from '../components/ui/Input';

const JobHistoryPage = () => {
  const [allJobs, setAllJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(null);

  useEffect(() => {
    const unsub = listenToJobCards(jobs => {
      const completedJobs = jobs.filter(j =>
        ['Complete', 'Issue', 'Awaiting QC', 'Halted - Issue'].includes(j.status)
      );
      setAllJobs(completedJobs);
    });
    return () => unsub();
  }, []);

  const filteredJobs = allJobs.filter(job =>
    job.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.jobId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Job History</h1>
      <Input
        label="Search by Part, Job ID, or Department"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          {filteredJobs.slice(0, 100).map(job => (
            <div
              key={job.id}
              onClick={() => setSelectedJobId(job.jobId)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                job.jobId === selectedJobId ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <p className="font-bold">{job.partName} ({job.jobId})</p>
              <p className="text-xs">{job.departmentName} — {job.status}</p>
            </div>
          ))}
        </div>

        <div>
          {selectedJobId ? (
            <JobDetailsPanel jobId={selectedJobId} />
          ) : (
            <p className="text-gray-400 text-sm text-center">Select a job to view details</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobHistoryPage;
