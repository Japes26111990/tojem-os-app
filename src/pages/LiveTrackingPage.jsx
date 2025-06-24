import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import LiveTrackingTable from '../components/features/tracking/LiveTrackingTable';
import { useSearchParams, useNavigate } from 'react-router-dom'; // NEW: Import here to make them available in the router context

const TrackingPage = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Live Job Tracking</h2>
        <LiveTrackingTable />
      </div>
    </MainLayout>
  );
};

export default TrackingPage;
