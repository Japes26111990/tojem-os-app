// src/components/intelligence/ReworkAnalysisModal.jsx

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';

const ReworkAnalysisModal = ({ jobs, employeeName, onClose }) => {
    const analysis = useMemo(() => {
        if (!jobs) return {};
        
        const issueJobs = jobs.filter(job => job.status === 'Issue' || job.status === 'Archived - Issue');
        
        const reasons = issueJobs.reduce((acc, job) => {
            const reason = job.issueReason || 'No Reason Provided';
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(reasons).sort(([, a], [, b]) => b - a);

    }, [jobs]);

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Root Cause Analysis</h2>
                        <p className="text-sm text-gray-400">For {employeeName}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>

                <div className="p-6 overflow-y-auto space-y-3">
                    {analysis.length > 0 ? (
                        analysis.map(([reason, count]) => (
                            <div key={reason} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-lg">
                                <span className="font-medium text-gray-200">{reason}</span>
                                <span className="font-bold text-lg text-red-400">{count} {count > 1 ? 'times' : 'time'}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">This employee has no jobs with recorded issues.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReworkAnalysisModal;
