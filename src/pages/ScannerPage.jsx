// src/pages/ScannerPage.jsx (Reworked as a Hub)

import React, { useState } from 'react';
import JobCardScanner from '../components/features/scanner/JobCardScanner';
import StockTakeApp from '../components/features/stock/StockTakeApp'; // We will create this next
import { ScanLine, ClipboardCheck } from 'lucide-react';

const TabButton = ({ id, label, icon, activeTab, setActiveTab }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`flex-1 px-5 py-3 text-lg font-semibold flex items-center justify-center gap-3 transition-colors ${
          isActive 
            ? 'bg-gray-800 text-white border-b-2 border-blue-500' 
            : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
        }`}
      >
        {icon}
        {label}
      </button>
    );
};

const ScannerPage = () => {
    const [activeTab, setActiveTab] = useState('job_scanner');

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Workshop Scanners</h2>
            
            <div className="flex rounded-t-lg overflow-hidden border-b border-gray-700">
                <TabButton 
                    id="job_scanner"
                    label="Job Card Scanner"
                    icon={<ScanLine size={22} />}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
                <TabButton 
                    id="stock_scanner"
                    label="Stock Take Scanner"
                    icon={<ClipboardCheck size={22} />}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>

            <div>
                {activeTab === 'job_scanner' && <JobCardScanner />}
                {activeTab === 'stock_scanner' && <StockTakeApp />}
            </div>
        </div>
    );
};

export default ScannerPage;
