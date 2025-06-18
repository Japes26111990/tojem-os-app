import React, { useState, useEffect } from 'react';
import { listenToJobCards } from '../../../api/firestore';

const LiveTimer = ({ job }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        const calculateActiveTime = () => {
            if (!job.startedAt) return 0;
            const now = new Date().getTime();
            const started = job.startedAt.toDate().getTime();
            const paused = job.totalPausedMilliseconds || 0;
            return Math.floor((now - started - paused) / 1000);
        };
        setElapsedSeconds(calculateActiveTime());
        const interval = setInterval(() => {
            setElapsedSeconds(calculateActiveTime());
        }, 1000);
        return () => clearInterval(interval);
    }, [job.startedAt, job.totalPausedMilliseconds]);

    if (!job.startedAt) return null;

    const estimatedSeconds = (job.estimatedTime || 0) * 60;
    const isOverTime = estimatedSeconds > 0 && elapsedSeconds > estimatedSeconds;
    const timerColor = isOverTime ? 'text-red-400' : 'text-green-400';

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const formattedTime = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

    return <span className={`font-semibold ${timerColor}`}>{formattedTime}</span>;
};


const StatusBadge = ({ status }) => {
  const statusColors = {
    'Pending': 'bg-yellow-500/20 text-yellow-300',
    'In Progress': 'bg-blue-500/20 text-blue-300',
    'Paused': 'bg-gray-500/20 text-gray-300',
    'Awaiting QC': 'bg-purple-500/20 text-purple-300',
    'Complete': 'bg-green-500/20 text-green-300',
    'Issue': 'bg-red-500/20 text-red-400',
  };
  return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-500/20 text-gray-300'}`}>{status}</span>;
};

const EfficiencyBadge = ({ actualMinutes, estimatedMinutes }) => {
    if (!actualMinutes || !estimatedMinutes) return <span className="text-xs text-gray-500">N/A</span>;
    const efficiency = (estimatedMinutes / actualMinutes) * 100;
    let color = 'bg-yellow-500/20 text-yellow-300';
    if (efficiency < 90) color = 'bg-red-500/20 text-red-400';
    if (efficiency > 110) color = 'bg-green-500/20 text-green-400';
    return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${color}`}>{Math.round(efficiency)}%</span>
};

const LiveTrackingTable = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToJobCards((fetchedJobs) => {
      setJobs(fetchedJobs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  const formatFinalDuration = (job) => {
    if (!job.startedAt || !job.completedAt) return null;
    let durationSeconds = job.completedAt.seconds - job.startedAt.seconds;
    if (job.totalPausedMilliseconds) {
        durationSeconds -= Math.floor(job.totalPausedMilliseconds / 1000);
    }
    if (durationSeconds < 0) return null;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return { text: `${minutes}m ${seconds}s`, totalMinutes: minutes + seconds / 60 };
  };

  if (loading) return <p className="text-center text-gray-400">Loading jobs...</p>;

  return (
    <div className="bg-gray-800 p-2 sm:p-6 rounded-xl border border-gray-700 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="p-3 text-sm font-semibold text-gray-400">Created</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Part</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Employee</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Status</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Active / Actual Time</th>
              <th className="p-3 text-sm font-semibold text-gray-400">Efficiency</th>
              {/* --- NEW COLUMN --- */}
              <th className="p-3 text-sm font-semibold text-gray-400 text-right">Job Cost</th>
            </tr>
          </thead>
          <tbody>
            {(jobs || []).map(job => {
                const finalDuration = formatFinalDuration(job);
                return (
                    <tr key={job.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="p-3 text-gray-300 text-sm">{formatDate(job.createdAt)}</td>
                        <td className="p-3 text-gray-300">{job.partName}</td>
                        <td className="p-3 text-gray-300">{job.employeeName}</td>
                        <td className="p-3"><StatusBadge status={job.status} /></td>
                        <td className="p-3 text-gray-300 text-sm">
                            {job.status === 'In Progress' ? (<LiveTimer job={job} />) : (finalDuration ? finalDuration.text : 'N/A')}
                        </td>
                        <td className="p-3"><EfficiencyBadge actualMinutes={finalDuration?.totalMinutes} estimatedMinutes={job.estimatedTime} /></td>
                        {/* --- NEW CELL --- */}
                        <td className="p-3 text-gray-200 text-sm font-semibold font-mono text-right">
                            {job.totalCost ? `R ${job.totalCost.toFixed(2)}` : 'N/A'}
                        </td>
                    </tr>
                )
            })}
          </tbody>
        </table>
        {jobs.length === 0 && !loading && <p className="text-center p-8 text-gray-400">No jobs found.</p>}
      </div>
    </div>
  );
};

export default LiveTrackingTable;