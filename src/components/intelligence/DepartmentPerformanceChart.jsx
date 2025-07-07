// src/components/intelligence/DepartmentPerformanceChart.jsx (NEW FILE)

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/80 p-3 border border-gray-700 rounded-lg shadow-lg">
        <p className="label text-sm text-white font-bold">{label}</p>
        <p className="intro text-purple-400">{`Avg. Efficiency: ${payload[0].value.toFixed(0)}%`}</p>
        <p className="intro text-green-400">{`Total Value: R ${payload[1].value.toLocaleString('en-ZA')}`}</p>
      </div>
    );
  }
  return null;
};

const DepartmentPerformanceChart = ({ data }) => {
    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-purple-400"/>
                Department Performance Overview
            </h3>
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b556330" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#8b5cf6" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R${value/1000}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(107, 114, 128, 0.1)'}}/>
                    <Legend wrapperStyle={{fontSize: "14px"}} />
                    <Bar yAxisId="left" dataKey="avgEfficiency" fill="#8b5cf6" name="Avg. Efficiency" />
                    <Bar yAxisId="right" dataKey="totalValue" fill="#22c55e" name="Total Value Generated" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DepartmentPerformanceChart;