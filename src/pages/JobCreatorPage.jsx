import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import JobCardCreator from '../components/features/job_cards/JobCardCreator';
import { searchPreviousJobs } from '../api/firestore';
import { Search } from 'lucide-react';
import Input from '../components/ui/Input';

// This is the new search component for the "Clone" mode
const CloneJobSearch = ({ onJobSelect }) => {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // This useEffect hook handles the search logic with debouncing
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchText.length > 2) {
                setLoading(true);
                const searchResults = await searchPreviousJobs(searchText);
                setResults(searchResults);
                setLoading(false);
            } else {
                setResults([]);
            }
        }, 500); // Wait 500ms after user stops typing

        return () => {
            clearTimeout(handler); // Cleanup the timeout
        };
    }, [searchText]);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Search for a Previous Job by Part Name</h3>
            <div className="relative">
                <Input 
                    name="jobSearch"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Start typing a part name..."
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {loading && <p className="text-center mt-4 text-gray-400">Searching...</p>}
            
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {results.map(job => (
                    <div 
                        key={job.id} 
                        className="p-3 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer flex justify-between items-center"
                        onClick={() => onJobSelect(job)}
                    >
                        <div>
                            <p className="font-semibold text-white">{job.partName}</p>
                            <p className="text-xs text-gray-400">{job.jobId} - Created on: {job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <span className="text-xs text-blue-400 font-bold">Use as Template</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Placeholder for the custom job creator
const CustomJobCreator = () => {
    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Create a One-Off / Custom Job</h3>
            <p className="text-center text-gray-400">The form for creating custom jobs with manual inputs for description, steps, and consumables will be built here in a future step.</p>
        </div>
    );
};


const JobCreatorPage = () => {
    const [mode, setMode] = useState('catalog');
    const [jobToClone, setJobToClone] = useState(null);

    const handleJobSelectForCloning = (job) => {
        setJobToClone(job);
        setMode('catalog');
    };

    return (
        <MainLayout>
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Job Card Creator</h2>
                
                <div className="flex gap-2 p-1 bg-gray-800 rounded-lg max-w-xl mx-auto">
                    <button onClick={() => { setMode('catalog'); setJobToClone(null); }} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors ${mode === 'catalog' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                        Create from Catalog
                    </button>
                    <button onClick={() => setMode('clone')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors ${mode === 'clone' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                        Clone Previous Job
                    </button>
                    <button onClick={() => setMode('custom')} className={`flex-1 p-2 text-sm font-semibold rounded-md transition-colors ${mode === 'custom' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>
                        Create Custom Job
                    </button>
                </div>
                
                {mode === 'clone' && <CloneJobSearch onJobSelect={handleJobSelectForCloning} />}
                
                {mode === 'custom' && <CustomJobCreator />}

                {(mode === 'catalog') && (
                    <JobCardCreator jobToClone={jobToClone} key={jobToClone ? jobToClone.id : 'new'} />
                )}
            </div>
        </MainLayout>
    );
};

export default JobCreatorPage;