// src/components/intelligence/SalesTargetCalculator.jsx (UPGRADED)
import React, { useMemo } from 'react';
import { Target, DollarSign, TrendingUp } from 'lucide-react';

const TargetRow = ({ percent, targetSales, profitAmount, color }) => (
    <div className={`grid grid-cols-3 gap-4 items-center p-3 rounded-lg ${color}`}>
        <p className="font-bold text-lg flex items-center gap-2">
            <TrendingUp size={20} />
            {percent}% Profit Target
        </p>
        <p className="font-mono text-xl text-center">
            R {targetSales.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        <p className="font-mono text-lg text-right text-green-400">
            + R {profitAmount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
    </div>
);


const SalesTargetCalculator = ({ totalFixedCosts, historicalGrossMargin }) => {

    const profitTargets = useMemo(() => {
        if (historicalGrossMargin <= 0) return [];
        
        const marginDecimal = historicalGrossMargin / 100;
        const breakEvenSales = totalFixedCosts / marginDecimal;

        return [0, 10, 20, 30, 40].map(profitPercent => {
            const desiredProfitAmount = breakEvenSales * (profitPercent / 100);
            const requiredSales = (totalFixedCosts + desiredProfitAmount) / marginDecimal;
            return {
                percent: profitPercent,
                target: requiredSales,
                profitAmount: desiredProfitAmount,
            };
        });
    }, [totalFixedCosts, historicalGrossMargin]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="text-green-400" />
                Monthly Sales & Profit Targets
            </h3>
            <div className="space-y-3">
                 <div className="grid grid-cols-3 gap-4 px-3 text-sm font-semibold text-gray-400">
                    <span>Target Level</span>
                    <span className="text-center">Required Sales</span>
                    <span className="text-right">Projected Profit</span>
                </div>
                {profitTargets.map((target, index) => (
                    <TargetRow 
                        key={target.percent}
                        percent={target.percent}
                        targetSales={target.target}
                        profitAmount={target.profitAmount}
                        color={index === 0 ? 'bg-gray-700/50' : 'bg-gray-900/50'}
                    />
                ))}
                 <p className="text-xs text-gray-500 mt-2 text-center pt-2 border-t border-gray-700">
                    Targets are calculated based on your historical gross margin of {historicalGrossMargin.toFixed(1)}% and total fixed costs.
                </p>
            </div>
        </div>
    );
};

export default SalesTargetCalculator;
