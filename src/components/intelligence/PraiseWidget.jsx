// src/components/intelligence/PraiseWidget.jsx

import React from 'react';
import { ThumbsUp } from 'lucide-react';
import moment from 'moment';

const PraiseWidget = ({ praiseItems, loading }) => {
    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Praise & Recognition</h3>
            {loading && <p className="text-gray-400">Loading praise...</p>}
            {!loading && praiseItems.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No praise received yet. Keep up the great work!</p>
            )}
            {!loading && praiseItems.length > 0 && (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {praiseItems.map(item => (
                        <div key={item.id} className="bg-gray-700/50 p-4 rounded-lg">
                            <blockquote className="text-gray-200 italic border-l-4 border-blue-500 pl-4">
                                "{item.message}"
                            </blockquote>
                            <div className="text-right text-sm text-gray-400 mt-2 flex justify-end items-center gap-2">
                                <ThumbsUp size={14} />
                                <span>- {item.senderName}</span>
                                <span className="text-xs text-gray-500">({moment(item.createdAt?.toDate()).fromNow()})</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PraiseWidget;
