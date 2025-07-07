// src/pages/PayrollPage.jsx (UPDATED)

import React, { useState } from 'react';
import PermanentPayroll from '../components/features/payroll/PermanentPayroll';
import SubcontractorLedger from '../components/features/payroll/SubcontractorLedger';
import LivePayrollSummary from '../components/features/payroll/LivePayrollSummary'; // <-- ADD THIS IMPORT

const TabButton = ({ id, label, activeTab, setActiveTab }) => {
    const isActive = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
          isActive ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
        }`}
      >
        {label}
      </button>
    );
};


const PayrollPage = () => {
    const [activeTab, setActiveTab] = useState('permanent');

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Payroll & Payments</h2>

            {/* --- ADD THE NEW COMPONENT HERE --- */}
            <LivePayrollSummary />

            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    <TabButton id="permanent" label="Permanent Staff Payroll" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton id="subcontractor" label="Subcontractor Payments" activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'permanent' && <PermanentPayroll />}
                {activeTab === 'subcontractor' && <SubcontractorLedger />}
            </div>
        </div>
    );
};

export default PayrollPage;