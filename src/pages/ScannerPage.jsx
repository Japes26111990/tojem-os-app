import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import Scanner from '../components/features/scanner/Scanner';

const ScannerPage = () => {
  return (
    <MainLayout>
       <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Workshop Scanner</h2>
        <Scanner />
      </div>
    </MainLayout>
  );
};

export default ScannerPage;