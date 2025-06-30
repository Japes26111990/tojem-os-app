// src/components/intelligence/YearToDateComparison.jsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

const YearToDateComparison = ({ percentageChange }) => {
    
    const isPositive = percentageChange > 0;
    const isNegative = percentageChange < 0;

    const getTrendInfo = () => {
        if (isPositive) return {
            icon: <TrendingUp size={32} />,
            textColor: 'text-green-400',
            text: `${percentageChange.toFixed(1)}%`
        };
        if (isNegative) return {
            icon: <TrendingDown size={32} />,
            textColor: 'text-red-400',
            text: `${percentageChange.toFixed(1)}%`
        };
        return {
            icon: <Minus size={32} />,
            textColor: 'text-gray-400',
            text: `${percentageChange.toFixed(1)}%`
        };
    };
    
    const trend = getTrendInfo();

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col justify-center items-center">
            <p className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar size={14} />
                Year-to-Date Sales vs. Last Year
            </p>
            <div className={`flex items-center space-x-3 ${trend.textColor}`}>
                {trend.icon}
                <span className="text-5xl font-bold">
                    {trend.text}
                </span>
            </div>
        </div>
    );
};

export default YearToDateComparison;
