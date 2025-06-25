// FILE: src/pages/DashboardPage.jsx (UPDATED)

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, getAllInventoryItems, getProducts } from '../api/firestore';
import { NavLink } from 'react-router-dom';
import { Activity, Clock, AlertCircle, ShoppingCart, Gauge, HeartPulse, Zap, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend } from 'recharts';


const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-start space-x-4">
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
        <div><p className="text-gray-400 text-sm">{title}</p><p className="text-3xl font-bold text-white">{value}</p></div>
    </div>
);

// --- NEW: Health Score Gauge Component ---
const HealthScoreGauge = ({ score }) => {
    const scoreColor = score > 80 ? '#22c55e' : score > 60 ? '#f59e0b' : '#ef4444';
    const data = [{ name: 'Health', value: score }];

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <HeartPulse size={20} className="text-red-400"/>
                Company Health Score
            </h3>
            <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="60%" 
                    outerRadius="80%" 
                    barSize={20} 
                    data={data}
                    startAngle={180}
                    endAngle={0}
                >
                    <RadialBar
                        minAngle={15}
                        background
                        clockWise
                        dataKey="value"
                        fill={scoreColor}
                        cornerRadius={10}
                    />
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-white">
                        {Math.round(score)}
                    </text>
                     <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" className="text-sm font-semibold fill-gray-400">
                        out of 100
                    </text>
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
};


const DashboardPage = () => {
    const [jobs, setJobs] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]); // Need products for selling price
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all data concurrently
                const [inventoryItems, productItems] = await Promise.all([
                    getAllInventoryItems(),
                    getProducts()
                ]);
                setInventory(inventoryItems);
                setProducts(productItems);

                const unsubscribeJobs = listenToJobCards((fetchedJobs) => {
                    setJobs(fetchedJobs);
                    setLoading(false); // Set loading to false only after jobs are fetched
                });
                return unsubscribeJobs; // Return for cleanup
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                setLoading(false);
            }
        }
        
        const unsubscribePromise = fetchData();

        return () => {
            unsubscribePromise.then(unsubscribe => {
                if (unsubscribe) unsubscribe();
            });
        };
    }, []);

    const dashboardData = useMemo(() => {
        if (loading) return null;

        const productsMap = new Map(products.map(p => [p.id, p]));
        const completedJobs = jobs.filter(j => j.status === 'Complete');

        // --- Calculations for Health Score ---
        let totalEfficiencyRatio = 0;
        let jobsWithTime = 0;
        let totalRevenue = 0;
        let totalCogs = 0;

        completedJobs.forEach(job => {
            // Efficiency Calc
            if (job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                const durationSeconds = (job.completedAt.seconds - job.startedAt.seconds) - (job.totalPausedMilliseconds / 1000 || 0);
                if (durationSeconds > 0) {
                    const estimatedSeconds = job.estimatedTime * 60;
                    totalEfficiencyRatio += (estimatedSeconds / durationSeconds);
                    jobsWithTime++;
                }
            }
            // Profit Calc
            const product = productsMap.get(job.partId);
            if (product && product.sellingPrice > 0) {
                totalRevenue += product.sellingPrice;
                totalCogs += job.totalCost || 0;
            }
        });

        const overallEfficiency = jobsWithTime > 0 ? (totalEfficiencyRatio / jobsWithTime) * 100 : 0;
        const grossProfit = totalRevenue - totalCogs;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const reworkRate = jobs.length > 0 ? (jobs.filter(j => j.status === 'Issue').length / jobs.length) * 100 : 0;

        // --- Health Score Calculation ---
        // Weights: Efficiency 40%, Profitability 40%, Quality (inverse of rework) 20%
        const efficiencyScore = Math.min(100, overallEfficiency); // Cap at 100 for score
        const profitScore = Math.max(0, profitMargin); // Cannot be negative
        const qualityScore = 100 - reworkRate;
        const healthScore = (efficiencyScore * 0.4) + (profitScore * 0.4) + (qualityScore * 0.2);


        // --- Calculations for other dashboard items ---
        const jobsInProgress = jobs.filter(j => j.status === 'In Progress').length;
        const awaitingQc = jobs.filter(j => j.status === 'Awaiting QC').length;
        const issues = jobs.filter(j => j.status === 'Issue');
        const lowStockItems = inventory.filter(item => Number(item.currentStock) < Number(item.reorderLevel)).slice(0, 5);
        const pieChartData = Object.entries(jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1; return acc;
        }, {})).map(([name, value]) => ({ name, value }));
        const PIE_CHART_COLORS = { 'Complete': '#22c55e', 'In Progress': '#3b82f6', 'Awaiting QC': '#a855f7', 'Issue': '#ef4444', 'Pending': '#eab308' };

        // Chart for last 7 days
        const recentJobsData = Array(7).fill(0).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return { name: date.toLocaleDateString('en-US', { weekday: 'short' }), jobs: 0 };
        }).reverse();
        const sevenDaysAgo = new Date(new Date().setDate(new Date().getDate() - 7));
        completedJobs.forEach(job => {
            if (job.completedAt && job.completedAt.toDate() > sevenDaysAgo) {
                const dayName = job.completedAt.toDate().toLocaleDateString('en-US', { weekday: 'short' });
                const dayIndex = recentJobsData.findIndex(d => d.name === dayName);
                if (dayIndex !== -1) recentJobsData[dayIndex].jobs++;
            }
        });
        
        return {
            healthScore,
            kpis: {
                jobsInProgress, awaitingQc, issues: issues.length,
                avgEfficiency: `${Math.round(overallEfficiency)}%`,
                profitMargin: `${Math.round(profitMargin)}%`,
                reworkRate: `${reworkRate.toFixed(1)}%`,
            },
            actionableItems: { lowStockItems, jobsWithIssues: issues.slice(0, 5) },
            charts: { pieChartData, PIE_CHART_COLORS, recentJobsData }
        };
    }, [jobs, inventory, products, loading]);

    if (loading || !dashboardData) {
        return <p>Loading Mission Control...</p>;
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Mission Control</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <HealthScoreGauge score={dashboardData.healthScore} />
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <KpiCard icon={<Activity size={24} />} title="Jobs In Progress" value={dashboardData.kpis.jobsInProgress} color="bg-blue-500/20 text-blue-400" />
                    <KpiCard icon={<Clock size={24} />} title="Awaiting QC" value={dashboardData.kpis.awaitingQc} color="bg-purple-500/20 text-purple-400" />
                    <KpiCard icon={<AlertCircle size={24} />} title="Jobs with Issues" value={dashboardData.kpis.issues} color="bg-red-500/20 text-red-400" />
                    <KpiCard icon={<Zap size={24} />} title="Overall Efficiency" value={dashboardData.kpis.avgEfficiency} color="bg-teal-500/20 text-teal-400" />
                    <KpiCard icon={<Percent size={24} />} title="Profit Margin" value={dashboardData.kpis.profitMargin} color="bg-green-500/20 text-green-400" />
                    <KpiCard icon={<AlertCircle size={24} />} title="Rework Rate" value={dashboardData.kpis.reworkRate} color="bg-orange-500/20 text-orange-400" />
                </div>
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
                            <Pie 
                                data={dashboardData.charts.pieChartData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={80}
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
    );
};

export default DashboardPage;
