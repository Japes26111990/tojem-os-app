// src/components/intelligence/YoYProfitWidget.jsx (UPDATED for new layout)
import React from 'react';
import { TrendingUp, TrendingDown, Minus, Percent } from 'lucide-react';

const YoYProfitWidget = ({ currentMonthProfit, lastYearProfit }) => {
    
    const percentageChange = (() => {
        if (lastYearProfit === 0 && currentMonthProfit > 0) return 100;
        if (lastYearProfit === 0) return 0;
        // Handle case where last year was a loss
        if (lastYearProfit < 0) {
            return ((currentMonthProfit - lastYearProfit) / Math.abs(lastYearProfit)) * 100;
        }
        return ((currentMonthProfit - lastYearProfit) / lastYearProfit) * 100;
    })();

    const isPositive = percentageChange > 0;
    const isNegative = percentageChange < 0;

    const getTrendInfo = () => {
        if (isPositive) return {
            icon: <TrendingUp size={20} />,
            textColor: 'text-green-400',
            text: `${percentageChange.toFixed(1)}% vs. Last Year`
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
    const profitColor = currentMonthProfit >= 0 ? 'text-white' : 'text-red-400';

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col justify-between">
            <div>
                <p className="text-gray-400 text-sm font-medium flex items-center gap-2">
                    <Percent size={16} />
                    This Month's Profit (from Accounting)
                </p>
                <p className={`text-4xl font-bold mt-2 ${profitColor}`}>
                    R {currentMonthProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

export default YoYProfitWidget;

