import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import LiveTrackingTable from '../components/features/tracking/LiveTrackingTable';

const LiveTrackingPage = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Live Job Tracking</h2>
        <LiveTrackingTable />
      </div>
    </MainLayout>
  );
};

export default LiveTrackingPage;