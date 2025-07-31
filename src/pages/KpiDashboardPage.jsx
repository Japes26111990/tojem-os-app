// src/pages/KpiDashboardPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards } from '../api/firestore';
import { CheckCircle2, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import WorkshopThroughputGraph from '../components/intelligence/WorkshopThroughputGraph';
import moment from 'moment';

const KpiCard = ({ icon, title, value, subtext, color }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-3xl font-bold text-white">{value}</p>
                {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
            </div>
        </div>
    </div>
);

const KpiDashboardPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // --- FIX: Destructure the 'jobs' array from the object returned by the listener ---
        const unsubscribe = listenToJobCards(({ jobs: allJobs }) => {
            if (Array.isArray(allJobs)) {
                setJobs(allJobs);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const kpiData = useMemo(() => {
        // Add a guard clause to ensure 'jobs' is an array before processing
        if (!Array.isArray(jobs) || jobs.length === 0) {
            return {
                jobsCompletedToday: 0,
                reworkRate: '0%',
                onTimeRate: '0%',
                valueCompletedToday: 'R 0.00',
                jobCompletionData: [],
            };
        }

        const todayStart = moment().startOf('day');
        const completedJobs = jobs.filter(j => j.status === 'Complete' && j.completedAt);
        const jobsCompletedToday = completedJobs.filter(j => moment(j.completedAt.toDate()).isAfter(todayStart));

        const totalJobsWithOutcome = jobs.filter(j => j.status === 'Complete' || j.status === 'Issue').length;
        const issueJobs = jobs.filter(j => j.status === 'Issue').length;
        const reworkRate = totalJobsWithOutcome > 0 ? (issueJobs / totalJobsWithOutcome) * 100 : 0;

        const onTimeJobs = completedJobs.filter(j => {
            if (!j.estimatedTime || !j.startedAt || !j.completedAt) return false;
            const durationMillis = j.completedAt.toDate().getTime() - j.startedAt.toDate().getTime() - (j.totalPausedMilliseconds || 0);
            return (durationMillis / 60000) <= j.estimatedTime;
        }).length;
        const onTimeRate = completedJobs.length > 0 ? (onTimeJobs / completedJobs.length) * 100 : 0;

        const valueCompletedToday = jobsCompletedToday.reduce((sum, j) => sum + (j.totalCost || 0), 0);
        
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
            jobsCompletedToday: jobsCompletedToday.length,
            reworkRate: `${reworkRate.toFixed(1)}%`,
            onTimeRate: `${onTimeRate.toFixed(1)}%`,
            valueCompletedToday: `R ${valueCompletedToday.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
            jobCompletionData,
        };
    }, [jobs]);

    if (loading) {
        return <p className="text-center text-gray-400">Loading KPI Dashboard...</p>;
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Real-Time KPI Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard 
                    icon={<CheckCircle2 size={24} />} 
                    title="Jobs Completed Today" 
                    value={kpiData.jobsCompletedToday}
                    color="bg-green-500/20 text-green-400" 
                />
                <KpiCard 
                    icon={<AlertTriangle size={24} />} 
                    title="Overall Rework Rate" 
                    value={kpiData.reworkRate}
                    color="bg-red-500/20 text-red-400" 
                />
                <KpiCard 
                    icon={<Clock size={24} />} 
                    title="On-Time Completion" 
                    value={kpiData.onTimeRate}
                    color="bg-blue-500/20 text-blue-400" 
                />
                <KpiCard 
                    icon={<DollarSign size={24} />} 
                    title="Value Completed Today" 
                    value={kpiData.valueCompletedToday}
                    color="bg-yellow-500/20 text-yellow-400" 
                />
            </div>

            <WorkshopThroughputGraph jobCompletionData={kpiData.jobCompletionData} />
        </div>
    );
};

export default KpiDashboardPage;