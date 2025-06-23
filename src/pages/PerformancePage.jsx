import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom'; // 1. IMPORT LINK FOR NAVIGATION
import MainLayout from '../components/layout/MainLayout';
import { getEmployees, listenToJobCards, getOverheadCategories, getOverheadExpenses } from '../api/firestore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import { CheckCircle2, AlertCircle, BarChart2, Clock, DollarSign, Zap, ArrowDown, ArrowUp, TrendingUp, TrendingDown, UserCheck, Award } from 'lucide-react';

// A local KPI Card component for this page
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
    const [overheadCategories, setOverheadCategories] = useState([]);
    const [allOverheadExpenses, setAllOverheadExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRange, setActiveRange] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedEmployeeIdFilter, setSelectedEmployeeIdFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Effect hook for data fetching and real-time listeners
    useEffect(() => {
        let unsubscribeJobs = () => {};
        let intervalId = null;

        const fetchAllDataAndSetupListeners = async () => {
            setLoading(true);
            try {
                const [fetchedEmployees, fetchedCategories] = await Promise.all([
                    getEmployees(),
                    getOverheadCategories(),
                ]);
                setEmployees(fetchedEmployees);
                setOverheadCategories(fetchedCategories);

                let collectedExpenses = [];
                const expensePromises = fetchedCategories.map(category => getOverheadExpenses(category.id));
                const results = await Promise.all(expensePromises);
                results.forEach(expensesArray => {
                    collectedExpenses = [...collectedExpenses, ...expensesArray];
                });
                setAllOverheadExpenses(collectedExpenses);

                unsubscribeJobs = listenToJobCards((fetchedJobs) => {
                    setJobs(fetchedJobs);
                });

                intervalId = setInterval(() => {
                    setCurrentTime(Date.now());
                }, 1000);

                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch all data for performance page:", error);
                alert("Error loading performance data. Please check console.");
                setLoading(false);
            }
        };

        fetchAllDataAndSetupListeners();

        return () => {
            if (unsubscribeJobs) unsubscribeJobs();
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ?
                <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
        }
        return null;
    };

    const performanceData = useMemo(() => {
        if (loading) {
            return {
                overallKpis: {
                    jobsCompleted: 0, totalWorkHours: "0.0", avgEfficiency: "0%", totalJobValue: "R 0.00",
                    totalMonthlyOverheads: "R 0.00", overheadCostPerProductiveHour: "R 0.00", totalCompanyProductiveHours: "0"
                },
                employeePerformanceMetrics: [],
                jobList: []
            };
        }
        
        const totalCompanyProductiveHours = (employees.length || 0) * 45 * 4.33;

        const now = new Date(currentTime);
        let reportStartDate = null;
        let reportEndDate = new Date(currentTime);

        if (activeRange === '1d') {
            reportStartDate = new Date(now);
            reportStartDate.setHours(0, 0, 0, 0);
        } else if (activeRange === '7d') {
            reportStartDate = new Date(now);
            reportStartDate.setDate(now.getDate() - 7);
            reportStartDate.setHours(0, 0, 0, 0);
        } else if (activeRange === '30d') {
            reportStartDate = new Date(now);
            reportStartDate.setDate(now.getDate() - 30);
            reportStartDate.setHours(0, 0, 0, 0);
        } else if (activeRange === 'custom') {
            reportStartDate = customStartDate ? new Date(customStartDate) : null;
            reportEndDate = customEndDate ? new Date(customEndDate) : null;
            if (reportStartDate) reportStartDate.setHours(0, 0, 0, 0);
            if (reportEndDate) reportEndDate.setHours(23, 59, 59, 999);
            if (reportStartDate && reportEndDate && reportStartDate > reportEndDate) {
                [reportStartDate, reportEndDate] = [reportEndDate, reportStartDate];
            }
        }

        const dateFilteredJobs = (jobs || []).filter(job => {
            if (job.status !== 'Complete' || !job.completedAt) return false;
            const jobCompletedDate = job.completedAt?.toDate();
            if (!jobCompletedDate) return false;
            let passesFilter = true;
            if (reportStartDate && jobCompletedDate < reportStartDate) passesFilter = false;
            if (reportEndDate && jobCompletedDate > reportEndDate) passesFilter = false;
            return passesFilter;
        });

        const totalMonthlyOverheads = (allOverheadExpenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
        let overheadCostPerProductiveHour = 0;
        if (totalCompanyProductiveHours > 0) {
            overheadCostPerProductiveHour = totalMonthlyOverheads / totalCompanyProductiveHours;
        }

        const employeePerformanceMetrics = (employees || []).map(emp => {
            const currentEmployeeJobs = dateFilteredJobs.filter(job => job.employeeId === emp.id);
            let empJobsCompleted = currentEmployeeJobs.length;
            let empTotalWorkMinutes = 0;
            let empTotalEfficiencyRatioSum = 0;
            let empTotalJobValue = 0;

            currentEmployeeJobs.forEach(job => {
                if (job.startedAt && job.completedAt) {
                    const durationSeconds = Math.max(0, (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000);
                    if (durationSeconds > 0) empTotalWorkMinutes += durationSeconds / 60;
                }
                if (job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                    const actualSeconds = Math.max(0, (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000);
                    if (actualSeconds > 0) empTotalEfficiencyRatioSum += (job.estimatedTime * 60) / actualSeconds;
                }
                if (typeof job.totalCost === 'number') empTotalJobValue += job.totalCost;
            });

            const empAvgEfficiency = empJobsCompleted > 0 ? (empTotalEfficiencyRatioSum / empJobsCompleted) * 100 : 0;
            const burdenedRate = (emp.hourlyRate || 0) + overheadCostPerProductiveHour;
            let performanceIndicator = empJobsCompleted === 0 ? 'No data' : empAvgEfficiency >= 100 ? 'Excellent' : empAvgEfficiency >= 85 ? 'Good' : 'Needs Improvement';
            let indicatorColor = empJobsCompleted === 0 ? 'text-gray-500' : empAvgEfficiency >= 100 ? 'text-green-500' : empAvgEfficiency >= 85 ? 'text-yellow-500' : 'text-red-500';

            return {
                id: emp.id, name: emp.name, hourlyRate: emp.hourlyRate || 0, burdenedRate,
                jobsCompleted: empJobsCompleted, totalWorkHours: empTotalWorkMinutes / 60,
                avgEfficiency: empAvgEfficiency, totalJobValue: empTotalJobValue,
                performanceIndicator, indicatorColor
            };
        });

        let sortedEmployeePerformanceMetrics = [...employeePerformanceMetrics];
        if (sortConfig.key) {
            sortedEmployeePerformanceMetrics.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (typeof aValue === 'string') {
                    return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
            });
        }

        const jobsForOverallKpisAndFilteredTable = selectedEmployeeIdFilter === 'all'
            ? dateFilteredJobs
            : dateFilteredJobs.filter(job => job.employeeId === selectedEmployeeIdFilter);

        let overallTotalWorkMinutes = 0;
        let overallTotalEfficiencyRatioSum = 0;
        let overallTotalJobValue = 0;

        jobsForOverallKpisAndFilteredTable.forEach(job => {
            if (job.startedAt && job.completedAt) {
                const durationSeconds = Math.max(0, (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000);
                if (durationSeconds > 0) overallTotalWorkMinutes += durationSeconds / 60;
            }
            if (job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                const actualSeconds = Math.max(0, (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000);
                if (actualSeconds > 0) overallTotalEfficiencyRatioSum += (job.estimatedTime * 60) / actualSeconds;
            }
            if (typeof job.totalCost === 'number') overallTotalJobValue += job.totalCost;
        });

        const overallJobsCompleted = jobsForOverallKpisAndFilteredTable.length;
        const overallAvgEfficiency = overallJobsCompleted > 0 ? (overallTotalEfficiencyRatioSum / overallJobsCompleted) * 100 : 0;

        return {
            overallKpis: {
                jobsCompleted: overallJobsCompleted,
                totalWorkHours: overallTotalWorkMinutes.toFixed(1),
                avgEfficiency: `${Math.round(overallAvgEfficiency)}%`,
                totalJobValue: `R ${overallTotalJobValue.toFixed(2)}`,
                totalMonthlyOverheads: `R ${totalMonthlyOverheads.toFixed(2)}`,
                overheadCostPerProductiveHour: `R ${overheadCostPerProductiveHour.toFixed(2)}`,
                totalCompanyProductiveHours: totalCompanyProductiveHours.toFixed(0)
            },
            employeePerformanceMetrics: sortedEmployeePerformanceMetrics,
            jobList: jobsForOverallKpisAndFilteredTable
        };
    }, [jobs, activeRange, employees, allOverheadExpenses, currentTime, sortConfig, customStartDate, customEndDate, selectedEmployeeIdFilter, loading]);

    const handleDateRangeSelect = (range) => {
        setActiveRange(range);
        setCustomStartDate('');
        setCustomEndDate('');
    };

    const handleEmployeeFilterChange = (e) => {
        setSelectedEmployeeIdFilter(e.target.value);
    };

    const handleCustomRangeApply = () => {
        if (!customStartDate || !customEndDate) {
            alert("Please select both a start and end date for the custom range.");
            return;
        }
        if (new Date(customStartDate) > new Date(customEndDate)) {
            alert("Start date cannot be after end date.");
            return;
        }
        setActiveRange('custom');
    };

    const formatFinalDuration = (job) => {
        if (!job.startedAt || !job.completedAt) return 'N/A';
        const durationSeconds = Math.max(0, (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000);
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        return `${minutes}m ${seconds}s`;
    };

    return (
        <MainLayout>
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Business Performance Dashboard</h2>
                
                {/* Date Range Controls */}
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button variant={activeRange === '1d' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('1d')}>24 Hours</Button>
                        <Button variant={activeRange === '7d' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('7d')}>7 Days</Button>
                        <Button variant={activeRange === '30d' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('30d')}>30 Days</Button>
                        <Button variant={activeRange === 'all' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('all')}>All Time</Button>
                    </div>
                    <div className="flex flex-wrap items-end justify-center gap-2 mt-4">
                        <Input label="Start Date" type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                        <Input label="End Date" type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                        <Button onClick={handleCustomRangeApply} variant={activeRange === 'custom' ? 'primary' : 'secondary'}>Apply</Button>
                    </div>
                </div>

                {/* KPI Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard icon={<CheckCircle2 size={24} />} title="Jobs Completed (Overall)" value={performanceData.overallKpis.jobsCompleted} color="bg-green-500/20 text-green-400" />
                    <KpiCard icon={<Clock size={24} />} title="Total Work Time (Overall)" value={`${performanceData.overallKpis.totalWorkHours} hrs`} color="bg-blue-500/20 text-blue-400" />
                    <KpiCard icon={<Zap size={24} />} title="Average Efficiency (Overall)" value={performanceData.overallKpis.avgEfficiency} color="bg-purple-500/20 text-purple-400" />
                    <KpiCard icon={<DollarSign size={24} />} title="Total Job Value (Overall)" value={performanceData.overallKpis.totalJobValue} color="bg-yellow-500/20 text-yellow-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KpiCard icon={<DollarSign size={24} />} title="Total Monthly Overheads" value={performanceData.overallKpis.totalMonthlyOverheads} color="bg-red-500/20 text-red-400" />
                    <KpiCard icon={<Clock size={24} />} title="Overhead Cost per Productive Hour" value={performanceData.overallKpis.overheadCostPerProductiveHour} color="bg-orange-500/20 text-orange-400" />
                    <KpiCard icon={<BarChart2 size={24} />} title="Company Productive Hours/Month (Est.)" value={`${performanceData.overallKpis.totalCompanyProductiveHours} hrs`} color="bg-teal-500/20 text-teal-400" />
                </div>

                {/* Employee Filter */}
                <div className="flex justify-end">
                    <Dropdown
                        label="View Completed Jobs For"
                        name="employeeFilter"
                        value={selectedEmployeeIdFilter}
                        onChange={handleEmployeeFilterChange}
                        options={[{ id: 'all', name: 'All Employees' }, ...employees]}
                        placeholder="Select Employee..."
                    />
                </div>

                {/* Individual Employee Performance Table */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-bold text-white p-4 border-b border-gray-700">Individual Employee Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-600 bg-gray-900/50">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-400 cursor-pointer" onClick={() => requestSort('name')}>Employee {getSortIndicator('name')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('hourlyRate')}>Direct Rate {getSortIndicator('hourlyRate')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('burdenedRate')}>Burdened Rate {getSortIndicator('burdenedRate')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('jobsCompleted')}>Jobs {getSortIndicator('jobsCompleted')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('totalWorkHours')}>Hours {getSortIndicator('totalWorkHours')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('avgEfficiency')}>Efficiency {getSortIndicator('avgEfficiency')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('totalJobValue')}>Job Value {getSortIndicator('totalJobValue')}</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right">Performance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" className="text-center p-8 text-gray-400">Loading...</td></tr>
                                ) : performanceData.employeePerformanceMetrics.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center p-8 text-gray-500">No data for this period.</td></tr>
                                ) : (
                                    performanceData.employeePerformanceMetrics.map(emp => (
                                        <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 text-gray-200">
                                                {/* 2. WRAP EMPLOYEE NAME IN A LINK */}
                                                <Link to={`/employee/${emp.id}`} className="text-blue-400 hover:underline">
                                                    {emp.name}
                                                </Link>
                                            </td>
                                            <td className="p-3 text-gray-400 text-right">R{(emp.hourlyRate).toFixed(2)}</td>
                                            <td className="p-3 text-blue-400 font-mono text-right">R{(emp.burdenedRate).toFixed(2)}</td>
                                            <td className="p-3 text-gray-300 text-right">{emp.jobsCompleted}</td>
                                            <td className="p-3 text-gray-300 text-right">{emp.totalWorkHours.toFixed(1)}</td>
                                            <td className={`p-3 text-right font-semibold ${emp.indicatorColor}`}>{`${Math.round(emp.avgEfficiency)}%`}</td>
                                            <td className="p-3 text-green-400 font-mono text-right">R{(emp.totalJobValue).toFixed(2)}</td>
                                            <td className={`p-3 font-semibold text-right ${emp.indicatorColor}`}>
                                                {emp.performanceIndicator === 'Excellent' && <Award size={16} className="inline-block mr-1" />}
                                                {emp.performanceIndicator === 'Good' && <UserCheck size={16} className="inline-block mr-1" />}
                                                {emp.performanceIndicator === 'Needs Improvement' && <TrendingDown size={16} className="inline-block mr-1" />}
                                                {emp.performanceIndicator}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Employee Skills Placeholder */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                        <Award size={24} className="mr-2 text-yellow-400" /> Employee Skills & Growth
                    </h3>
                    <p className="text-gray-400 text-center">
                        (Coming Soon: This section will allow you to define and track specific skills for each employee, ranking their proficiency over time to monitor growth and development.)
                    </p>
                </div>

                {/* Completed Jobs Table */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-bold text-white p-4 border-b border-gray-700">Completed Job Details</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-600 bg-gray-900/50">
                                <tr>
                                    <th className="p-3 font-semibold text-gray-400">Part</th>
                                    <th className="p-3 font-semibold text-gray-400">Employee</th>
                                    <th className="p-3 font-semibold text-gray-400">Completed On</th>
                                    <th className="p-3 font-semibold text-gray-400">Actual Time</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right">Job Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-400">Loading jobs...</td></tr>
                                ) : performanceData.jobList.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-500">No completed jobs found.</td></tr>
                                ) : (
                                    performanceData.jobList.map(job => (
                                        <tr key={job.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 text-gray-200">{job.partName}</td>
                                            <td className="p-3 text-gray-300">{employees.find(emp => emp.id === job.employeeId)?.name || 'N/A'}</td>
                                            <td className="p-3 text-gray-400">{job.completedAt.toDate().toLocaleDateString()}</td>
                                            <td className="p-3 text-gray-300 font-semibold">{formatFinalDuration(job)}</td>
                                            <td className="p-3 text-blue-400 font-mono text-right">R {job.totalCost?.toFixed(2) || '0.00'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default PerformancePage;