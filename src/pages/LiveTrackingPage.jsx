// src/pages/LiveTrackingPage.jsx (Upgraded for Burdened Cost)

import React, { useState, useEffect, useMemo } from 'react';
import LiveTrackingTable from '../components/features/tracking/LiveTrackingTable';
import { getEmployees, getOverheadCategories, getOverheadExpenses } from '../api/firestore';

const LiveTrackingPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [overheadCostPerHour, setOverheadCostPerHour] = useState(0);

    useEffect(() => {
        const calculateBurdenedRateData = async () => {
            setLoading(true);
            try {
                const [employees, overheadCats] = await Promise.all([
                    getEmployees(),
                    getOverheadCategories()
                ]);

                const expensePromises = overheadCats.map(cat => getOverheadExpenses(cat.id));
                const expenseResults = await Promise.all(expensePromises);
                const totalMonthlyOverheads = expenseResults.flat().reduce((sum, exp) => sum + (exp.amount || 0), 0);
                
                // Using 173.2 as the average number of working hours in a month
                const totalCompanyProductiveHours = (employees.length || 1) * 173.2; 
                const overheadRate = totalCompanyProductiveHours > 0 ? totalMonthlyOverheads / totalCompanyProductiveHours : 0;
                
                setOverheadCostPerHour(overheadRate);

            } catch (err) {
                console.error("Failed to calculate burdened rate data:", err);
                setError("Could not load financial data for cost calculation.");
            } finally {
                setLoading(false);
            }
        };

        calculateBurdenedRateData();
    }, []);

    if (loading) {
        return <p className="text-center text-gray-400">Initializing Costing Engine...</p>;
    }
    if (error) {
        return <p className="text-center text-red-400">{error}</p>;
    }

    return (
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-white">Live Job Tracking</h2>
          {/* Pass the calculated overhead rate down to the table */}
          <LiveTrackingTable overheadCostPerHour={overheadCostPerHour} />
        </div>
      );
};

export default LiveTrackingPage;
