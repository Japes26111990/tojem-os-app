// src/components/intelligence/YoYSalesGraph.jsx (UPDATED to Line Chart)
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
            {pld.dataKey}: R {pld.value.toLocaleString('en-ZA')}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const YoYSalesGraph = ({ salesData, lastYear, currentYear }) => {

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-green-400"/>
                Monthly Sales Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b556330" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R${value/1000}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(107, 114, 128, 0.1)'}}/>
                    <Legend />
                    <Line type="monotone" dataKey={lastYear} stroke="#8884d8" strokeWidth={2} name={`Sales ${lastYear}`} />
                    <Line type="monotone" dataKey={currentYear} stroke="#3b82f6" strokeWidth={2} name={`Sales ${currentYear}`} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default YoYSalesGraph;
