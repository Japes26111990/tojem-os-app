// src/pages/PickingQueuePage.jsx (NEW FILE)

import React from 'react';
import PickingQueue from '../components/features/picking/PickingQueue';
import { PackageSearch } from 'lucide-react';

const PickingQueuePage = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <PackageSearch size={32} className="text-purple-400" />
                <div>
                    <h2 className="text-3xl font-bold text-white">Picking Queue</h2>
                    <p className="text-gray-400">Live list of materials that need to be picked for scheduled jobs.</p>
                </div>
            </div>
            <PickingQueue />
        </div>
    );
};

export default PickingQueuePage;
