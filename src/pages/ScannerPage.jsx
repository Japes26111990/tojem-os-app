import React from 'react';
// MainLayout import removed
import Scanner from '../components/features/scanner/Scanner';

const ScannerPage = () => {
  return (
     <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Workshop Scanner</h2>
      <Scanner />
    </div>
  );
};

export default ScannerPage;