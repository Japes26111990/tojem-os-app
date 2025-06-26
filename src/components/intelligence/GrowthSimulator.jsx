// src/components/intelligence/GrowthSimulator.jsx (UPDATED & FIXED)

import React, { useState, useEffect } from 'react';
import Input from '../ui/Input';
import { TrendingUp, Users, Zap, DollarSign } from 'lucide-react';

const GrowthSimulator = ({ baseOverheads, baseEmployeeCount, baseAvgEfficiency, baseAvgHourlyRate }) => {
    const [scenario, setScenario] = useState({
        targetSales: '',
        employeeCount: baseEmployeeCount || 1,
        teamEfficiency: baseAvgEfficiency || 100,
    });
    const [results, setResults] = useState({
        requiredHours: 0,
        availableHours: 0,
        cogs: 0,
        laborCost: 0, // This will now represent the total monthly labor bill
        grossProfit: 0,
        netProfit: 0,
        breakEvenSales: 0,
    });

    useEffect(() => {
        const targetSales = parseFloat(scenario.targetSales) || 0;
        const employeeCount = parseInt(scenario.employeeCount, 10) || baseEmployeeCount;
        const teamEfficiency = parseFloat(scenario.teamEfficiency) || baseAvgEfficiency;

        // --- Core Financial Calculations ---
        // 1. Estimate COGS (assuming a 60% variable cost of sales)
        const cogs = targetSales * 0.60;
        const contributionMarginRatio = 0.40; // (1 - 0.60)

        // 2. Calculate Total Fixed Costs for the scenario
        // Total monthly labor cost is now tied to the number of employees in the scenario
        const totalMonthlyLaborCost = employeeCount * baseAvgHourlyRate * 173.2; // Avg hours in a month
        const totalFixedCosts = baseOverheads + totalMonthlyLaborCost;

        // 3. Calculate Profitability
        const grossProfit = targetSales - cogs;
        const netProfit = grossProfit - totalMonthlyLaborCost - baseOverheads;
        
        // 4. Calculate Break-Even Point
        const breakEvenSales = contributionMarginRatio > 0 ? totalFixedCosts / contributionMarginRatio : 0;


        // --- Capacity/Hour Calculations (for context) ---
        // We'll use a simplified model: assume labor cost is ~25% of sales to estimate hours needed
        const estimatedLaborValueOfSales = targetSales * 0.25;
        const efficiencyFactor = 100 / (teamEfficiency || 100);
        const requiredHours = baseAvgHourlyRate > 0 ? (estimatedLaborValueOfSales / baseAvgHourlyRate) * efficiencyFactor : 0;
        const availableHours = employeeCount * 173.2;

        setResults({
            requiredHours,
            availableHours,
            cogs,
            laborCost: totalMonthlyLaborCost, // Set the total labor cost for display
            grossProfit,
            netProfit,
            breakEvenSales,
        });

    }, [scenario, baseOverheads, baseEmployeeCount, baseAvgEfficiency, baseAvgHourlyRate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setScenario(prev => ({ ...prev, [name]: value }));
    };

    const formatCurrency = (value) => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="text-blue-400" />
                Growth & Profitability Simulator
            </h3>
            
            {/* INPUTS: The Levers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <Input 
                    label="Target Monthly Sales (R)" 
                    name="targetSales" 
                    type="number" 
                    value={scenario.targetSales} 
                    onChange={handleInputChange} 
                    placeholder="e.g., 500000" 
                />
                <Input 
                    label="Number of Employees" 
                    name="employeeCount" 
                    type="number" 
                    value={scenario.employeeCount} 
                    onChange={handleInputChange}
                />
                <Input 
                    label="Team Efficiency (%)" 
                    name="teamEfficiency" 
                    type="number" 
                    value={scenario.teamEfficiency} 
                    onChange={handleInputChange}
                />
            </div>

            {/* OUTPUTS: The Results */}
            <div className="space-y-4">
                <h4 className="font-semibold text-lg text-white">Projected Results</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Required Hours vs. Available</p>
                        <p className={`text-2xl font-bold ${results.availableHours < results.requiredHours ? 'text-red-400' : 'text-green-400'}`}>
                            {results.requiredHours.toFixed(0)} / {results.availableHours.toFixed(0)}
                        </p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Break-Even Sales (R)</p>
                        <p className="text-2xl font-bold text-white">
                            {formatCurrency(results.breakEvenSales)}
                        </p>
                    </div>
                    <div className="bg-blue-600/20 p-4 rounded-lg border border-blue-500">
                        <p className="text-sm text-blue-300">Projected Net Profit</p>
                        <p className={`text-2xl font-bold ${results.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {formatCurrency(results.netProfit)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrowthSimulator;
