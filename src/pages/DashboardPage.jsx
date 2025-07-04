// src/pages/DashboardPage.jsx (Upgraded with Throughput Graph)

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, getAllInventoryItems, getProducts, getEmployees, collection, getDocs, listenToSystemStatus } from '../api/firestore';
import { db } from '../api/firebase';
import { HeartPulse, CheckCircle2, AlertTriangle, HardHat } from 'lucide-react';
import moment from 'moment'; // Import moment for date handling

// Import all the intelligence widgets
import YearToDateComparison from '/src/components/intelligence/YearToDateComparison.jsx';
import MonthlySalesTrend from '/src/components/intelligence/MonthlySalesTrend.jsx';
import MultiYearSalesGraph from '/src/components/intelligence/MultiYearSalesGraph.jsx';
import TopReworkCausesWidget from '/src/components/intelligence/TopReworkCausesWidget.jsx';
import CapacityGauge from '/src/components/intelligence/CapacityGauge.jsx';
import BottleneckWidget from '/src/components/intelligence/BottleneckWidget.jsx';
import WorkshopThroughputGraph from '/src/components/intelligence/WorkshopThroughputGraph.jsx'; // --- IMPORT NEW COMPONENT ---

const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center space-x-3">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);


const DashboardPage = () => {
    const [jobs, setJobs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [historicalSales, setHistoricalSales] = useState([]);
    const [systemStatus, setSystemStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const fetchData = async () => {
            try {
                const [employeeItems, historicalSalesSnapshot] = await Promise.all([
                    getEmployees(), 
                    getDocs(collection(db, 'historicalSales'))
                ]);
                setEmployees(employeeItems);
                setHistoricalSales(historicalSalesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()})))

                const unsubscribeJobs = listenToJobCards(setJobs);
                const unsubscribeStatus = listenToSystemStatus(setSystemStatus);
                
                setLoading(false); 
                
                return () => {
                    unsubscribeJobs();
                    unsubscribeStatus();
                };

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                setLoading(false);
            }
        }
        
        const unsubscribePromise = fetchData();
        return () => { unsubscribePromise.then(cleanup => cleanup && cleanup()); };
    }, []);

    const dashboardData = useMemo(() => {
        if (loading) return null;

        // --- Sales Trend Calculations ---
        const now = new Date();
        const currentMonthIndex = now.getMonth();
        const currentYear = now.getFullYear();
        const lastYear = currentYear - 1;

        const currentMonthData = historicalSales.find(d => d.year === currentYear && d.month === (currentMonthIndex + 1));
        const currentMonthSales = currentMonthData?.totalSales || 0;
        const lastYearData = historicalSales.find(d => d.year === lastYear && d.month === (currentMonthIndex + 1));
        const lastYearSales = lastYearData?.totalSales || 0;
        
        const monthlyPercentageChange = (() => {
            if (lastYearSales === 0 && currentMonthSales > 0) return 100;
            if (lastYearSales === 0) return 0;
            return ((currentMonthSales - lastYearSales) / lastYearSales) * 100;
        })();

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

        const uniqueYears = [...new Set(historicalSales.map(d => d.year))].sort();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        const multiYearSalesData = monthNames.map((monthName, index) => {
            const monthData = { name: monthName };
            uniqueYears.forEach(year => {
                const record = historicalSales.find(d => d.year === year && d.month === (index + 1));
                monthData[year] = record ? record.totalSales : 0;
            });
            return monthData;
        });
        
        // --- Rework & KPI Calculations ---
        const issueJobs = jobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue');
        const reworkRate = jobs.length > 0 ? (issueJobs.length / jobs.length) * 100 : 0;

        const totalDemandMinutes = jobs.filter(j => ['Pending', 'In Progress', 'Halted - Issue'].includes(j.status)).reduce((sum, j) => sum + (j.estimatedTime || 0), 0);
        const totalAvailableMinutes = (employees.length || 1) * 40 * 60 * 4.33;
        const capacityUtilization = totalAvailableMinutes > 0 ? (totalDemandMinutes / totalAvailableMinutes) * 100 : 0;
        
        const reworkCauses = issueJobs
            .filter(j => j.issueReason)
            .reduce((acc, job) => {
                const reason = job.issueReason.trim();
                acc[reason] = (acc[reason] || 0) + 1;
                return acc;
            }, {});

        const topReworkCauses = Object.entries(reworkCauses)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // --- NEW: Workshop Throughput Calculation ---
        const completedJobs = jobs.filter(j => j.status === 'Complete' && j.completedAt);
        const weeklyBuckets = {};
        for (let i = 0; i < 8; i++) {
            const weekStart = moment().subtract(i, 'weeks').startOf('isoWeek').format('MMM D');
            weeklyBuckets[weekStart] = { name: weekStart, jobs: 0 };
        }
        completedJobs.forEach(job => {
            const completionWeekStart = moment(job.completedAt.toDate()).startOf('isoWeek').format('MMM D');
            if (weeklyBuckets[completionWeekStart]) {
                weeklyBuckets[completionWeekStart].jobs += (job.quantity || 1);
            }
        });
        const jobCompletionData = Object.values(weeklyBuckets).reverse();
        // --- END OF NEW LOGIC ---

        return {
            monthlyPercentageChange, ytdPercentageChange, multiYearSalesData, uniqueYears,
            capacityUtilization, topReworkCauses, reworkRate: reworkRate.toFixed(1),
            activeJobs: jobs.filter(j => ['In Progress', 'Halted - Issue'].includes(j.status)).length,
            jobsInQc: jobs.filter(j => j.status === 'Awaiting QC').length,
            jobCompletionData, // Add new data to the returned object
        };
    }, [jobs, employees, historicalSales, loading]);

    if (loading || !dashboardData) {
        return <p className="text-center text-gray-400">Loading Mission Control...</p>;
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Mission Control</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard icon={<HeartPulse size={24} />} title="Company Health" value={`${(100 - parseFloat(dashboardData.reworkRate)).toFixed(0)} / 100`} color="bg-red-500/20 text-red-400" />
                <KpiCard icon={<HardHat size={24} />} title="Active Jobs" value={dashboardData.activeJobs} color="bg-blue-500/20 text-blue-400" />
                <KpiCard icon={<CheckCircle2 size={24} />} title="Jobs in QC" value={dashboardData.jobsInQc} color="bg-purple-500/20 text-purple-400" />
                <KpiCard icon={<AlertTriangle size={24} />} title="Overall Rework Rate" value={`${dashboardData.reworkRate}%`} color="bg-orange-500/20 text-orange-400" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                     <MultiYearSalesGraph 
                        salesData={dashboardData.multiYearSalesData} 
                        years={dashboardData.uniqueYears}
                    />
                </div>
                <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                    <MonthlySalesTrend percentageChange={dashboardData.monthlyPercentageChange} />
                    <YearToDateComparison percentageChange={dashboardData.ytdPercentageChange} />
                </div>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* --- RENDER NEW COMPONENT HERE --- */}
                <WorkshopThroughputGraph jobCompletionData={dashboardData.jobCompletionData} />
                <BottleneckWidget bottleneck={systemStatus} />
                <TopReworkCausesWidget data={dashboardData.topReworkCauses} />
            </div>
        </div>
    );
};

export default DashboardPage;