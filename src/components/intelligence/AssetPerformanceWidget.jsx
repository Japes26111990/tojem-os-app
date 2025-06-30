import React from 'react';
import { Clock, DollarSign, ShieldCheck, Zap } from 'lucide-react';

const KpiCard = ({ icon, title, value, color }) => (
    <div className={`bg-gray-900/50 p-4 rounded-lg border-l-4 ${color}`}>
        <div className="flex items-center gap-3">
            {icon}
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const AssetPerformanceWidget = ({ assetData }) => {
    if (!assetData) {
        return (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-center text-gray-500">
                <p>Select an asset from the list to view its performance analysis.</p>
            </div>
        );
    }

    const {
        name,
        totalRunHours,
        totalOperatingCost,
        jobsContributed,
        qualityRate
    } = assetData;

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6">
            <h3 className="text-2xl font-bold text-white">Performance Analysis: {name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={<Clock size={24} />} title="Total Run Time" value={`${totalRunHours.toFixed(1)} hrs`} color="border-blue-500" />
                <KpiCard icon={<DollarSign size={24} />} title="Total Operating Cost" value={`R ${totalOperatingCost.toFixed(2)}`} color="border-yellow-500" />
                <KpiCard icon={<Zap size={24} />} title="Jobs Contributed" value={jobsContributed} color="border-purple-500" />
                <KpiCard icon={<ShieldCheck size={24} />} title="Quality Rate" value={`${qualityRate.toFixed(1)}%`} color="border-green-500" />
            </div>
            <div>
                {/* This section can be expanded in the future with more detailed charts */}
                <p className="text-sm text-gray-400 text-center">Further analysis charts can be added here.</p>
            </div>
        </div>
    );
};

export default AssetPerformanceWidget;
