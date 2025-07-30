// src/components/intelligence/ValueWasteAnalysis.jsx
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { JOB_STATUSES } from '../../config'; // Import JOB_STATUSES

const ValueWasteAnalysis = ({ jobs }) => {
    const timeAnalysisData = useMemo(() => {
        if (!jobs || jobs.length === 0) {
            return { valueAddedHours: 0, nonValueHours: 0, wastedHours: 0 };
        }

        let valueAddedSeconds = 0;
        let nonValueSeconds = 0; // Paused time
        let wastedSeconds = 0;

        jobs.forEach(job => {
            if (!job.startedAt || !job.completedAt) return;

            const startTime = job.startedAt.toDate().getTime();
            const completionTime = job.completedAt.toDate().getTime();
            const totalDurationSeconds = (completionTime - startTime) / 1000;
            const pauseDurationSeconds = (job.totalPausedMilliseconds || 0) / 1000;
            const actualWorkSeconds = totalDurationSeconds - pauseDurationSeconds;

            if (actualWorkSeconds < 0) return;

            if (job.status === JOB_STATUSES.COMPLETE) { // Use JOB_STATUSES.COMPLETE
                valueAddedSeconds += actualWorkSeconds;
                nonValueSeconds += pauseDurationSeconds;
            } else if (job.status === JOB_STATUSES.ISSUE || job.status === JOB_STATUSES.ARCHIVED_ISSUE) { // Use JOB_STATUSES.ISSUE, JOB_STATUSES.ARCHIVED_ISSUE
                wastedSeconds += actualWorkSeconds;
                nonValueSeconds += pauseDurationSeconds;
            }
        });

        return {
            valueAddedHours: valueAddedSeconds / 3600,
            nonValueHours: nonValueSeconds / 3600,
            wastedHours: wastedSeconds / 3600,
        };
    }, [jobs]);

    const chartData = [
        {
            name: 'Time Allocation',
            valueAdded: timeAnalysisData.valueAddedHours,
            paused: timeAnalysisData.nonValueHours,
            wasted: timeAnalysisData.wastedHours,
        }
    ];

    const totalHours = timeAnalysisData.valueAddedHours + timeAnalysisData.nonValueHours + timeAnalysisData.wastedHours;
    if (totalHours === 0) {
        return (
             <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Value vs. Waste Analysis</h3>
                <p className="text-gray-500 text-center py-10">Not enough job history to analyze time allocation.</p>
            </div>
        )
    }

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Value vs. Waste Analysis (Total Hours Logged)</h3>
            <ResponsiveContainer width="100%" height={150}>
                <BarChart data={chartData} layout="vertical" stackOffset="expand">
                    <XAxis type="number" hide domain={[0, 1]} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip 
                        formatter={(value, name) => [`${(value * 100).toFixed(1)}%`, name]}
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                    />
                    <Legend
                        formatter={(value, entry) => {
                            const { dataKey, color } = entry;
                            const hours = chartData[0][dataKey];
                            return <span style={{ color }}>{value} ({hours.toFixed(1)} hrs)</span>;
                        }}
                        iconType="circle"
                    />
                    <Bar dataKey="valueAdded" name="Value-Added Time" stackId="a" fill="#22c55e" />
                    <Bar dataKey="paused" name="Non-Value Time (Paused)" stackId="a" fill="#eab308" />
                    <Bar dataKey="wasted" name="Wasted Time (Issues)" stackId="a" fill="#ef4444" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ValueWasteAnalysis;
