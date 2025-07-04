// src/pages/PerformancePage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { getEmployees, listenToJobCards, getOverheadCategories, getOverheadExpenses, getDepartments } from '../api/firestore';
import Dropdown from '../components/ui/Dropdown';
import { CheckCircle2, Clock, DollarSign, Zap } from 'lucide-react';
import PerformanceLeaderboard from '../components/intelligence/PerformanceLeaderboard';

const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 flex items-start space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const PerformancePage = () => {
    const [employees, setEmployees] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [allOverheadExpenses, setAllOverheadExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [leaderboardDepartmentFilter, setLeaderboardDepartmentFilter] = useState('all');
    const [leaderboardSortKey, setLeaderboardSortKey] = useState('ops');

    useEffect(() => {
        let unsubscribeJobs = () => {};
        const fetchAllDataAndSetupListeners = async () => {
            setLoading(true);
            try {
                const [fetchedEmployees, fetchedCategories, fetchedDepartments] = await Promise.all([
                    getEmployees(),
                    getOverheadCategories(),
                    getDepartments()
                ]);

                setDepartments(fetchedDepartments);
                
                const departmentsMap = new Map(fetchedDepartments.map(d => [d.id, d.name]));
                const employeesWithDeptName = fetchedEmployees.map(emp => ({ ...emp, departmentName: departmentsMap.get(emp.departmentId) || 'Unknown' }));
                setEmployees(employeesWithDeptName);

                const expensePromises = fetchedCategories.map(category => getOverheadExpenses(category.id));
                const results = await Promise.all(expensePromises);
                setAllOverheadExpenses(results.flat());
                
                unsubscribeJobs = listenToJobCards((fetchedJobs) => setJobs(fetchedJobs));
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch all data for performance page:", error);
                setLoading(false);
            }
        };

        fetchAllDataAndSetupListeners();
        return () => { if (unsubscribeJobs) unsubscribeJobs(); };
    }, []);
    
    const performanceData = useMemo(() => {
        const totalMonthlyOverheads = (allOverheadExpenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const employeeCount = employees.length > 0 ? employees.length : 1;
        const overheadCostPerProductiveHour = totalMonthlyOverheads / (employeeCount * 173.2);

        const validCompletedJobs = jobs.filter(job => 
            job.status === 'Complete' && 
            job.startedAt && 
            job.completedAt
        );

        const overallTotalWorkMinutes = validCompletedJobs.reduce((acc, job) => {
            const durationSeconds = (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000;
            return acc + (durationSeconds > 0 ? durationSeconds / 60 : 0);
        }, 0);

        const efficiencyData = validCompletedJobs.map(job => {
            if (!job.estimatedTime || job.estimatedTime <= 0) return null;
            const durationSeconds = (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000;
            if (durationSeconds <= 0) return null;
            return ((job.estimatedTime * 60) / durationSeconds) * 100;
        }).filter(Boolean);

        const overallAvgEfficiency = efficiencyData.length > 0 ? efficiencyData.reduce((sum, eff) => sum + eff, 0) / efficiencyData.length : 0;
        const overallTotalJobValue = validCompletedJobs.reduce((acc, job) => acc + (job.totalCost || 0), 0);

        let employeeMetrics = (employees || []).map(emp => {
            const empJobs = jobs.filter(job => job.employeeId === emp.id && (job.status === 'Complete' || job.status === 'Issue' || job.status === 'Archived - Issue'));
            const empJobsCompleted = empJobs.length;
            const empIssueJobs = empJobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue');
            const empKudosJobs = empJobs.filter(j => j.kudos === true); // ** NEW: Count kudos jobs **

            let empTotalWorkMinutes = 0, empTotalEfficiencyRatioSum = 0, empTotalJobValue = 0, jobsWithTime = 0;
            empJobs.forEach(job => {
                if (job.startedAt && job.completedAt) {
                    const durationSeconds = Math.max(0, (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000);
                    if (durationSeconds > 0) {
                        empTotalWorkMinutes += durationSeconds / 60;
                        if(job.estimatedTime > 0) {
                           empTotalEfficiencyRatioSum += (job.estimatedTime * 60) / durationSeconds;
                           jobsWithTime++;
                        }
                    }
                }
                if (typeof job.totalCost === 'number') empTotalJobValue += job.totalCost;
            });

            const empAvgEfficiency = jobsWithTime > 0 ? (empTotalEfficiencyRatioSum / jobsWithTime) * 100 : 0;
            const burdenedRate = (emp.hourlyRate || 0) + overheadCostPerProductiveHour;
            const totalLaborCost = (empTotalWorkMinutes / 60) * burdenedRate;
            
            return {
                ...emp,
                jobsCompleted: empJobsCompleted,
                avgEfficiency: empAvgEfficiency,
                netValueAdded: empTotalJobValue - totalLaborCost,
                reworkRate: empJobsCompleted > 0 ? (empIssueJobs.length / empJobsCompleted) * 100 : 0,
                reworkCount: empIssueJobs.length, // ** NEW: Pass the count **
                kudosCount: empKudosJobs.length, // ** NEW: Pass the count **
            };
        });

        const maxNetValue = Math.max(1, ...employeeMetrics.map(e => e.netValueAdded));
        const maxEfficiency = Math.max(100, ...employeeMetrics.map(e => e.avgEfficiency));
        
        const employeePerformanceMetrics = employeeMetrics.map(emp => {
            const netValueScore = Math.max(0, (emp.netValueAdded / maxNetValue) * 100);
            const efficiencyScore = Math.max(0, (emp.avgEfficiency / maxEfficiency) * 100);
            const qualityScore = Math.max(0, 100 - emp.reworkRate);
            const ops = (efficiencyScore * 0.4) + (netValueScore * 0.4) + (qualityScore * 0.2);
            return { ...emp, ops };
        });

        return {
            overallKpis: {
                jobsCompleted: validCompletedJobs.length,
                totalWorkHours: (overallTotalWorkMinutes / 60).toFixed(1),
                avgEfficiency: `${Math.round(overallAvgEfficiency)}%`,
                totalJobValue: `R ${overallTotalJobValue.toFixed(2)}`,
            },
            employeePerformanceMetrics
        };
    }, [jobs, employees, allOverheadExpenses]);

    if (loading) return <p className="text-center text-gray-400">Loading Performance Data...</p>;

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white">Business Performance Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard icon={<CheckCircle2 size={24} />} title="Jobs Completed" value={performanceData.overallKpis.jobsCompleted} color="bg-green-500/20 text-green-400" />
                <KpiCard icon={<Clock size={24} />} title="Total Work Time" value={`${performanceData.overallKpis.totalWorkHours} hrs`} color="bg-blue-500/20 text-blue-400" />
                <KpiCard icon={<Zap size={24} />} title="Average Efficiency" value={performanceData.overallKpis.avgEfficiency} color="bg-purple-500/20 text-purple-400" />
                <KpiCard icon={<DollarSign size={24} />} title="Total Job Value" value={performanceData.overallKpis.totalJobValue} color="bg-yellow-500/20 text-yellow-400" />
            </div>
            
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="text-xl font-bold text-white">
                        Performance Leaderboard
                    </h3>
                    <div className="w-full sm:w-auto">
                        <Dropdown
                            name="departmentFilter"
                            value={leaderboardDepartmentFilter}
                            onChange={(e) => setLeaderboardDepartmentFilter(e.target.value)}
                            options={[{ id: 'all', name: 'Overall Company' }, ...departments]}
                        />
                     </div>
                </div>
                <PerformanceLeaderboard
                    employees={leaderboardDepartmentFilter === 'all' ? performanceData.employeePerformanceMetrics : performanceData.employeePerformanceMetrics.filter(e => e.departmentId === leaderboardDepartmentFilter)}
                    activeSortKey={leaderboardSortKey}
                    setActiveSortKey={setLeaderboardSortKey}
                 />
            </div>
        </div>
    );
};

export default PerformancePage;