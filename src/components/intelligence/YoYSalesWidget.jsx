// src/components/intelligence/YoYSalesWidget.jsx (NEW FILE)
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SALES_REPORT_TITLES } from '../../config'; // Import SALES_REPORT_TITLES

const YoYSalesWidget = ({ currentMonthSales, lastYearSales }) => {
    // This component is UI-only for now, logic will be added in DashboardPage.jsx
    
    const percentageChange = (() => {
        if (lastYearSales === 0 && currentMonthSales > 0) return 100; // Growth from zero
        if (lastYearSales === 0) return 0; // No change from zero
        return ((currentMonthSales - lastYearSales) / lastYearSales) * 100;
    })();

    const isPositive = percentageChange > 0;
    const isNegative = percentageChange < 0;
    const isNeutral = percentageChange === 0;

    const getTrendInfo = () => {
        if (isPositive) return {
            icon: <TrendingUp size={20} className="text-green-400" />,
            textColor: 'text-green-400',
            text: `${percentageChange.toFixed(1)}% ${SALES_REPORT_TITLES.VS_LAST_YEAR}` // Use SALES_REPORT_TITLES.VS_LAST_YEAR
        };
        if (isNegative) return {
            icon: <TrendingDown size={20} className="text-red-400" />,
            textColor: 'text-red-400',
            text: `${percentageChange.toFixed(1)}% ${SALES_REPORT_TITLES.VS_LAST_YEAR}` // Use SALES_REPORT_TITLES.VS_LAST_YEAR
        };
        return {
            icon: <Minus size={20} className="text-gray-400" />,
            textColor: 'text-gray-400',
            text: `No Change ${SALES_REPORT_TITLES.VS_LAST_YEAR}` // Use SALES_REPORT_TITLES.VS_LAST_YEAR
        };
    };
    
    const trend = getTrendInfo();

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col justify-between">
            <div>
                <p className="text-gray-400 text-sm font-medium">
                    {SALES_REPORT_TITLES.CURRENT_MONTH_SALES_LIVE} {/* Use SALES_REPORT_TITLES.CURRENT_MONTH_SALES_LIVE */}
                </p>
                <p className="text-4xl font-bold text-white mt-2">
                    R {currentMonthSales.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
            <div className="mt-4 flex items-center space-x-2">
                {trend.icon}
                <span className={`font-semibold ${trend.textColor}`}>
                    {trend.text}
                </span>
            </div>
        </div>
    );
};

export default YoYSalesWidget;
