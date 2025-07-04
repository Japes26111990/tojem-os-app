// src/components/intelligence/WorkshopThroughputGraph.jsx (NEW FILE)
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { HardHat } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/80 p-3 border border-gray-700 rounded-lg shadow-lg">
        <p className="label text-sm text-white font-bold">{`Week of ${label}`}</p>
        <p className="intro text-blue-400">{`Jobs Completed: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const WorkshopThroughputGraph = ({ jobCompletionData }) => {
    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <HardHat size={20} className="text-yellow-400"/>
                Workshop Throughput (Last 8 Weeks)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jobCompletionData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b556330" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(107, 114, 128, 0.1)'}}/>
                    <Bar dataKey="jobs" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} name="Jobs Completed" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WorkshopThroughputGraph;