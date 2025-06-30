// src/components/intelligence/CapacityGauge.jsx
import React from 'react';
import { Gauge } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

const CapacityGauge = ({ utilization }) => {
    const scoreColor = utilization > 85 ? '#ef4444' : utilization > 70 ? '#f59e0b' : '#22c55e';
    const data = [{ name: 'Capacity', value: utilization }];

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center h-full">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <Gauge size={20} className="text-blue-400"/>
                Capacity Utilization
            </h3>
            <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="60%" 
                    outerRadius="80%" 
                    barSize={20} 
                    data={data}
                    startAngle={180}
                    endAngle={0}
                >
                    <RadialBar
                        minAngle={15}
                        background
                        clockWise
                        dataKey="value"
                        fill={scoreColor}
                        cornerRadius={10}
                    />
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-white">
                        {Math.round(utilization)}%
                    </text>
                     <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" className="text-sm font-semibold fill-gray-400">
                        of available hours
                    </text>
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CapacityGauge;
