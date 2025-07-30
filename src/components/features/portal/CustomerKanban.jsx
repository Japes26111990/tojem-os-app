// src/components/features/portal/CustomerKanban.jsx (NEW FILE)

import React, { useMemo } from 'react';
import { Package, HardHat, CheckSquare, CheckCircle } from 'lucide-react';
import { JOB_STATUSES } from '../../../config'; // Import JOB_STATUSES

const KanbanColumn = ({ title, jobs, icon }) => (
    <div className="bg-gray-800/50 rounded-xl p-4 w-full">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            {icon}
            {title} ({jobs.length})
        </h3>
        <div className="space-y-3">
            {jobs.map(job => (
                <div key={job.id} className="p-3 rounded-lg bg-gray-700 border border-gray-600">
                    <p className="font-semibold text-white text-sm">{job.partName}</p>
                    <p className="text-xs text-gray-400 font-mono">{job.jobId}</p>
                </div>
            ))}
            {jobs.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                    No jobs in this stage.
                </div>
            )}
        </div>
    </div>
);

const CustomerKanban = ({ jobs }) => {
    const columns = useMemo(() => {
        const pending = jobs.filter(j => j.status === JOB_STATUSES.PENDING);
        const inProgress = jobs.filter(j => j.status === JOB_STATUSES.IN_PROGRESS || j.status === JOB_STATUSES.PAUSED);
        const awaitingQc = jobs.filter(j => j.status === JOB_STATUSES.AWAITing_QC);
        const complete = jobs.filter(j => j.status === JOB_STATUSES.COMPLETE);
        return { pending, inProgress, awaitingQc, complete };
    }, [jobs]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KanbanColumn title="Pending" jobs={columns.pending} icon={<Package size={20} className="text-yellow-400"/>} />
            <KanbanColumn title="In Progress" jobs={columns.inProgress} icon={<HardHat size={20} className="text-blue-400"/>} />
            <KanbanColumn title="Awaiting QC" jobs={columns.awaitingQc} icon={<CheckSquare size={20} className="text-purple-400"/>} />
            <KanbanColumn title="Complete" jobs={columns.complete} icon={<CheckCircle size={20} className="text-green-400"/>} />
        </div>
    );
};

export default CustomerKanban;
