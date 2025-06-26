// src/components/intelligence/ProfitTargetMatrix.jsx (NEW FILE)
import React, { useMemo } from 'react';
import { Target, TrendingUp } from 'lucide-react';

const TargetCard = ({ percent, targetSales, profitAmount, isBreakEven = false }) => {
    const cardColor = isBreakEven ? 'bg-gray-700/50' : 'bg-gray-900/50';
    const textColor = isBreakEven ? 'text-green-400' : 'text-blue-400';

    return (
        <div className={`p-4 rounded-lg flex flex-col items-center text-center ${cardColor}`}>
            <p className={`font-bold text-lg flex items-center gap-2 ${textColor}`}>
                <Target size={20} />
                {percent}% Net Profit
            </p>
            <p className="text-3xl font-bold text-white font-mono mt-2">
                R {targetSales.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-gray-400">Required Sales</p>
            
            <div className="w-full h-px bg-gray-600 my-3"></div>

            <p className="text-xl font-bold text-green-400 font-mono">
                + R {profitAmount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500">Projected Profit</p>
        </div>
    );
};

const ProfitTargetMatrix = ({ totalFixedCosts, historicalGrossMargin }) => {

    const profitTargets = useMemo(() => {
        if (historicalGrossMargin <= 0) return [];
        
        const grossMarginDecimal = historicalGrossMargin / 100;

        return [0, 10, 20, 30, 40].map(profitPercent => {
            const netMarginDecimal = profitPercent / 100;
            
            if (grossMarginDecimal <= netMarginDecimal) {
                 return {
                    percent: profitPercent,
                    target: Infinity,
                    profitAmount: Infinity,
                };
            }

            const requiredSales = totalFixedCosts / (grossMarginDecimal - netMarginDecimal);
            const projectedProfit = (requiredSales * netMarginDecimal);

            return {
                percent: profitPercent,
                target: requiredSales,
                profitAmount: projectedProfit,
            };
        });
    }, [totalFixedCosts, historicalGrossMargin]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
                Monthly Sales & Profit Targets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {profitTargets.map((target) => (
                    target.target === Infinity
                    ? <div key={target.percent} className="p-4 rounded-lg flex flex-col items-center justify-center text-center bg-red-900/50">
                        <p className="font-bold text-lg text-red-400">{target.percent}% Net Profit</p>
                        <p className="text-sm text-red-300 mt-4">Target is unachievable with current Gross Margin.</p>
                      </div>
                    : <TargetCard 
                        key={target.percent}
                        percent={target.percent}
                        targetSales={target.target}
                        profitAmount={target.profitAmount}
                        isBreakEven={target.percent === 0}
                    />
                ))}
            </div>
             <p className="text-xs text-gray-500 mt-4 text-center pt-2 border-t border-gray-700">
                Targets are calculated based on your historical gross margin of **{historicalGrossMargin.toFixed(1)}%** and total fixed costs.
            </p>
        </div>
    );
};

export default ProfitTargetMatrix;

