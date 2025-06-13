import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import QcQueue from '../components/features/qc/QcQueue';

const QcPage = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Quality Control Queue</h2>
        <QcQueue />
      </div>
    </MainLayout>
  );
};

export default QcPage;