import React from 'react';
import { Gauge, AlertTriangle } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

/**
 * A widget to display the current system bottleneck identified by the TOC engine.
 * It visualizes the utilization percentage of the most constrained tool.
 */
const BottleneckWidget = ({ bottleneck }) => {
    // Set default data in case the bottleneck is not yet calculated or available
    const bottleneckName = bottleneck?.bottleneckToolName || "Calculating...";
    const utilization = bottleneck?.bottleneckUtilization || 0;

    // Determine color based on utilization percentage
    const scoreColor = utilization > 95 ? '#ef4444' : utilization > 80 ? '#f59e0b' : '#22c55e';
    
    // Data for the radial bar chart
    const data = [{ name: 'Utilization', value: utilization }];

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col items-center justify-center">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <AlertTriangle size={20} className="text-orange-400"/>
                System Bottleneck
            </h3>
            <p className="text-lg font-semibold text-white mb-2">{bottleneckName}</p>

            {/* Chart visualization for the utilization percentage */}
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
                    <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                    />
                    <RadialBar
                        minAngle={15}
                        background
                        clockWise
                        dataKey="value"
                        cornerRadius={10}
                        fill={scoreColor}
                    />
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-white">
                        {Math.round(utilization)}%
                    </text>
                     <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" className="text-sm font-semibold fill-gray-400">
                        Utilization
                    </text>
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BottleneckWidget;
