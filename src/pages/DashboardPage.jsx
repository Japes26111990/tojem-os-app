// src/pages/DashboardPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
    listenToJobCards, 
    getEmployees, 
    collection, 
    getDocs, 
    listenToSystemStatus,
    getRoutineTasks,
    getTodaysCompletedRoutineTasks
} from '../api/firestore';
import { db } from '../api/firebase';
import { HeartPulse, CheckCircle2, AlertTriangle, HardHat } from 'lucide-react';
import moment from 'moment';

// Import all the intelligence widgets
import YoYSalesComparison from '../components/intelligence/YoYSalesComparison.jsx';
import YoYProfitWidget from '../components/intelligence/YoYProfitWidget.jsx';
import MultiYearSalesGraph from '../components/intelligence/MultiYearSalesGraph.jsx';
import TopReworkCausesWidget from '../components/intelligence/TopReworkCausesWidget.jsx';
import BottleneckWidget from '../components/intelligence/BottleneckWidget.jsx';
import WorkshopThroughputGraph from '../components/intelligence/WorkshopThroughputGraph.jsx';
import ManagerFocusWidget from '../components/features/dashboard/ManagerFocusWidget';
import RoutineTasksWidget from '../components/features/dashboard/RoutineTasksWidget';

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
    const [todaysTasks, setTodaysTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Function to refetch task data when one is completed
    const refreshTasks = async () => {
        try {
            const [allTasks, completedIds] = await Promise.all([
                getRoutineTasks(),
                getTodaysCompletedRoutineTasks()
            ]);

            const dayOfWeek = moment().format('dddd').toLowerCase();
            const filteredTasks = allTasks.filter(task => {
                const isScheduledToday = task.schedule === 'daily' || task.schedule === `weekly_${dayOfWeek}`;
                const isNotCompleted = !completedIds.has(task.id);
                return isScheduledToday && isNotCompleted;
            });
            setTodaysTasks(filteredTasks);
        } catch (error) {
            console.error("Failed to refresh tasks:", error);
        }
    };

    useEffect(() => {
        setLoading(true);
        let unsubscribeJobs = () => {};
        let unsubscribeStatus = () => {};

        const fetchData = async () => {
            try {
                const [employeeItems, historicalSalesSnapshot] = await Promise.all([
                    getEmployees(), 
                    getDocs(collection(db, 'historicalSales')),
                ]);
                setEmployees(employeeItems);
                setHistoricalSales(historicalSalesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()})))

                await refreshTasks(); // Initial fetch of tasks

                // --- FIX: Destructure the 'jobs' array from the object passed by the listener ---
                unsubscribeJobs = listenToJobCards(({ jobs }) => {
                    // Ensure that what we receive is an array before setting state
                    if (Array.isArray(jobs)) {
                        setJobs(jobs);
                    }
                });
                unsubscribeStatus = listenToSystemStatus(setSystemStatus);

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false); 
            }
        }
        
        fetchData();
        return () => {
            unsubscribeJobs();
            unsubscribeStatus();
        };
    }, []);

    const dashboardData = useMemo(() => {
        if (loading || !Array.isArray(jobs)) return null; // Add guard clause for non-array

        const now = new Date();
        const currentMonthIndex = now.getMonth();
        const currentYear = now.getFullYear();
        const lastYear = currentYear - 1;

        const currentMonthData = historicalSales.find(d => d.year === currentYear && d.month === (currentMonthIndex + 1));
        const currentMonthSales = currentMonthData?.totalSales || 0;
        const currentMonthProfit = currentMonthData ? (currentMonthData.totalSales - currentMonthData.totalCOGS) : 0;
        
        const lastYearData = historicalSales.find(d => d.year === lastYear && d.month === (currentMonthIndex + 1));
        const lastYearSales = lastYearData?.totalSales || 0;
        const lastYearProfit = lastYearData ? (lastYearData.totalSales - lastYearData.totalCOGS) : 0;
        
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
        
        const issueJobs = jobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue');
        const reworkRate = jobs.length > 0 ? (issueJobs.length / jobs.length) * 100 : 0;

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

        return {
            currentMonthSales, lastYearSales, currentMonthProfit, lastYearProfit,
            multiYearSalesData, uniqueYears, topReworkCauses,
            reworkRate: reworkRate.toFixed(1),
            activeJobs: jobs.filter(j => ['In Progress', 'Halted - Issue'].includes(j.status)).length,
            jobsInQc: jobs.filter(j => j.status === 'Awaiting QC').length,
            jobCompletionData,
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ManagerFocusWidget />
                <RoutineTasksWidget tasks={todaysTasks} onTaskComplete={refreshTasks} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <YoYSalesComparison 
                        currentMonthSales={dashboardData.currentMonthSales}
                        lastYearSales={dashboardData.lastYearSales}
                    />
                    <YoYProfitWidget 
                        currentMonthProfit={dashboardData.currentMonthProfit}
                        lastYearProfit={dashboardData.lastYearProfit}
                    />
                </div>
                <div className="lg:col-span-1">
                     <BottleneckWidget bottleneck={systemStatus} />
                </div>
            </div>

            <MultiYearSalesGraph 
                salesData={dashboardData.multiYearSalesData} 
                years={dashboardData.uniqueYears}
            />
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WorkshopThroughputGraph jobCompletionData={dashboardData.jobCompletionData} />
                <TopReworkCausesWidget data={dashboardData.topReworkCauses} />
            </div>
        </div>
    );
};

export default DashboardPage;