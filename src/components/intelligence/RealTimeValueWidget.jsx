// src/components/intelligence/RealTimeValueWidget.jsx (New File)

import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const RealTimeValueWidget = ({ jobs, employee, overheadCostPerHour }) => {
    // Memoize the calculation to avoid re-running on every render
    const metrics = useMemo(() => {
        if (!employee || !jobs || jobs.length === 0) {
            return {
                burdenedRate: 0,
                valueGeneratedPerHour: 0,
                profitabilityRatio: 0,
                totalValueGenerated: 0,
                totalHoursWorked: 0
            };
        }

        const completedJobs = jobs.filter(j => j.status === 'Complete' && j.startedAt && j.completedAt);

        if (completedJobs.length === 0) {
            return {
                burdenedRate: (employee.hourlyRate || 0) + overheadCostPerHour,
                valueGeneratedPerHour: 0,
                profitabilityRatio: 0,
                totalValueGenerated: 0,
                totalHoursWorked: 0
            };
        }

        // 1. Calculate the total value generated and hours worked from completed jobs
        const { totalValue, totalSeconds } = completedJobs.reduce(
            (acc, job) => {
                const durationSeconds = (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000;
                acc.totalValue += job.totalCost || 0;
                acc.totalSeconds += durationSeconds > 0 ? durationSeconds : 0;
                return acc;
            },
            { totalValue: 0, totalSeconds: 0 }
        );

        const totalHours = totalSeconds / 3600;

        // 2. Calculate the employee's burdened hourly rate
        const burdenedRate = (employee.hourlyRate || 0) + overheadCostPerHour;

        // 3. Calculate the value they generate per hour
        const valueGeneratedPerHour = totalHours > 0 ? totalValue / totalHours : 0;

        // 4. Calculate the final profitability ratio
        const profitabilityRatio = burdenedRate > 0 ? valueGeneratedPerHour / burdenedRate : 0;

        return {
            burdenedRate,
            valueGeneratedPerHour,
            profitabilityRatio,
            totalValueGenerated: totalValue,
            totalHoursWorked: totalHours
        };
    }, [jobs, employee, overheadCostPerHour]);

    const isProfitable = metrics.profitabilityRatio >= 1.0;
    const colorClasses = isProfitable
        ? "bg-green-500/10 text-green-400 border-green-500/30"
        : "bg-red-500/10 text-red-400 border-red-500/30";

    return (
        <div className={`p-6 rounded-lg border ${colorClasses}`}>
            <h3 className="text-xl font-bold text-white mb-4">Real-Time Value Engine</h3>
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="text-center">
                    <p className="text-sm text-gray-400">Profitability Ratio</p>
                    <p className={`text-6xl font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                        {metrics.profitabilityRatio.toFixed(2)}x
                    </p>
                    <p className="text-xs text-gray-500">
                        (Value Generated per Hour / Cost per Hour)
                    </p>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Value Generated/hr</p>
                        <p className="text-lg font-semibold text-white">
                            R {metrics.valueGeneratedPerHour.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-400">Burdened Cost/hr</p>
                        <p className="text-lg font-semibold text-white">
                            R {metrics.burdenedRate.toFixed(2)}
                        </p>
                    </div>
                </div>

                {isProfitable ? (
                    <div className="flex items-center text-sm text-green-400">
                        <TrendingUp size={16} className="mr-1" />
                        <span>This employee is generating more value than their cost.</span>
                    </div>
                ) : (
                    <div className="flex items-center text-sm text-red-400">
                        <TrendingDown size={16} className="mr-1" />
                        <span>This employee is currently not covering their cost.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RealTimeValueWidget;