import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import LiveJobTracking from '../components/features/tracking/LiveTrackingTable';

const TrackingPage = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Live Job Tracking</h2>
        <LiveJobTracking />
      </div>
    </MainLayout>
  );
};

export default TrackingPage;