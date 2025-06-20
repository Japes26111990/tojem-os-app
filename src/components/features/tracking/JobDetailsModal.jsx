import React from 'react';
import Button from '../../ui/Button';
import { X, CheckCircle2, DollarSign, Clock, Zap } from 'lucide-react';

const DetailRow = ({ label, value, className = 'text-gray-300' }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-sm font-semibold ${className}`}>{value}</p>
    </div>
);

const JobDetailsModal = ({ job, onClose, currentTime, employeeHourlyRates }) => {
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };

    const formatDuration = (j, cTime) => {
        if (!j.startedAt) return 'N/A';

        let durationSeconds;
        const startTime = j.startedAt.seconds * 1000;
        const pausedMilliseconds = j.totalPausedMilliseconds || 0;

        if (j.status === 'Complete' || j.status === 'Awaiting QC' || j.status === 'Issue' || j.status === 'Archived - Issue') {
            if (!j.completedAt) return 'N/A';
            durationSeconds = (j.completedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'In Progress') {
            durationSeconds = (cTime - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'Paused' && j.pausedAt) {
            durationSeconds = (j.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else {
            return 'N/A';
        }
        
        if (durationSeconds < 0) return 'N/A';
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        return `${minutes}m ${seconds}s`;
    };

    const formatEfficiency = (j, cTime) => {
        if (!j.estimatedTime || !j.startedAt) return 'N/A';

        let actualSeconds;
        const startTime = j.startedAt.seconds * 1000;
        const pausedMilliseconds = j.totalPausedMilliseconds || 0;

        if (j.status === 'Complete' || j.status === 'Awaiting QC' || j.status === 'Issue' || j.status === 'Archived - Issue') {
            if (!j.completedAt) return 'N/A';
            actualSeconds = (j.completedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'In Progress') {
            actualSeconds = (cTime - startTime - pausedMilliseconds) / 1000;
        } else if (j.status === 'Paused' && j.pausedAt) {
            actualSeconds = (j.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else {
            return 'N/A';
        }

        actualSeconds = Math.max(0, actualSeconds);
        if (actualSeconds === 0) return 'N/A';

        const estimatedMinutes = j.estimatedTime;
        const actualMinutes = actualSeconds / 60;
        
        return `${Math.round((estimatedMinutes / actualMinutes) * 100)}%`;
    };

    const calculateLiveTotalCost = (j, cTime, rates) => {
        if (j.totalCost !== undefined && j.totalCost !== null) {
            return `R${j.totalCost.toFixed(2)}`;
        }

        if (!j.employeeId || !rates[j.employeeId]) {
            return 'N/A';
        }

        const hourlyRate = rates[j.employeeId];
        let activeSeconds = 0;
        const startTime = j.startedAt ? j.startedAt.seconds * 1000 : null;
        const pausedMilliseconds = j.totalPausedMilliseconds || 0;

        if (j.status === 'In Progress') {
            if (startTime) {
                activeSeconds = (cTime - startTime - pausedMilliseconds) / 1000;
            }
        } else if (j.status === 'Paused' && startTime && j.pausedAt) {
            activeSeconds = (j.pausedAt.seconds * 1000 - startTime - pausedMilliseconds) / 1000;
        } else {
            return 'N/A';
        }

        activeSeconds = Math.max(0, activeSeconds);
        const activeHours = activeSeconds / 3600;
        const liveLaborCost = activeHours * hourlyRate;
        
        const currentMaterialCost = j.materialCost || 0; 
        const totalLiveCost = liveLaborCost + currentMaterialCost;

        return `R${totalLiveCost.toFixed(2)}`;
    };

    const liveDurationFormatted = formatDuration(job, currentTime);
    const liveEfficiencyFormatted = formatEfficiency(job, currentTime);
    const liveTotalCostFormatted = calculateLiveTotalCost(job, currentTime, employeeHourlyRates);

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">{job.partName}</h2>
                        <p className="text-xs font-mono text-gray-500">{job.jobId}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <DetailRow label="Employee" value={job.employeeName} />
                        <DetailRow label="Status" value={job.status} />
                        <DetailRow label="Created On" value={formatDate(job.createdAt)} />
                        <DetailRow label="Started On" value={formatDate(job.startedAt)} />
                        <DetailRow label="Completed On" value={formatDate(job.completedAt)} />
                        {job.status === 'Paused' && job.pausedAt && (
                           <DetailRow label="Paused At" value={formatDate(job.pausedAt)} />
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                            <Clock size={20} className="mx-auto mb-2 text-blue-400" />
                            <p className="text-xs text-gray-400">Est. Time</p>
                            <p className="font-bold">{job.estimatedTime || 'N/A'} min</p>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                            <CheckCircle2 size={20} className="mx-auto mb-2 text-green-400" />
                            <p className="text-xs text-gray-400">Actual Time</p>
                            <p className="font-bold">{liveDurationFormatted}</p>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                            <Zap size={20} className="mx-auto mb-2 text-purple-400" />
                            <p className="text-xs text-gray-400">Efficiency</p>
                            <p className="font-bold">{liveEfficiencyFormatted}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                            <p className="text-xs text-gray-400">Material Cost</p>
                            <p className="font-bold font-mono">R{job.materialCost?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                            <p className="text-xs text-gray-400">Labor Cost</p>
                            <p className="font-bold font-mono">R{((job.laborCost === undefined || job.laborCost === null) && job.startedAt && employeeHourlyRates[job.employeeId] !== undefined) ? (
                                    (formatDuration(job, currentTime).split('m')[0] * employeeHourlyRates[job.employeeId] / 60).toFixed(2)
                                ) : job.laborCost?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                            <DollarSign size={20} className="mx-auto mb-2 text-yellow-400" />
                            <p className="text-xs text-gray-400">Total Job Cost</p>
                            <p className="font-bold font-mono">{liveTotalCostFormatted}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-200 mb-2">Consumables Used</h4>
                        <ul className="text-sm text-gray-400 list-disc list-inside bg-gray-900/50 p-4 rounded-lg">
                            {job.processedConsumables?.length > 0 ?
                                job.processedConsumables.map((c, i) => <li key={i}>{c.name} (Qty: {c.quantity.toFixed(3)} {c.unit || ''})</li>) : <li>None</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetailsModal;