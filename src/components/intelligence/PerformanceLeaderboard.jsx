// src/components/intelligence/PerformanceLeaderboard.jsx

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

const SortButton = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${
            active
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

const getRankColor = (rank) => {
    switch (rank) {
        case 1: return 'border-yellow-400 bg-yellow-400/10';
        case 2: return 'border-gray-400 bg-gray-400/10';
        case 3: return 'border-orange-500 bg-orange-500/10';
        default: return 'border-gray-700';
    }
};

const PerformanceLeaderboard = ({ employees, activeSortKey, setActiveSortKey }) => {
    const sortConfig = {
        ops: { direction: 'desc', label: 'OPS', unit: '' },
        netValueAdded: { direction: 'desc', label: 'Net Value', unit: 'R' },
        avgEfficiency: { direction: 'desc', label: 'Efficiency', unit: '%' },
        reworkRate: { direction: 'asc', label: 'Rework Rate', unit: '%' },
        jobsCompleted: { direction: 'desc', label: 'Jobs Done', unit: '' },
    };

    const sortedEmployees = useMemo(() => {
        if (!employees) return [];
        const key = activeSortKey;
        const direction = sortConfig[key]?.direction || 'desc';
        return [...employees].sort((a, b) => {
            return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
        });
    }, [employees, activeSortKey]);

    const formatValue = (value, unit) => {
        if (typeof value !== 'number') return 'N/A';
        if (unit === '%') return `${Math.round(value)}%`;
        if (unit === 'R') return `R ${value.toFixed(2)}`;
        if (unit === '') return value.toFixed(1);
        return value;
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-4">
                <SortButton label={<><Star size={16}/> Rank by OPS</>} active={activeSortKey === 'ops'} onClick={() => setActiveSortKey('ops')} />
                <SortButton label="Rank by Net Value" active={activeSortKey === 'netValueAdded'} onClick={() => setActiveSortKey('netValueAdded')} />
                <SortButton label="Rank by Efficiency" active={activeSortKey === 'avgEfficiency'} onClick={() => setActiveSortKey('avgEfficiency')} />
                <SortButton label="Rank by Quality" active={activeSortKey === 'reworkRate'} onClick={() => setActiveSortKey('reworkRate')} />
                <SortButton label="Rank by Volume" active={activeSortKey === 'jobsCompleted'} onClick={() => setActiveSortKey('jobsCompleted')} />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {sortedEmployees.map((emp, index) => {
                    const rank = index + 1;
                    const rankColor = getRankColor(rank);
                    const value = emp[activeSortKey];
                    const unit = sortConfig[activeSortKey]?.unit || '';

                    return (
                        <div key={emp.id} className={`flex items-center p-3 rounded-lg border-l-4 transition-all ${rankColor}`}>
                            <span className="font-bold text-lg text-white w-8">{rank}.</span>
                            <div className="flex-grow">
                                <Link to={`/employee/${emp.id}`} className="font-semibold text-blue-400 hover:underline">
                                    {emp.name}
                                </Link>
                                <p className="text-xs text-gray-400">Department: {emp.departmentName || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg text-blue-400">{formatValue(value, unit)}</p>
                                <p className="text-xs text-gray-500">{sortConfig[activeSortKey]?.label}</p>
                            </div>
                        </div>
                    );
                })}
                 {sortedEmployees.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        No employee data to display for the selected filter.
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerformanceLeaderboard;
