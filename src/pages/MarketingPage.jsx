// FILE: src/pages/MarketingPage.jsx (Upgraded with Toasts)

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards } from '../api/firestore';
import { getCampaigns } from '../api/firestore';
import Button from '../components/ui/Button';
import { DollarSign, Users, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const KpiCard = ({ icon, title, value, color, subValue }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
                {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
            </div>
        </div>
    </div>
);

const MarketingPage = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRange, setActiveRange] = useState('all');

    useEffect(() => {
        let unsubscribeJobs = () => {};
        const fetchData = async () => {
            setLoading(true);
            try {
                const fetchedCampaigns = await getCampaigns();
                setCampaigns(fetchedCampaigns);
                
                unsubscribeJobs = listenToJobCards((fetchedJobs) => {
                    setJobs(fetchedJobs);
                });

            } catch (error) {
                console.error("Error fetching marketing data:", error);
                toast.error("Could not load marketing data."); // --- REPLACED ALERT ---
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        
        return () => unsubscribeJobs();
    }, []);

    const processedData = useMemo(() => {
        const now = new Date();
        let startDate = null;

        if (activeRange === '30d') {
            startDate = new Date(new Date().setDate(now.getDate() - 30));
        } else if (activeRange === '90d') {
            startDate = new Date(new Date().setDate(now.getDate() - 90));
        }

        const filteredCampaigns = campaigns.filter(campaign => {
            if (!startDate) return true;
            const campaignStartDate = campaign.startDate?.toDate();
            return campaignStartDate && campaignStartDate >= startDate;
        });
        
        const completedJobs = jobs.filter(j => j.status === 'Complete' && j.campaignId);

        const campaignsWithMetrics = filteredCampaigns.map(campaign => {
            const associatedJobs = completedJobs.filter(job => job.campaignId === campaign.id);
            const salesCount = associatedJobs.length;
            const revenue = associatedJobs.reduce((sum, job) => sum + (job.totalCost || 0), 0);
            
            const estimatedProfit = associatedJobs.reduce((sum, job) => {
                const jobCost = job.totalCost || 0;
                return sum + (jobCost * 0.30);
            }, 0);

            const budget = campaign.budget || 0;
            const leads = campaign.leadsGenerated || 0;
            const conversionRate = leads > 0 ? (salesCount / leads) * 100 : 0;
            const roi = budget > 0 ? (estimatedProfit / budget) * 100 : 0;
            const costPerLead = leads > 0 ? budget / leads : 0;

            return {
                ...campaign,
                salesCount,
                revenue,
                estimatedProfit,
                conversionRate,
                roi,
                costPerLead,
            };
        });

        const totalBudget = campaignsWithMetrics.reduce((sum, c) => sum + c.budget, 0);
        const totalLeads = campaignsWithMetrics.reduce((sum, c) => sum + c.leadsGenerated, 0);
        const totalSales = campaignsWithMetrics.reduce((sum, c) => sum + c.salesCount, 0);
        const totalRevenue = campaignsWithMetrics.reduce((sum, c) => sum + c.revenue, 0);
        const totalProfit = campaignsWithMetrics.reduce((sum, c) => sum + c.estimatedProfit, 0);
        const overallRoi = totalBudget > 0 ? (totalProfit / totalBudget) * 100 : 0;
        
        return {
            campaigns: campaignsWithMetrics,
            totalBudget,
            totalLeads,
            totalSales,
            totalRevenue,
            overallRoi,
        };
    }, [campaigns, jobs, activeRange]);

    const formatDate = (timestamp) => {
        if (!timestamp?.toDate) return 'N/A';
        return timestamp.toDate().toLocaleDateString('en-ZA');
    };

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Marketing Dashboard</h2>
            
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button variant={activeRange === '30d' ? 'primary' : 'secondary'} onClick={() => setActiveRange('30d')}>Last 30 Days</Button>
                    <Button variant={activeRange === '90d' ? 'primary' : 'secondary'} onClick={() => setActiveRange('90d')}>Last 90 Days</Button>
                    <Button variant={activeRange === 'all' ? 'primary' : 'secondary'} onClick={() => setActiveRange('all')}>All Time</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    icon={<DollarSign size={24} />} 
                    title="Marketing Spend" 
                    value={`R ${processedData.totalBudget.toFixed(2)}`}
                    color="bg-yellow-500/20 text-yellow-400" 
                />
                 <KpiCard 
                    icon={<Users size={24} />} 
                    title="Leads Generated" 
                    value={processedData.totalLeads}
                    color="bg-blue-500/20 text-blue-400" 
                />
                 <KpiCard 
                    icon={<DollarSign size={24} />} 
                    title="Revenue from Campaigns" 
                    value={`R ${processedData.totalRevenue.toFixed(2)}`}
                    subValue={`${processedData.totalSales} sales`}
                    color="bg-green-500/20 text-green-400" 
                />
                <KpiCard 
                    icon={<TrendingUp size={24} />} 
                    title="Overall ROI" 
                    value={`${processedData.overallRoi.toFixed(1)}%`}
                    color="bg-purple-500/20 text-purple-400" 
                />
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <h3 className="text-xl font-bold text-white p-4 border-b border-gray-700">Campaign Performance</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-400">Campaign</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Budget</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Leads</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Sales</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Conv. Rate</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">Revenue</th>
                                <th className="p-3 text-sm font-semibold text-gray-400 text-right">ROI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center p-8 text-gray-400">Loading campaign performance...</td></tr>
                            ) : processedData.campaigns.length === 0 ? (
                                <tr><td colSpan="7" className="text-center p-8 text-gray-400">No campaigns found for the selected period.</td></tr>
                            ) : (
                                processedData.campaigns.map(campaign => (
                                    <tr key={campaign.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-3 text-white font-semibold">{campaign.name} <span className="text-xs text-gray-400 font-normal">({campaign.platform})</span></td>
                                        <td className="p-3 text-gray-300 font-mono text-right">R{campaign.budget.toFixed(2)}</td>
                                        <td className="p-3 font-bold text-right">{campaign.leadsGenerated || 0}</td>
                                        <td className="p-3 font-bold text-right">{campaign.salesCount}</td>
                                        <td className="p-3 text-blue-400 font-mono text-right">{campaign.conversionRate.toFixed(1)}%</td>
                                        <td className="p-3 text-green-400 font-mono text-right">R{campaign.revenue.toFixed(2)}</td>
                                        <td className={`p-3 font-bold text-right font-mono ${campaign.roi >= 0 ? 'text-purple-400' : 'text-red-400'}`}>{campaign.roi.toFixed(1)}%</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MarketingPage;