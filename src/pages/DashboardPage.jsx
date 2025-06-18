import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { listenToJobCards, getAllInventoryItems } from '../api/firestore';
import { NavLink } from 'react-router-dom';
import { Activity, Clock, AlertCircle, ShoppingCart, Gauge } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';


const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-start space-x-4">
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        <div><p className="text-gray-400 text-sm">{title}</p><p className="text-3xl font-bold text-white">{value}</p></div>
    </div>
);

const DashboardPage = () => {
    const [jobs, setJobs] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    const businessData = {
        monthlyTarget: 280000.00,
        currentSales: 71922.50,
        workdaysLeftMonth: 10,
    };

    useEffect(() => {
        const fetchData = async () => {
            const inventoryItems = await getAllInventoryItems();
            setInventory(inventoryItems);
        }
        const unsubscribeJobs = listenToJobCards((fetchedJobs) => {
            setJobs(fetchedJobs);
            setLoading(false);
        });
        fetchData();
        return () => unsubscribeJobs();
    }, []);

    const dashboardData = useMemo(() => {
        const jobsInProgress = jobs.filter(j => j.status === 'In Progress').length;
        const awaitingQc = jobs.filter(j => j.status === 'Awaiting QC').length;
        const issues = jobs.filter(j => j.status === 'Issue');
        const lowStockItems = inventory.filter(item => Number(item.currentStock) < Number(item.reorderLevel)).slice(0, 5);
        const completedJobsWithTime = jobs.filter(j => j.startedAt && j.completedAt && j.estimatedTime > 0);
        let averageEfficiency = 0;
        if (completedJobsWithTime.length > 0) {
            const totalEfficiency = completedJobsWithTime.reduce((acc, job) => {
                const actualSeconds = job.completedAt.seconds - job.startedAt.seconds;
                const estimatedSeconds = job.estimatedTime * 60;
                if(actualSeconds > 0) {
                   return acc + (estimatedSeconds / actualSeconds);
                }
                return acc;
            }, 0);
            averageEfficiency = (totalEfficiency / completedJobsWithTime.length) * 100;
        }

        const statusCounts = jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
        }, {});
        const pieChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        const PIE_CHART_COLORS = { 'Complete': '#22c55e', 'In Progress': '#3b82f6', 'Awaiting QC': '#a855f7', 'Issue': '#ef4444', 'Pending': '#eab308' };

        const recentJobsData = Array(7).fill(0).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return {
                name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                jobs: 0
            };
        }).reverse();

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        jobs.forEach(job => {
            if (job.status === 'Complete' && job.completedAt && job.completedAt.toDate() > sevenDaysAgo) {
                const dayName = job.completedAt.toDate().toLocaleDateString('en-US', { weekday: 'short' });
                const dayIndex = recentJobsData.findIndex(d => d.name === dayName);
                if (dayIndex !== -1) {
                    recentJobsData[dayIndex].jobs += 1;
                }
            }
        });

        return {
            kpis: {
                jobsInProgress, awaitingQc, issues: issues.length,
                avgEfficiency: `${Math.round(averageEfficiency)}%`,
            },
            actionableItems: { lowStockItems, jobsWithIssues: jobs.filter(j => j.status === 'Issue').slice(0, 5) },
            charts: {
                pieChartData,
                PIE_CHART_COLORS,
                recentJobsData
            }
        };
    }, [jobs, inventory]);

    if (loading) {
        return <MainLayout><p>Loading Mission Control...</p></MainLayout>;
    }

    return (
        <MainLayout>
            <div className="space-y-10">
                <h2 className="text-3xl font-bold text-white">Mission Control</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard icon={<Activity size={24} />} title="Jobs In Progress" value={dashboardData.kpis.jobsInProgress} color="bg-blue-500/20 text-blue-400" />
                    <KpiCard icon={<Clock size={24} />} title="Awaiting QC" value={dashboardData.kpis.awaitingQc} color="bg-purple-500/20 text-purple-400" />
                    <KpiCard icon={<AlertCircle size={24} />} title="Jobs with Issues" value={dashboardData.kpis.issues} color="bg-red-500/20 text-red-400" />
                    <KpiCard icon={<Gauge size={24} />} title="Avg. Job Efficiency" value={dashboardData.kpis.avgEfficiency} color="bg-teal-500/20 text-teal-400" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700">
                         <h3 className="font-bold text-white mb-4">Jobs Completed This Week</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dashboardData.charts.recentJobsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip cursor={{fill: 'rgba(107, 114, 128, 0.1)'}} contentStyle={{backgroundColor: '#1f2937', border: '1px solid #4b5563'}}/>
                                <Bar dataKey="jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="font-bold text-white mb-4">Live Job Status Breakdown</h3>
                         <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                {/* --- THE FIX IS HERE --- */}
                                <Pie 
                                    data={dashboardData.charts.pieChartData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} // <-- Changed from 100 to 80 to prevent clipping
                                    labelLine={false} 
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                    {dashboardData.charts.pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={dashboardData.charts.PIE_CHART_COLORS[entry.name] || '#6b7280'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #4b5563'}}/>
                            </PieChart>
                         </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="font-bold text-white mb-4 flex items-center"><ShoppingCart size={20} className="mr-2 text-yellow-400"/> Inventory Alerts</h3>
                        <div className="space-y-3">
                            {dashboardData.actionableItems.lowStockItems.length > 0 ? dashboardData.actionableItems.lowStockItems.map(item => (
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
                            {dashboardData.actionableItems.jobsWithIssues.length > 0 ? dashboardData.actionableItems.jobsWithIssues.map(job => (
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