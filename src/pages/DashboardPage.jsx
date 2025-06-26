// src/pages/DashboardPage.jsx (REORGANIZED & FIXED)

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, getAllInventoryItems, getProducts, getEmployees, collection, getDocs } from '../api/firestore';
import { db } from '../api/firebase';
import { NavLink } from 'react-router-dom';
import { Activity, Clock, AlertCircle, ShoppingCart, HeartPulse, Zap, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';

// Import all widgets for the new layout
import YearToDateComparison from '../components/intelligence/YearToDateComparison';
import MonthlySalesTrend from '../components/intelligence/MonthlySalesTrend';
import CapacityGauge from '../components/intelligence/CapacityGauge';
// HealthScoreGauge is defined below, so the incorrect import has been removed.
import WorkshopThroughputGraph from '../components/intelligence/WorkshopThroughputGraph';
import MultiYearSalesGraph from '../components/intelligence/MultiYearSalesGraph';

const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg flex items-center space-x-3">
        <div className={`p-2 rounded-full ${color}`}>{icon}</div>
        <div><p className="text-gray-400 text-xs">{title}</p><p className="text-xl font-bold text-white">{value}</p></div>
    </div>
);

// HealthScoreGauge component is now defined directly inside DashboardPage.jsx
const HealthScoreGauge = ({ score }) => {
    const scoreColor = score > 80 ? '#22c55e' : score > 60 ? '#f59e0b' : '#ef4444';
    const data = [{ name: 'Health', value: score }];

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 h-full flex flex-col justify-center items-center">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                <HeartPulse size={20} className="text-red-400"/>
                Company Health Score
            </h3>
            <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                    <Pie 
                        data={data} 
                        dataKey="value"
                        nameKey="name"
                        cx="50%" 
                        cy="100%" 
                        startAngle={180} 
                        endAngle={0} 
                        innerRadius={60} 
                        outerRadius={90} 
                        fill={scoreColor} 
                        paddingAngle={2}
                        labelLine={false}
                    >
                         <Cell key={`cell-0`} fill={scoreColor} cornerRadius={10} />
                    </Pie>
                     <text x="50%" y="85%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-white">
                        {Math.round(score)}
                    </text>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

const DashboardPage = () => {
    const [jobs, setJobs] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [historicalSales, setHistoricalSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [inventoryItems, productItems, employeeItems, historicalSalesSnapshot] = await Promise.all([
                    getAllInventoryItems(), getProducts(), getEmployees(), getDocs(collection(db, 'historicalSales'))
                ]);
                setInventory(inventoryItems);
                setProducts(productItems);
                setEmployees(employeeItems);
                setHistoricalSales(historicalSalesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()})))
                const unsubscribeJobs = listenToJobCards(setJobs);
                setLoading(false); 
                return unsubscribeJobs;
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                setLoading(false);
            }
        }
        
        const unsubscribePromise = fetchData();
        return () => { unsubscribePromise.then(unsubscribe => { if (unsubscribe) unsubscribe(); }); };
    }, []);

    const dashboardData = useMemo(() => {
        if (loading) return null;

        const now = new Date();
        const currentMonthIndex = now.getMonth();
        const currentYear = now.getFullYear();
        const lastYear = currentYear - 1;

        // --- Monthly Sales Percentage Change ---
        const currentMonthData = historicalSales.find(d => d.year === currentYear && d.month === (currentMonthIndex + 1));
        const currentMonthSales = currentMonthData?.totalSales || 0;
        const lastYearData = historicalSales.find(d => d.year === lastYear && d.month === (currentMonthIndex + 1));
        const lastYearSales = lastYearData?.totalSales || 0;
        
        const monthlyPercentageChange = (() => {
            if (lastYearSales === 0 && currentMonthSales > 0) return 100;
            if (lastYearSales === 0) return 0;
            return ((currentMonthSales - lastYearSales) / lastYearSales) * 100;
        })();

        // --- Year-to-Date (YTD) Percentage Change ---
        const ytdCurrentYearSales = historicalSales
            .filter(d => d.year === currentYear && d.month <= (currentMonthIndex + 1))
            .reduce((sum, d) => sum + d.totalSales, 0);

        const ytdLastYearSales = historicalSales
            .filter(d => d.year === lastYear && d.month <= (currentMonthIndex + 1))
            .reduce((sum, d) => sum + d.totalSales, 0);

        const ytdPercentageChange = (() => {
            if (ytdLastYearSales === 0 && ytdCurrentYearSales > 0) return 100;
            if (ytdLastYearSales === 0) return 0;
            return ((ytdCurrentYearSales - ytdLastYearSales) / ytdLastYearSales) * 100;
        })();

        // --- Multi-Year Sales Graph Data ---
        const uniqueYears = [...new Set(historicalSales.map(d => d.year))].sort();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const multiYearSalesData = monthNames.map((monthName, index) => {
            const monthData = { name: monthName };
            uniqueYears.forEach(year => {
                const record = historicalSales.find(d => d.year === year && d.month === (index + 1));
                monthData[year] = record ? record.totalSales : 0;
            });
            if (uniqueYears.includes(currentYear) && index === currentMonthIndex) {
                 monthData[currentYear] = currentMonthSales;
            }
            return monthData;
        });

        // Other calculations remain the same...
        const totalDemandMinutes = jobs.filter(j => ['Pending', 'In Progress'].includes(j.status)).reduce((sum, j) => sum + (j.estimatedTime || 0), 0);
        const totalAvailableMinutes = (employees.length || 1) * 40 * 60;
        const capacityUtilization = totalAvailableMinutes > 0 ? (totalDemandMinutes / totalAvailableMinutes) * 100 : 0;
        
        const issues = jobs.filter(j => j.status === 'Issue');
        const lowStockItems = inventory.filter(item => Number(item.currentStock) < Number(item.reorderLevel)).slice(0, 5);

        const pieChartData = Object.entries(jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1; return acc;
        }, {})).map(([name, value]) => ({ name, value }));
        const PIE_CHART_COLORS = { 'Complete': '#22c55e', 'In Progress': '#3b82f6', 'Awaiting QC': '#a855f7', 'Issue': '#ef4444', 'Pending': '#eab308' };
        
        const completedJobs = jobs.filter(j => j.status === 'Complete');
        let totalEfficiencyRatio = 0, jobsWithTime = 0, totalRevenue = 0, totalCogs = 0;

        completedJobs.forEach(job => {
            if (job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                const durationSeconds = (job.completedAt.seconds - job.startedAt.seconds) - (job.totalPausedMilliseconds / 1000 || 0);
                if (durationSeconds > 0) {
                    totalEfficiencyRatio += ((job.estimatedTime * 60) / durationSeconds);
                    jobsWithTime++;
                }
            }
            const product = products.find(p => p.id === job.partId);
            if (product && product.sellingPrice > 0) {
                totalRevenue += product.sellingPrice;
                totalCogs += job.totalCost || 0;
            }
        });

        const overallEfficiency = jobsWithTime > 0 ? (totalEfficiencyRatio / jobsWithTime) * 100 : 0;
        const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;
        const reworkRate = jobs.length > 0 ? (issues.length / jobs.length) * 100 : 0;
        const healthScore = (Math.min(100, overallEfficiency) * 0.4) + (Math.max(0, profitMargin) * 0.4) + ((100 - reworkRate) * 0.2);
        
        return {
            monthlyPercentageChange, ytdPercentageChange, multiYearSalesData, uniqueYears,
            capacityUtilization, healthScore,
            liveKPIs: { jobsInProgress: jobs.filter(j => j.status === 'In Progress').length, awaitingQc: jobs.filter(j => j.status === 'Awaiting QC').length, issues: issues.length },
            performanceKPIs: { avgEfficiency: `${Math.round(overallEfficiency)}%`, profitMargin: `${Math.round(profitMargin)}%`, reworkRate: `${reworkRate.toFixed(1)}%` },
            actionableItems: { lowStockItems, jobsWithIssues: issues.slice(0, 5) },
            charts: { pieChartData, PIE_CHART_COLORS }
        };
    }, [jobs, inventory, products, loading, employees, historicalSales]);

    if (loading || !dashboardData) {
        return <p className="text-center text-gray-400">Loading Mission Control...</p>;
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Mission Control</h2>
            
            {/* ROW 1: Strategic Financial View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MultiYearSalesGraph 
                        salesData={dashboardData.multiYearSalesData} 
                        years={dashboardData.uniqueYears}
                        percentageChange={dashboardData.monthlyPercentageChange} 
                    />
                </div>
                <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                    <MonthlySalesTrend percentageChange={dashboardData.monthlyPercentageChange} />
                    <YearToDateComparison percentageChange={dashboardData.ytdPercentageChange} />
                </div>
            </div>
            
            {/* ROW 2: Health & Capacity */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HealthScoreGauge score={dashboardData.healthScore} />
                <CapacityGauge utilization={dashboardData.capacityUtilization} />
            </div>

            {/* ROW 3: Live Operations & Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl border border-gray-700">
                     <h3 className="font-bold text-white mb-4">Live Job Status</h3>
                     <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={dashboardData.charts.pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                                {dashboardData.charts.pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={dashboardData.charts.PIE_CHART_COLORS[entry.name] || '#6b7280'} />))}
                            </Pie>
                            <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #4b5563'}}/>
                            <Legend iconSize={10} wrapperStyle={{fontSize: '12px'}} />
                        </PieChart>
                     </ResponsiveContainer>
                </div>
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                     <h3 className="font-bold text-white">Team Performance Averages</h3>
                     <KpiCard icon={<Zap size={20} />} title="Overall Efficiency" value={dashboardData.performanceKPIs.avgEfficiency} color="bg-teal-500/20 text-teal-400" />
                     <KpiCard icon={<Percent size={20} />} title="Profit Margin (Live Jobs)" value={dashboardData.performanceKPIs.profitMargin} color="bg-green-500/20 text-green-400" />
                     <KpiCard icon={<AlertCircle size={20} />} title="Rework Rate" value={dashboardData.performanceKPIs.reworkRate} color="bg-orange-500/20 text-orange-400" />
                </div>
                 <div className="lg:col-span-1 bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="font-bold text-white mb-4 flex items-center"><ShoppingCart size={20} className="mr-2 text-yellow-400"/> Key Inventory Alerts</h3>
                    <div className="space-y-3">
                        {dashboardData.actionableItems.lowStockItems.length > 0 ? dashboardData.actionableItems.lowStockItems.map(item => (
                            <div key={item.id} className="text-sm p-3 bg-gray-700/50 rounded-lg flex justify-between items-center">
                                <div><p className="font-semibold text-gray-200">{item.name}</p><p className="text-red-400">In Stock: {item.currentStock}</p></div>
                                <NavLink to="/stock" className="text-blue-400 hover:text-blue-300 font-semibold text-xs">GO TO STOCK</NavLink>
                            </div>
                        )) : <p className="text-gray-400 text-sm">All stock levels are healthy.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
