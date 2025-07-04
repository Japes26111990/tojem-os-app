// src/pages/ReworkLoopPage.jsx

import React, { useEffect, useState } from 'react';
import {
  listenToJobCards,
  getEmployees,
  updateJobStatus
} from '../api/firestore';
import Dropdown from '../components/ui/Dropdown';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';

const ReworkLoopPage = () => {
  const [jobsWithIssues, setJobsWithIssues] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [reassignments, setReassignments] = useState({});

  useEffect(() => {
    const unsub = listenToJobCards(jobs => {
      const issueJobs = jobs.filter(j =>
        ['Issue', 'Halted - Issue'].includes(j.status)
      );
      setJobsWithIssues(issueJobs);
    });

    getEmployees().then(setEmployees);
    return () => unsub();
  }, []);

  const handleReassign = (jobId, employeeId) => {
    setReassignments(prev => ({ ...prev, [jobId]: employeeId }));
  };

  const processRework = async (job) => {
    const newEmployeeId = reassignments[job.id];
    const selectedEmployee = employees.find(e => e.id === newEmployeeId);
    const newName = selectedEmployee?.name || job.employeeName;

    try {
      await updateJobStatus(job.id, 'Pending', {
        haltReason: `REWORK: ${job.issueReason || 'Manual reassign'}`
      });

      await updateJobStatus(job.id, 'Pending', {
        haltReason: 'Rework restart',
        ...{
          employeeId: newEmployeeId,
          employeeName: newName
        }
      });

      toast.success(`Reassigned ${job.jobId} to ${newName}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to reassign job.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Rework Queue</h1>
      {jobsWithIssues.length === 0 ? (
        <p className="text-gray-400 text-sm">No jobs awaiting rework.</p>
      ) : (
        <div className="space-y-4">
          {jobsWithIssues.map(job => (
            <div key={job.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-white">{job.partName} ({job.jobId})</h3>
              <p className="text-gray-400 text-sm mb-2">
                Dept: {job.departmentName} | Current: {job.employeeName} | Status: {job.status}
              </p>
              <p className="text-yellow-400 text-sm mb-2">
                Issue: {job.issueReason || 'No reason recorded'}
              </p>
              <Dropdown
                label="Reassign to:"
                options={employees.map(e => ({ label: e.name, value: e.id }))}
                value={reassignments[job.id] || job.employeeId}
                onChange={(val) => handleReassign(job.id, val)}
              />
              <Button className="mt-2" onClick={() => processRework(job)}>
                Reassign & Relaunch Job
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReworkLoopPage;
