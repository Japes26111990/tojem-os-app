import React, { useState, useEffect } from 'react';
import { getCompletedJobsForEmployee } from '../../api/firestore';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const JobCompletionAnalysisWidget = ({ employeeId }) => {
    const [stats, setStats] = useState({ onTime: 0, late: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const calculateStats = async () => {
            if (!employeeId) return;
            setLoading(true);

            try {
                const completedJobs = await getCompletedJobsForEmployee(employeeId);
                
                let onTimeCount = 0;
                let lateCount = 0;

                completedJobs.forEach(job => {
                    // Ensure the job has the necessary data for comparison
                    if (job.estimatedTime && job.startedAt && job.completedAt) {
                        const startTime = job.startedAt.toDate().getTime();
                        const completionTime = job.completedAt.toDate().getTime();
                        const pauseDuration = job.totalPausedMilliseconds || 0;

                        // Calculate actual duration in minutes
                        const actualDurationMinutes = (completionTime - startTime - pauseDuration) / (1000 * 60);

                        if (actualDurationMinutes <= job.estimatedTime) {
                            onTimeCount++;
                        } else {
                            lateCount++;
                        }
                    }
                });

                setStats({
                    onTime: onTimeCount,
                    late: lateCount,
                    total: onTimeCount + lateCount // Only count jobs that could be analyzed
                });

            } catch (error) {
                console.error("Error fetching or calculating job completion stats:", error);
                alert("Could not load job completion stats.");
            }
            setLoading(false);
        };

        calculateStats();
    }, [employeeId]);
    
    const onTimePercentage = stats.total > 0 ? (stats.onTime / stats.total) * 100 : 0;

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Job Completion Analysis</h3>
            {loading ? (
                <p className="text-gray-400">Analyzing job history...</p>
            ) : stats.total === 0 ? (
                <p className="text-gray-400">No completed jobs with time estimates found for this employee.</p>
            ) : (
                <div className="space-y-4">
                    {/* KPI Cards for On-Time and Late */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-500/10 p-4 rounded-lg text-center">
                            <CheckCircle2 className="mx-auto text-green-400 mb-2" size={28} />
                            <p className="text-2xl font-bold text-white">{stats.onTime}</p>
                            <p className="text-sm text-green-400">On-Time / Early</p>
                        </div>
                        <div className="bg-red-500/10 p-4 rounded-lg text-center">
                            <AlertTriangle className="mx-auto text-red-400 mb-2" size={28} />
                            <p className="text-2xl font-bold text-white">{stats.late}</p>
                            <p className="text-sm text-red-400">Late</p>
                        </div>
                    </div>

                    {/* Proportional Bar */}
                    <div>
                        <p className="text-center text-sm text-gray-300 mb-2">
                            On-Time Completion Rate: <span className="font-bold text-white">{onTimePercentage.toFixed(0)}%</span>
                        </p>
                        <div className="flex h-4 w-full bg-red-500/20 rounded-full overflow-hidden border border-gray-700">
                            <div 
                                style={{ width: `${onTimePercentage}%` }}
                                className="bg-green-500 transition-all duration-500"
                            ></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobCompletionAnalysisWidget;