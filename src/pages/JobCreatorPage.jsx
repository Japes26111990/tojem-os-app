// src/pages/JobCreatorPage.jsx

import React, { useState, useEffect } from 'react';
import CustomJobCreator from '../components/features/job_cards/CustomJobCreator';
import { getCampaigns } from '../api/firestore'; // Import campaign fetch function
import JobCardCreator from '../components/features/job_cards/JobCardCreator';
import Dropdown from '../components/ui/Dropdown'; // We'll use this for the new dropdown

const JobCreatorPage = () => {
    const [mode, setMode] = useState('catalog');
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState(''); // State for the selected campaign

    // Fetch active campaigns when the page loads
    useEffect(() => {
        const fetchActiveCampaigns = async () => {
            try {
                const allCampaigns = await getCampaigns();
                // Filter for campaigns that are currently active or recently ended
                const now = new Date();
                const active = allCampaigns.filter(c => {
                    const startDate = c.startDate?.toDate();
                    const endDate = c.endDate?.toDate();
                    if (!startDate) return false;
                    // If no end date, it's active if start date is in the past
                    if (!endDate) return startDate <= now;
                    // If there is an end date, it's active if today is between start and end
                    return startDate <= now && endDate >= now;
                });
                setCampaigns(active);
            } catch (error) {
                console.error("Failed to fetch campaigns:", error);
            }
        };
        fetchActiveCampaigns();
    }, []);

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Job Card Creator</h2>
            
            {/* New Section: Campaign Selection */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-xl mx-auto">
                <Dropdown
                    label="Marketing Campaign (Optional)"
                    name="campaignSelector"
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    options={campaigns}
                    placeholder="Select campaign that generated this job..."
                />
                <p className="text-xs text-gray-500 mt-2">
                    Tagging a job with a campaign helps track your return on investment. You can manage campaigns in Settings.
                </p>
            </div>

            <div className="flex gap-2 p-1 bg-gray-800 rounded-lg max-w-xl mx-auto">
                <button
                    onClick={() => setMode('catalog')}
                    className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors ${mode === 'catalog' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
                >
                    Create from Catalog
                </button>
                <button
                    onClick={() => setMode('custom')}
                    className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors ${mode === 'custom' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
                >
                    Create Custom Job
                </button>
            </div>

            {mode === 'custom' && 
                <CustomJobCreator 
                    // Pass the selected campaign ID down
                    campaignId={selectedCampaignId} 
                />
            }

            {mode === 'catalog' && (
                <JobCardCreator
                    key="catalog-job-creation"
                    // Pass the selected campaign ID down
                    campaignId={selectedCampaignId} 
                />
            )}
        </div>
    );
};

export default JobCreatorPage;