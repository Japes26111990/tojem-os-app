import React from 'react';

const KpiCard = ({ icon, title, value, color }) => (
  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-start space-x-4">
    <div className={`p-3 rounded-full ${color}`}>{icon}</div>
    <div>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

export default KpiCard;