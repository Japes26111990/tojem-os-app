// src/components/intelligence/BreakEvenCalculator.jsx (FIXED)
import React, { useMemo } from 'react'; // useMemo is now correctly imported
import { Target, DollarSign } from 'lucide-react';

const BreakEvenCalculator = ({ totalFixedCosts, historicalGrossMargin }) => {

    const breakEvenSales = useMemo(() => {
        if (historicalGrossMargin <= 0) {
            return 0; // Avoid division by zero or negative margin
        }
        return totalFixedCosts / (historicalGrossMargin / 100);
    }, [totalFixedCosts, historicalGrossMargin]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="text-green-400" />
                Monthly Break-Even Target
            </h3>
            <div className="text-center bg-gray-900/50 p-6 rounded-lg">
                <p className="text-sm text-gray-400">Required sales to cover all fixed costs</p>
                <p className="text-5xl font-bold text-green-400 font-mono mt-2">
                    R {breakEvenSales.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                    Based on a historical gross margin of {historicalGrossMargin.toFixed(1)}%
                </p>
            </div>
        </div>
    );
};

export default BreakEvenCalculator;
