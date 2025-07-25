// src/components/intelligence/YoYSalesComparison.jsx

import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';

const YoYSalesComparison = ({ currentMonthSales, lastYearSales }) => {
    
    const percentageChange = (() => {
        if (lastYearSales === 0 && currentMonthSales > 0) return 100; // Growth from zero
        if (lastYearSales === 0) return 0; // No change from zero
        return ((currentMonthSales - lastYearSales) / lastYearSales) * 100;
    })();

    const isPositive = percentageChange > 0;
    const isNegative = percentageChange < 0;

    const getTrendInfo = () => {
        if (isPositive) return {
            icon: <TrendingUp size={20} />,
            textColor: 'text-green-400',
            text: `+${percentageChange.toFixed(1)}% vs. Last Year`
        };
        if (isNegative) return {
            icon: <TrendingDown size={20} />,
            textColor: 'text-red-400',
            text: `${percentageChange.toFixed(1)}% vs. Last Year`
        };
        return {
            icon: <Minus size={20} />,
            textColor: 'text-gray-400',
            text: 'No Change vs. Last Year'
        };
    };
    
    const trend = getTrendInfo();

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col justify-between">
            <div>
                <p className="text-gray-400 text-sm font-medium flex items-center gap-2">
                    <DollarSign size={16} />
                    This Month's Sales (from Accounting)
                </p>
                <p className="text-4xl font-bold text-white mt-2">
                    R {currentMonthSales.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
            <div className={`mt-4 flex items-center space-x-2 ${trend.textColor}`}>
                {trend.icon}
                <span className="font-semibold">
                    {trend.text}
                </span>
            </div>
        </div>
    );
};

export default YoYSalesComparison;
