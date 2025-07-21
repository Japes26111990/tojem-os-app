// src/components/features/job_cards/PrintConfirmationModal.jsx (NEW FILE)

import React from 'react';
import Button from '../../ui/Button';
import { X, Printer } from 'lucide-react';

const DetailItem = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-white font-semibold">{value || 'N/A'}</p>
    </div>
);

const PrintConfirmationModal = ({ jobDetails, onClose, onConfirmPrint }) => {
    if (!jobDetails) return null;

    return (
        <div 
            onClick={onClose} 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Confirm Job Card Details</h3>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>
                <div className="p-6 space-y-4">
                    <h4 className="text-2xl text-blue-400 font-bold">{jobDetails.partName}</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Job ID" value={jobDetails.jobId} />
                        <DetailItem label="Department" value={jobDetails.departmentName} />
                        <DetailItem label="Assigned Employee" value={jobDetails.employeeName} />
                        <DetailItem label="Estimated Time" value={`${jobDetails.estimatedTime} minutes`} />
                        <DetailItem label="Quantity" value={jobDetails.quantity} />
                        <DetailItem label="Category" value={jobDetails.jobCategory} />
                        {jobDetails.vinNumber && <DetailItem label="VIN Number" value={jobDetails.vinNumber} />}
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Steps Overview</p>
                        <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md max-h-24 overflow-y-auto">
                            {(jobDetails.steps || []).join(', ')}
                        </p>
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={onConfirmPrint}>
                        <Printer size={18} className="mr-2"/>
                        Confirm & Print
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PrintConfirmationModal;
