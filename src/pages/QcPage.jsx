import React from 'react';
// MainLayout import removed
import QcQueue from '../components/features/qc/QcQueue';

const QcPage = () => {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Quality Control Queue</h2>
      <QcQueue />
    </div>
  );
};

export default QcPage;