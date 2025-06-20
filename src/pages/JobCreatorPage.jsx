import React, { useState } from 'react'; // Removed useEffect, useMemo since cloning logic is gone
import MainLayout from '../components/layout/MainLayout';
import JobCardCreator from '../components/features/job_cards/JobCardCreator';
import CustomJobCreator from '../components/features/job_cards/CustomJobCreator';
// Removed searchPreviousJobs import as CloneJobSearch is removed
// Removed Search icon import as CloneJobSearch is removed
// Removed Input import as CloneJobSearch is removed

// Removed CloneJobSearch component entirely as it's no longer needed.

const JobCreatorPage = () => {
    // Simplified mode state, no need for jobToClone
    const [mode, setMode] = useState('catalog'); // 'catalog' or 'custom'

    // Removed handleJobSelectForCloning as cloning functionality is removed

    return (
        <MainLayout>
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Job Card Creator</h2>

                {/* Mode Selection Tabs */}
                <div className="flex gap-2 p-1 bg-gray-800 rounded-lg max-w-xl mx-auto">
                    <button
                        onClick={() => setMode('catalog')}
                        className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors ${mode === 'catalog' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
                    >
                        Create from Catalog
                    </button>
                    {/* Removed 'Clone Previous Job' button */}
                    <button
                        onClick={() => setMode('custom')}
                        className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors ${mode === 'custom' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`} // 
                    >
                        Create Custom Job
                    </button>
                </div>

                {/* Removed rendering for CloneJobSearch */}

                {mode === 'custom' && <CustomJobCreator />} {/*  */}

                {/* Always render JobCardCreator for 'catalog' mode */}
                {mode === 'catalog' && (
                    <JobCardCreator
                        // Removed jobToClone prop entirely as it's no longer used
                        key="catalog-job-creation" // Key ensures component remounts for fresh state for every catalog creation
                    />
                )}
            </div>
        </MainLayout>
    );
};

export default JobCreatorPage;