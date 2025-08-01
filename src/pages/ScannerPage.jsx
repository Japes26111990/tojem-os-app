// src/pages/ScannerPage.jsx (Simplified)

import React from 'react';
import JobCardScanner from '../components/features/scanner/JobCardScanner';
import { ScanLine } from 'lucide-react';

const ScannerPage = () => {
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <ScanLine size={32} className="text-blue-400" />
                <div>
                    <h2 className="text-3xl font-bold text-white">Workshop Scanner</h2>
                    <p className="text-gray-400">Scan job cards to update status, assign employees, and manage live production tasks.</p>
                </div>
            </div>
            
            {/* The page now only renders the Job Card Scanner */}
            <JobCardScanner />
        </div>
    );
};

export default ScannerPage;
