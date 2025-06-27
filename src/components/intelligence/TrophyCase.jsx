// src/components/intelligence/TrophyCase.jsx (New File)

import React from 'react';
import { Award, Zap, ShieldCheck, Star, Gem } from 'lucide-react';

const Badge = ({ icon, label, color, description }) => (
    <div className="flex flex-col items-center text-center p-4 bg-gray-800 rounded-lg border border-gray-700" title={description}>
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <p className="mt-2 text-sm font-semibold text-white">{label}</p>
    </div>
);

const TrophyCase = ({ badges }) => {
    if (badges.length === 0) {
        return null; // Don't render the component if there are no badges to show
    }

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Award size={20} className="text-yellow-400" />
                Trophy Case
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {badges.map(badge => (
                    <Badge key={badge.id} {...badge} />
                ))}
            </div>
        </div>
    );
};

export default TrophyCase;