import React, { useState, useEffect, useMemo } from 'react';
import { getTools, listenToJobCards, getJobStepDetails } from '../api/firestore';
import Dropdown from '../components/ui/Dropdown';
import AssetPerformanceWidget from '../components/intelligence/AssetPerformanceWidget.jsx';

const AssetIntelligencePage = () => {
    const [tools, setTools] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [selectedToolId, setSelectedToolId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [fetchedTools, fetchedRecipes] = await Promise.all([
                    getTools(),
                    getJobStepDetails()
                ]);
                setTools(fetchedTools.filter(t => t.hourlyRate > 0));
                setRecipes(fetchedRecipes);
                
                const unsubscribeJobs = listenToJobCards(setJobs);
                setLoading(false);
                
                return unsubscribeJobs;
            } catch (error) {
                console.error("Error fetching data for Asset Intelligence:", error);
                setLoading(false);
            }
        };

        const unsubscribePromise = fetchData();
        return () => { unsubscribePromise.then(unsub => unsub && unsub()); };
    }, []);

    const analysisData = useMemo(() => {
        if (!selectedToolId) return null;

        const selectedTool = tools.find(t => t.id === selectedToolId);
        if (!selectedTool) return null;

        let totalRunMinutes = 0;
        const contributingJobIds = new Set();
        
        recipes.forEach(recipe => {
            if(recipe.steps && Array.isArray(recipe.steps)) {
                recipe.steps.forEach(step => {
                    if (step.toolId === selectedToolId) {
                        const completedJobsWithRecipe = jobs.filter(job => 
                            job.status === 'Complete' &&
                            job.partId === recipe.productId &&
                            job.departmentId === recipe.departmentId
                        );

                        completedJobsWithRecipe.forEach(job => {
                            totalRunMinutes += step.time || 0;
                            contributingJobIds.add(job.id);
                        });
                    }
                });
            }
        });
        
        const jobsContributed = contributingJobIds.size;
        const totalRunHours = totalRunMinutes / 60;
        const totalOperatingCost = totalRunHours * (selectedTool.hourlyRate || 0);

        const jobsWithTool = jobs.filter(job => contributingJobIds.has(job.id));
        const issueJobsWithTool = jobsWithTool.filter(job => job.status === 'Issue' || job.status === 'Archived - Issue').length;
        const qualityRate = jobsContributed > 0 ? ((jobsContributed - issueJobsWithTool) / jobsContributed) * 100 : 100;

        return {
            name: selectedTool.name,
            totalRunHours,
            totalOperatingCost,
            jobsContributed,
            qualityRate
        };

    }, [selectedToolId, tools, jobs, recipes]);

    if (loading) {
        return <p className="text-center text-gray-400">Loading Asset Intelligence Engine...</p>;
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Asset Intelligence & ROI</h2>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-lg">
                <Dropdown
                    label="Select an Asset to Analyze"
                    value={selectedToolId}
                    onChange={(e) => setSelectedToolId(e.target.value)}
                    options={tools}
                    placeholder="Choose a machine..."
                />
                 <p className="text-xs text-gray-500 mt-2">Only assets with an hourly rate configured in Settings will appear here.</p>
            </div>

            <AssetPerformanceWidget assetData={analysisData} />
        </div>
    );
};

export default AssetIntelligencePage;
