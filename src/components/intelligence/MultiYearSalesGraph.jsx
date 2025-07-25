// src/components/intelligence/MultiYearSalesGraph.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/80 p-3 border border-gray-700 rounded-lg shadow-lg">
        <p className="label text-sm text-white font-bold">{label}</p>
        {payload.map(pld => (
          <div key={pld.dataKey} style={{ color: pld.color }}>
            {pld.name}: R {pld.value.toLocaleString('en-ZA')}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const MultiYearSalesGraph = ({ salesData, years }) => {
    const colors = ['#8884d8', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

    return (
        // FIX: Removed the "h-full" class to prevent sizing conflicts with the parent container.
        // The component's height is now reliably controlled by the ResponsiveContainer below.
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-400"/>
                Historical Sales Performance
            </h3>
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={salesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b556330" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R${value/1000}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(107, 114, 128, 0.1)'}}/>
                    <Legend />
                    {years.map((year, index) => (
                        <Line 
                            key={year}
                            type="monotone" 
                            dataKey={year} 
                            stroke={colors[index % colors.length]} 
                            strokeWidth={2} 
                            name={`Sales ${year}`} 
                            dot={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MultiYearSalesGraph;
