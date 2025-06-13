import React, { useState, useEffect } from 'react';
import { listenToJobCards } from '../../../api/firestore';

// A small sub-component to make the status look nice
const StatusBadge = ({ status }) => {
  const statusColors = {
    'Pending': 'bg-yellow-500/20 text-yellow-300',
    'In Progress': 'bg-blue-500/20 text-blue-300',
    'Awaiting QC': 'bg-purple-500/20 text-purple-300',
    'Complete': 'bg-green-500/20 text-green-300',
    'Issue': 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {status}
    </span>
  );
};

const LiveTrackingTable = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Subscribe to the live job card data
    const unsubscribe = listenToJobCards((fetchedJobs) => {
      setJobs(fetchedJobs);
      setLoading(false);
    });

    // When the component unmounts, unsubscribe from the listener to prevent memory leaks
    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Firestore timestamps have to be converted to JS Dates
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  if (loading) return <p className="text-center text-gray-400">Loading jobs...</p>;

  return (
    <div className="bg-gray-800 p-2 sm:p-6 rounded-xl border border-gray-700 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="p-3 text-sm font-semibold text-gray-400">Created</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Job ID</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Part</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Employee</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {(jobs || []).map(job => (
              <tr key={job.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                <td className="p-3 text-gray-300 text-sm">{formatDate(job.createdAt)}</td>
                <td className="p-3 text-gray-400 text-xs font-mono">{job.jobId}</td>
                <td className="p-3 text-gray-300">{job.partName}</td>
                <td className="p-3 text-gray-300">{job.employeeName}</td>
                <td className="p-3"><StatusBadge status={job.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && !loading && <p className="text-center p-8 text-gray-400">No jobs found. Go to the Job Creator to create one!</p>}
      </div>
    </div>
  );
};

export default LiveTrackingTable;