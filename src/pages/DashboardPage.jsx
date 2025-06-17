import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { listenToJobCards, getAllInventoryItems } from '../api/firestore'; // Import new function
import { Activity, CheckCircle2, Clock, AlertCircle, TrendingUp, DollarSign, CalendarDays, Flag, Package, Box, ShoppingCart } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-start space-x-4">
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        <div><p className="text-gray-400 text-sm">{title}</p><p className="text-3xl font-bold text-white">{value}</p></div>
    </div>
);

const MetricCard = ({ icon, title, value, unit }) => (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="flex items-center text-gray-400">{icon}<span className="text-sm ml-2">{title}</span></div>
        <p className="text-2xl font-bold text-white mt-2">{value} <span className="text-base font-medium text-gray-400">{unit}</span></p>
    </div>
);

const DashboardPage = () => {
    const [jobs, setJobs] = useState([]);
    const [inventory, setInventory] = useState([]); // New state for inventory
    const [loading, setLoading] = useState(true);

    const businessData = {
        monthlyTarget: 280000.00,
        currentSales: 71922.50,
        workdaysLeftMonth: 10,
    };

    useEffect(() => {
        // Now we fetch both jobs and inventory data
        const fetchData = async () => {
            const inventoryItems = await getAllInventoryItems();
            setInventory(inventoryItems);
        }

        const unsubscribeJobs = listenToJobCards((fetchedJobs) => {
            setJobs(fetchedJobs);
            setLoading(false); // We can set loading to false once jobs are here
        });
        
        fetchData();
        return () => unsubscribeJobs();
    }, []);

    const { liveKpis, salesKpis, actionableItems } = useMemo(() => {
        // Live Production KPIs
        const jobsInProgress = jobs.filter(j => j.status === 'In Progress').length;
        const awaitingQc = jobs.filter(j => j.status === 'Awaiting QC').length;
        const issues = jobs.filter(j => j.status === 'Issue');

        // Sales KPIs
        const percentToTarget = (businessData.currentSales / businessData.monthlyTarget) * 100;
        const salesPerDay = (businessData.monthlyTarget - businessData.currentSales) / businessData.workdaysLeftMonth;

        // Actionable Item Lists
        const lowStockItems = inventory.filter(item => item.currentStock < item.reorderLevel).slice(0, 5); // Show top 5
        const jobsWithIssues = issues.slice(0, 5); // Show top 5

        return {
            liveKpis: { jobsInProgress, awaitingQc, issues: issues.length },
            salesKpis: { percentToTarget: isNaN(percentToTarget) ? 0 : percentToTarget, salesPerDay: isNaN(salesPerDay) ? 0 : salesPerDay },
            actionableItems: { lowStockItems, jobsWithIssues }
        };
    }, [jobs, inventory, businessData]);


    if (loading) {
        return <MainLayout><p>Loading Mission Control...</p></MainLayout>;
    }

    return (
        <MainLayout>
             <div className="space-y-10">
                <h2 className="text-3xl font-bold text-white">Mission Control</h2>
                
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-white">Monthly Sales Target</h3>
                        <span className="text-lg font-bold text-green-400">{salesKpis.percentToTarget.toFixed(2)}%</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">R{businessData.currentSales.toFixed(2)} / <span className="font-semibold">R{businessData.monthlyTarget.toFixed(2)}</span></p>
                    <div className="w-full bg-gray-600 rounded-full h-4"><div className="bg-green-500 h-4 rounded-full" style={{ width: `${salesKpis.percentToTarget}%` }}></div></div>
                    <div className="mt-4 text-center"><p className="text-gray-300">You need to average <span className="font-bold text-lg text-yellow-400">R{salesKpis.salesPerDay.toFixed(2)}</span> per workday to hit your target.</p></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <KpiCard icon={<Activity size={24} />} title="Jobs In Progress" value={liveKpis.jobsInProgress} color="bg-blue-500/20 text-blue-400" />
                    <KpiCard icon={<Clock size={24} />} title="Awaiting QC" value={liveKpis.awaitingQc} color="bg-purple-500/20 text-purple-400" />
                    <KpiCard icon={<AlertCircle size={24} />} title="Jobs with Issues" value={liveKpis.issues} color="bg-red-500/20 text-red-400" />
                </div>

                {/* --- NEW ACTIONABLE WIDGETS --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="font-bold text-white mb-4 flex items-center"><ShoppingCart size={20} className="mr-2 text-yellow-400"/> Inventory Alerts</h3>
                        <div className="space-y-3">
                            {actionableItems.lowStockItems.length > 0 ? actionableItems.lowStockItems.map(item => (
                                <div key={item.id} className="text-sm p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-200">{item.name}</p>
                                        <p className="text-red-400">In Stock: {item.currentStock} (Reorder at {item.reorderLevel})</p>
                                    </div>
                                    <NavLink to="/stock" className="text-blue-400 hover:text-blue-300 font-semibold">View</NavLink>
                                </div>
                            )) : <p className="text-gray-400 text-sm">All stock levels are healthy.</p>}
                        </div>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="font-bold text-white mb-4 flex items-center"><AlertCircle size={20} className="mr-2 text-red-400"/> Jobs Requiring Attention</h3>
                        <div className="space-y-3">
                            {actionableItems.jobsWithIssues.length > 0 ? actionableItems.jobsWithIssues.map(job => (
                                <div key={job.id} className="text-sm p-3 bg-gray-700/50 rounded-lg">
                                    <p className="font-semibold text-gray-200">{job.partName} <span className="text-xs text-gray-400">({job.jobId})</span></p>
                                    <p className="text-red-400">Reason: {job.issueReason || 'No reason given.'}</p>
                                </div>
                            )) : <p className="text-gray-400 text-sm">No jobs have outstanding issues.</p>}
                        </div>
                    </div>
                </div>
             </div>
        </MainLayout>
    );
};

export default DashboardPage;