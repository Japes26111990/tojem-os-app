import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import StockControlDashboard from '../components/features/stock/StockControlDashboard';

const StockControlPage = () => {
  // For now, this page only shows the dashboard.
  // We will add the "Purchase Queue" tab here in the next step.
  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Stock Control</h2>
        <StockControlDashboard />
      </div>
    </MainLayout>
  );
};

export default StockControlPage;