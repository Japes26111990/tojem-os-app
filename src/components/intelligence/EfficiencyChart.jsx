// src/components/intelligence/EfficiencyChart.jsx (New File)

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/80 p-4 border border-gray-700 rounded-lg shadow-lg">
        <p className="label text-sm text-gray-400">{`Date: ${label}`}</p>
        <p className="intro text-white font-bold">{`Efficiency: ${payload[0].value.toFixed(0)}%`}</p>
        <p className="desc text-xs text-gray-500">Job: {payload[0].payload.partName}</p>
      </div>
    );
  }
  return null;
};

const EfficiencyChart = ({ jobs }) => {
  const chartData = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];

    return jobs
      .filter(job => job.status === 'Complete' && job.estimatedTime > 0 && job.startedAt && job.completedAt)
      .map(job => {
        const actualSeconds = (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000;
        if (actualSeconds <= 0) return null;

        const efficiency = ((job.estimatedTime * 60) / actualSeconds) * 100;

        return {
          date: new Date(job.completedAt.toDate()).toLocaleDateString('en-ZA'), // Use a consistent date format
          efficiency: efficiency,
          partName: job.partName,
        };
      })
      .filter(Boolean) // Remove any null entries
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date to connect the line properly
  }, [jobs]);

  if (chartData.length === 0) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Not enough data to display performance trend.</p>
        </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 0,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} unit="%" />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{fontSize: "14px"}} />
        <Line type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={2} activeDot={{ r: 8 }} name="Job Efficiency"/>
      </LineChart>
    </ResponsiveContainer>
  );
};

export default EfficiencyChart;