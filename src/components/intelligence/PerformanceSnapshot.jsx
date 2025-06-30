// src/components/intelligence/PerformanceSnapshot.jsx

import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const Insight = ({ text, type }) => {
    const config = {
        opportunity: {
            icon: <TrendingUp size={18} className="text-green-400" />,
            textColor: 'text-gray-300'
        },
        alert: {
            icon: <AlertTriangle size={18} className="text-red-400" />,
            textColor: 'text-gray-300'
        }
    };
    const current = config[type] || config.alert;

    return (
        <li className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">{current.icon}</div>
            <p className={`text-sm ${current.textColor}`}>{text}</p>
        </li>
    );
};

const PerformanceSnapshot = ({ metrics }) => {
    const insights = useMemo(() => {
        if (!metrics) return [];

        const {
            individual,
            team,
        } = metrics;

        const results = [];

        if (individual.efficiency > team.efficiency * 1.1) {
            results.push({ text: `Efficiency (${individual.efficiency.toFixed(0)}%) is significantly above the team average of ${team.efficiency.toFixed(0)}%.`, type: 'opportunity' });
        } else if (individual.efficiency < team.efficiency * 0.9) {
            results.push({ text: `Efficiency (${individual.efficiency.toFixed(0)}%) is below the team average of ${team.efficiency.toFixed(0)}%.`, type: 'alert' });
        }

        if (individual.reworkRate > team.reworkRate + 5) {
            results.push({ text: `Rework Rate (${individual.reworkRate.toFixed(1)}%) is higher than the team average of ${team.reworkRate.toFixed(1)}%.`, type: 'alert' });
        } else if (individual.reworkRate < Math.max(team.reworkRate / 2, 0.5)) {
            results.push({ text: `This employee maintains an excellent quality score with a Rework Rate of just ${individual.reworkRate.toFixed(1)}%.`, type: 'opportunity' });
        }

        if (individual.netValueAdded > team.netValueAdded * 1.2) {
            results.push({ text: `This employee is a top value generator, adding R ${individual.netValueAdded.toFixed(0)} compared to the team average of R ${team.netValueAdded.toFixed(0)}.`, type: 'opportunity' });
        } else if (individual.netValueAdded < team.netValueAdded * 0.8) {
             results.push({ text: `Net Value Added (R ${individual.netValueAdded.toFixed(0)}) is lower than the team average (R ${team.netValueAdded.toFixed(0)}).`, type: 'alert' });
        }
        
        return results;

    }, [metrics]);

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Coach's Corner</h3>
            {insights.length > 0 ? (
                <ul className="space-y-3">
                    {insights.map((insight, index) => (
                        <Insight key={index} text={insight.text} type={insight.type} />
                    ))}
                </ul>
            ) : (
                <p className="text-gray-400 text-sm">This employee is performing consistently with the team average.</p>
            )}
        </div>
    );
};

export default PerformanceSnapshot;
