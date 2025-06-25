import React from 'react';
// MainLayout import removed
import LiveTrackingTable from '../components/features/tracking/LiveTrackingTable';

const TrackingPage = () => {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Live Job Tracking</h2>
      <LiveTrackingTable />
    </div>
  );
};

// Exporting with the name LiveTrackingPage to match other files if needed, but component name is TrackingPage
export default TrackingPage;