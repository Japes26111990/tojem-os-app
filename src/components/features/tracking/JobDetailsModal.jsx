import React from 'react';
import Button from '../../ui/Button';
import { X, CheckCircle2, DollarSign, Clock, Zap } from 'lucide-react';

const DetailRow = ({ label, value, className = 'text-gray-300' }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700">
        <p className="text-sm text-gray-400">{label}</p>
        <p className={`text-sm font-semibold ${className}`}>{value}</p>
    </div>
);

const JobDetailsModal = ({ job, onClose }) => {
    // Helper to format timestamps
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp.seconds * 1000).toLocaleString();
    };
    
    // Helper to format duration
    const formatDuration = (job) => {
        if (!job.startedAt || !job.completedAt) return 'N/A';
        let durationSeconds = job.completedAt.seconds - job.startedAt.seconds;
        if (job.totalPausedMilliseconds) {
            durationSeconds -= Math.floor(job.totalPausedMilliseconds / 1000);
        }
        if (durationSeconds < 0) return 'N/A';
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${minutes}m ${seconds}s`;
    };
    
    // Helper to format efficiency
    const formatEfficiency = (job) => {
        if(!job.estimatedTime || !job.startedAt || !job.completedAt) return 'N/A';
        const estimatedMinutes = job.estimatedTime;
        const actualSeconds = job.completedAt.seconds - job.startedAt.seconds - ((job.totalPausedMilliseconds || 0) / 1000);
        if(actualSeconds <= 0) return 'N/A';
        const actualMinutes = actualSeconds / 60;
        return `${Math.round((estimatedMinutes / actualMinutes) * 100)}%`;
    }

    return (
        // Backdrop
        <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in"
        >
            {/* Modal Content */}
            <div 
                onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">{job.partName}</h2>
                        <p className="text-xs font-mono text-gray-500">{job.jobId}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Key Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <DetailRow label="Employee" value={job.employeeName} />
                        <DetailRow label="Status" value={job.status} />
                        <DetailRow label="Created On" value={formatDate(job.createdAt)} />
                        <DetailRow label="Started On" value={formatDate(job.startedAt)} />
                        <DetailRow label="Completed On" value={formatDate(job.completedAt)} />
                    </div>

                    {/* Performance & Cost */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center"><Clock size={20} className="mx-auto mb-2 text-blue-400" /><p className="text-xs text-gray-400">Est. Time</p><p className="font-bold">{job.estimatedTime} min</p></div>
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center"><CheckCircle2 size={20} className="mx-auto mb-2 text-green-400" /><p className="text-xs text-gray-400">Actual Time</p><p className="font-bold">{formatDuration(job)}</p></div>
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center"><Zap size={20} className="mx-auto mb-2 text-purple-400" /><p className="text-xs text-gray-400">Efficiency</p><p className="font-bold">{formatEfficiency(job)}</p></div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center"><p className="text-xs text-gray-400">Material Cost</p><p className="font-bold font-mono">R{job.materialCost?.toFixed(2) || '0.00'}</p></div>
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center"><p className="text-xs text-gray-400">Labor Cost</p><p className="font-bold font-mono">R{job.laborCost?.toFixed(2) || '0.00'}</p></div>
                        <div className="bg-gray-900/50 p-4 rounded-lg text-center"><DollarSign size={20} className="mx-auto mb-2 text-yellow-400" /><p className="text-xs text-gray-400">Total Job Cost</p><p className="font-bold font-mono">R{job.totalCost?.toFixed(2) || '0.00'}</p></div>
                    </div>
                    
                    {/* Consumables */}
                    <div>
                        <h4 className="font-semibold text-gray-200 mb-2">Consumables Used</h4>
                        <ul className="text-sm text-gray-400 list-disc list-inside bg-gray-900/50 p-4 rounded-lg">
                            {job.consumables?.length > 0 ? job.consumables.map((c, i) => <li key={i}>{c.name} (Qty: {c.quantity})</li>) : <li>None</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobDetailsModal;