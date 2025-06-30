// src/components/intelligence/TopReworkCausesWidget.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

const TopReworkCausesWidget = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col">
                <h3 className="font-bold text-white mb-4 flex items-center">
                    <AlertCircle size={20} className="mr-2 text-orange-400"/>
                    Top Rework Causes
                </h3>
                <div className="flex-grow flex items-center justify-center">
                    <p className="text-gray-500 text-sm">No jobs with issues recorded yet.</p>
                </div>
            </div>
        );
    }

    const maxCount = Math.max(...data.map(([, count]) => count), 1);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="font-bold text-white mb-4 flex items-center">
                <AlertCircle size={20} className="mr-2 text-orange-400"/>
                Top Rework Causes
            </h3>
            <div className="space-y-3">
                {data.map(([reason, count]) => (
                    <div key={reason} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                            <p className="text-gray-300 truncate font-medium" title={reason}>{reason}</p>
                            <p className="text-white font-semibold">{count}</p>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div
                                className="bg-orange-500 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopReworkCausesWidget;
