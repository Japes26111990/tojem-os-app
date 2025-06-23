import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getEmployees, listenToJobCards, getOverheadCategories, getOverheadExpenses, getDepartments } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import { CheckCircle2, AlertCircle, BarChart2, Clock, DollarSign, Zap, ArrowDown, ArrowUp, Award, Star } from 'lucide-react';
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
    // Component states
    const [employees, setEmployees] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [overheadCategories, setOverheadCategories] = useState([]);
    const [allOverheadExpenses, setAllOverheadExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRange, setActiveRange] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedEmployeeIdFilter, setSelectedEmployeeIdFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'ops', direction: 'descending' });
    const [leaderboardSortKey, setLeaderboardSortKey] = useState('ops');
    // THIS IS THE FIX: Re-adding the missing state definition
    const [leaderboardDepartmentFilter, setLeaderboardDepartmentFilter] = useState('all');

    // Effect hook for data fetching
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
                setOverheadCategories(fetchedCategories);

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

    const requestSort = (key) => {
        let direction = 'descending';
        if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
        }
        return null;
    };
    
    const performanceData = useMemo(() => {
        if (loading) {
            return {
                overallKpis: { jobsCompleted: 0, totalWorkHours: "0.0", avgEfficiency: "0%", totalJobValue: "R 0.00" },
                employeePerformanceMetrics: [],
                currentLabel: 'Loading...'
            };
        }
        
        const now = new Date();
        let reportStartDate = null;
        let reportEndDate = new Date();
        const dateRangeLabels = { '1d': 'Last 24 Hours', '7d': 'Last 7 Days', '30d': 'Last 30 Days', 'all': 'All Time', 'custom': 'Custom Range' };
        const currentLabel = dateRangeLabels[activeRange];

        if (activeRange === '1d') { reportStartDate = new Date(now); reportStartDate.setDate(now.getDate() - 1); } 
        else if (activeRange === '7d') { reportStartDate = new Date(now); reportStartDate.setDate(now.getDate() - 7); } 
        else if (activeRange === '30d') { reportStartDate = new Date(now); reportStartDate.setDate(now.getDate() - 30); } 
        else if (activeRange === 'custom') {
            reportStartDate = customStartDate ? new Date(customStartDate) : null;
            reportEndDate = customEndDate ? new Date(customEndDate) : null;
            if (reportStartDate) reportStartDate.setHours(0, 0, 0, 0);
            if (reportEndDate) reportEndDate.setHours(23, 59, 59, 999);
        }
        if (reportStartDate && activeRange !== 'custom') reportStartDate.setHours(0,0,0,0);

        const dateFilteredJobs = (jobs || []).filter(job => {
            if (!job.completedAt) return false;
            const jobCompletedDate = job.completedAt?.toDate();
            if (!jobCompletedDate) return false;
            if (reportStartDate && jobCompletedDate < reportStartDate) return false;
            if (reportEndDate && jobCompletedDate > reportEndDate) return false;
            return true;
        });
        
        const totalMonthlyOverheads = (allOverheadExpenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const totalCompanyProductiveHours = (employees.length || 0) * 45 * 4.33;
        const overheadCostPerProductiveHour = totalCompanyProductiveHours > 0 ? totalMonthlyOverheads / totalCompanyProductiveHours : 0;

        let employeeMetrics = (employees || []).map(emp => {
            const empJobs = dateFilteredJobs.filter(job => job.employeeId === emp.id);
            const empJobsCompleted = empJobs.length;
            const empIssueJobs = empJobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue').length;
            
            let empTotalWorkMinutes = 0, empTotalEfficiencyRatioSum = 0, empTotalJobValue = 0;
            empJobs.forEach(job => {
                if (job.startedAt && job.completedAt) {
                    const durationSeconds = Math.max(0, (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000);
                    if (durationSeconds > 0) empTotalWorkMinutes += durationSeconds / 60;
                    if (job.estimatedTime > 0 && durationSeconds > 0) empTotalEfficiencyRatioSum += (job.estimatedTime * 60) / durationSeconds;
                }
                if (typeof job.totalCost === 'number') empTotalJobValue += job.totalCost;
            });

            const empAvgEfficiency = empJobsCompleted > 0 ? (empTotalEfficiencyRatioSum / empJobsCompleted) * 100 : 0;
            const burdenedRate = (emp.hourlyRate || 0) + overheadCostPerProductiveHour;
            const totalLaborCost = (empTotalWorkMinutes / 60) * burdenedRate;
            
            return {
                ...emp,
                jobsCompleted: empJobsCompleted,
                avgEfficiency: empAvgEfficiency,
                netValueAdded: empTotalJobValue - totalLaborCost,
                reworkRate: empJobsCompleted > 0 ? (empIssueJobs / empJobsCompleted) * 100 : 0,
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

        const jobsForOverallKpis = selectedEmployeeIdFilter === 'all'
            ? dateFilteredJobs
            : dateFilteredJobs.filter(job => job.employeeId === selectedEmployeeIdFilter);
        
        const overallJobsCompleted = jobsForOverallKpis.length;
        const overallTotalWorkMinutes = jobsForOverallKpis.reduce((acc, job) => acc + (Math.max(0, ((job.completedAt?.toDate().getTime() || 0) - (job.startedAt?.toDate().getTime() || 0) - (job.totalPausedMilliseconds || 0))) / 60000), 0);
        const overallAvgEfficiency = jobsForOverallKpis.length > 0 ? jobsForOverallKpis.reduce((acc, job) => {
            const actual = Math.max(0, ((job.completedAt?.toDate().getTime() || 0) - (job.startedAt?.toDate().getTime() || 0) - (job.totalPausedMilliseconds || 0)) / 1000);
            if(job.estimatedTime > 0 && actual > 0) return acc + (((job.estimatedTime * 60) / actual) * 100);
            return acc;
        }, 0) / jobsForOverallKpis.length : 0;
        const overallTotalJobValue = jobsForOverallKpis.reduce((acc, job) => acc + (job.totalCost || 0), 0);

        return {
            overallKpis: {
                jobsCompleted: overallJobsCompleted,
                totalWorkHours: overallTotalWorkMinutes.toFixed(1),
                avgEfficiency: `${Math.round(overallAvgEfficiency)}%`,
                totalJobValue: `R ${overallTotalJobValue.toFixed(2)}`,
            },
            employeePerformanceMetrics,
            currentLabel
        };
    }, [jobs, activeRange, employees, allOverheadExpenses, customStartDate, customEndDate, selectedEmployeeIdFilter, loading]);
    
    const sortedMetrics = useMemo(() => {
        const metrics = leaderboardDepartmentFilter === 'all'
            ? performanceData.employeePerformanceMetrics
            : performanceData.employeePerformanceMetrics.filter(e => e.departmentId === leaderboardDepartmentFilter);
        
        return [...metrics].sort((a, b) => {
            if (sortConfig.key) {
                return sortConfig.direction === 'ascending' ? a[sortConfig.key] - b[sortConfig.key] : b[sortConfig.key] - a[sortConfig.key];
            }
            return 0;
        });
    }, [performanceData.employeePerformanceMetrics, leaderboardDepartmentFilter, sortConfig]);

    return (
        <MainLayout>
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Business Performance Dashboard</h2>
                
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button variant={activeRange === '1d' ? 'primary' : 'secondary'} onClick={() => setActiveRange('1d')}>Last 24 Hours</Button>
                        <Button variant={activeRange === '7d' ? 'primary' : 'secondary'} onClick={() => setActiveRange('7d')}>Last 7 Days</Button>
                        <Button variant={activeRange === '30d' ? 'primary' : 'secondary'} onClick={() => setActiveRange('30d')}>Last 30 Days</Button>
                        <Button variant={activeRange === 'all' ? 'primary' : 'secondary'} onClick={() => setActiveRange('all')}>All Time</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard icon={<CheckCircle2 size={24} />} title="Jobs Completed" value={performanceData.overallKpis.jobsCompleted} color="bg-green-500/20 text-green-400" />
                    <KpiCard icon={<Clock size={24} />} title="Total Work Time" value={`${performanceData.overallKpis.totalWorkHours} hrs`} color="bg-blue-500/20 text-blue-400" />
                    <KpiCard icon={<Zap size={24} />} title="Average Efficiency" value={performanceData.overallKpis.avgEfficiency} color="bg-purple-500/20 text-purple-400" />
                    <KpiCard icon={<DollarSign size={24} />} title="Total Job Value" value={performanceData.overallKpis.totalJobValue} color="bg-yellow-500/20 text-yellow-400" />
                </div>
                
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                        <h3 className="text-xl font-bold text-white">
                            Performance Leaderboard <span className="text-base font-normal text-gray-400">({performanceData.currentLabel})</span>
                        </h3>
                        <div className="w-full sm:w-1/4">
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

                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-bold text-white p-4 border-b border-gray-700">Detailed Employee Data</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-600 bg-gray-900/50">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-400 cursor-pointer flex items-center" onClick={() => requestSort('ops')}>
                                        <Star size={14} className="mr-2 text-yellow-400"/> OPS {getSortIndicator('ops')}
                                    </th>
                                    <th className="p-3 font-semibold text-gray-400 cursor-pointer" onClick={() => requestSort('name')}>Employee {getSortIndicator('name')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('avgEfficiency')}>Efficiency {getSortIndicator('avgEfficiency')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('netValueAdded')}>Net Value {getSortIndicator('netValueAdded')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('reworkRate')}>Rework % {getSortIndicator('reworkRate')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('jobsCompleted')}>Jobs {getSortIndicator('jobsCompleted')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center p-8 text-gray-400">Loading...</td></tr>
                                ) : sortedMetrics.map(emp => (
                                    <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-3 text-white font-bold text-center">
                                            <div className="flex items-center justify-center bg-purple-500/20 text-purple-300 rounded-full w-12 h-12 mx-auto">
                                                {emp.ops.toFixed(1)}
                                            </div>
                                        </td>
                                        <td className="p-3 text-gray-200">
                                            <Link to={`/employee/${emp.id}`} className="text-blue-400 hover:underline">{emp.name}</Link>
                                        </td>
                                        <td className="p-3 text-right font-semibold">{`${Math.round(emp.avgEfficiency)}%`}</td>
                                        <td className="p-3 text-right font-mono">R {emp.netValueAdded.toFixed(2)}</td>
                                        <td className="p-3 text-right">{emp.reworkRate.toFixed(1)}%</td>
                                        <td className="p-3 text-right">{emp.jobsCompleted}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default PerformancePage;