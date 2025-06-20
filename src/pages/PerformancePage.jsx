import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
// Import all necessary Firestore API functions
import { getEmployees, listenToJobCards, getOverheadCategories, getOverheadExpenses } from '../../../api/firestore'; 
import Dropdown from '../components/ui/Dropdown';
import Button from '../components/ui/Button';
import { CheckCircle2, AlertCircle, BarChart2, Clock, DollarSign, Zap } from 'lucide-react';

// A local KPI Card component for this page (no changes)
const KpiCard = ({ icon, title, value, color }) => (
    <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 flex items-center space-x-4">
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
    // States for overhead data
    const [overheadCategories, setOverheadCategories] = useState([]); 
    const [allOverheadExpenses, setAllOverheadExpenses] = useState([]); 

    const [loading, setLoading] = useState(true);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [activeRange, setActiveRange] = useState('all'); // '7d', '30d', 'all'

    // Static constant for Total Company Productive Hours per Month (Temporary for this step)
    // You'd set this based on your company's full capacity (e.g., 2 employees * 160 hrs/month = 320 hrs)
    const TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH = 320; // Example: Assuming 2 full-time employees, 160 productive hours each. Adjust as needed.


    useEffect(() => {
        let unsubscribeFromJobs; // Declare outside the async IIFE to ensure it's in scope for cleanup

        const fetchInitialAndSetupListeners = async () => {
            setLoading(true);
            try {
                // Fetch static/less frequent data first (employees, overhead categories)
                const [fetchedEmployees, fetchedCategories] = await Promise.all([
                    getEmployees(),
                    getOverheadCategories(),
                ]);
                setEmployees(fetchedEmployees);
                setOverheadCategories(fetchedCategories);

                // Fetch all individual overhead expenses for calculation
                let allExpenses = [];
                for (const category of fetchedCategories) {
                    const expenses = await getOverheadExpenses(category.id);
                    allExpenses = [...allExpenses, ...expenses];
                }
                setAllOverheadExpenses(allExpenses);

                // Set up the real-time listener for jobs
                unsubscribeFromJobs = listenToJobCards((fetchedJobs) => {
                    setJobs(fetchedJobs);
                    // setLoading(false); // Only set loading false after all initial data (including jobs) is here
                });
                setLoading(false); // All initial data loading is complete here, jobs will update via listener
            } catch (error) {
                console.error("Failed to fetch all data for performance page:", error);
                alert("Error loading performance data. Please check console.");
                setLoading(false);
            }
        };

        fetchInitialAndSetupListeners(); // Call the async function

        // Set up the interval for current time update
        const intervalId = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        // Cleanup function for useEffect
        return () => {
            if (unsubscribeFromJobs) {
                unsubscribeFromJobs(); // Unsubscribe from Firestore listener
            }
            clearInterval(intervalId); // Clear the time interval
        };

    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount


    // The main calculation engine for the page (memoized for performance)
    const performanceData = useMemo(() => {
        // 1. Filter jobs by Date Range and Employee (existing logic)
        const now = new Date();
        let startDate = null;
        if (activeRange === '7d') {
            startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (activeRange === '30d') {
            startDate = new Date(now.setDate(now.getDate() - 30));
        }
        const dateFilteredJobs = jobs.filter(job => {
            if (job.status !== 'Complete' || !job.completedAt) return false;
            if (!startDate) return true; 
            return job.completedAt.toDate() >= startDate;
        });
        const employeeFilteredJobs = selectedEmployeeId
            ? dateFilteredJobs.filter(job => job.employeeId === selectedEmployeeId)
            : dateFilteredJobs;

        // 2. Calculate Job-related KPIs (existing logic)
        const jobsCompleted = employeeFilteredJobs.length;
        let totalWorkMinutes = 0;
        let totalEfficiencySum = 0; 
        let totalJobValue = 0;

        employeeFilteredJobs.forEach(job => {
            if (job.startedAt && job.completedAt) {
                let durationSeconds = job.completedAt.seconds - job.startedAt.seconds;
                if (job.totalPausedMilliseconds) {
                    durationSeconds -= Math.floor(job.totalPausedMilliseconds / 1000);
                }
                if (durationSeconds > 0) {
                    totalWorkMinutes += durationSeconds / 60;
                }
            }
            if (job.estimatedTime && job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                const actualMinutes = totalWorkMinutes / jobsCompleted; 
                if(actualMinutes > 0){
                   totalEfficiencySum += (job.estimatedTime / actualMinutes) * 100;
                }
            }
            if(job.totalCost) {
                totalJobValue += job.totalCost;
            }
        });
        const avgEfficiency = jobsCompleted > 0 ? totalEfficiencySum / jobsCompleted : 0; 

        // --- NEW: Calculate Burdened Labor Rate ---
        const totalMonthlyOverheads = allOverheadExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        let overheadCostPerProductiveHour = 0;
        if (TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH > 0) {
            overheadCostPerProductiveHour = totalMonthlyOverheads / TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH;
        }

        const burdenedHourlyRates = employees.map(emp => ({
            ...emp,
            burdenedRate: (emp.hourlyRate || 0) + overheadCostPerProductiveHour
        }));

        return {
            jobList: employeeFilteredJobs,
            kpis: {
                jobsCompleted,
                totalWorkHours: (totalWorkMinutes / 60).toFixed(1),
                avgEfficiency: `${Math.round(avgEfficiency)}%`,
                totalJobValue: `R ${totalJobValue.toFixed(2)}`,
                totalMonthlyOverheads: `R ${totalMonthlyOverheads.toFixed(2)}`,
                overheadCostPerProductiveHour: `R ${overheadCostPerProductiveHour.toFixed(2)}`,
            },
            burdenedHourlyRates: burdenedHourlyRates // Pass this for display
        };
    }, [jobs, selectedEmployeeId, activeRange, employees, allOverheadExpenses, TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH]); // Added dependency

    const handleDateRangeSelect = (range) => {
        setActiveRange(range);
    };

    const getEmployeeName = (id) => employees.find(e => e.id === id)?.name || 'N/A';

    // Helper to format the final duration for the table
    const formatFinalDuration = (job) => {
        if (!job.startedAt || !job.completedAt) return 'N/A';
        let durationSeconds = job.completedAt.seconds - job.startedAt.seconds;
        if (job.totalPausedMilliseconds) {
            durationSeconds -= Math.floor(job.totalPausedMilliseconds / 1000);
        }
        if (durationSeconds < 0) return 'N/A';
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        return `${minutes}m ${seconds}s`;
    };

    return (
        <MainLayout>
            <div className="space-y-8">
                <h2 className="text-3xl font-bold text-white">Employee Performance Dashboard</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="md:col-span-1">
                        <Dropdown
                            label="Select Employee"
                            name="employeeId"
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            options={employees}
                            placeholder="All Employees"
                        />
                    </div>
                    <div className="md:col-span-2 flex items-end gap-2">
                        <Button variant={activeRange === '7d' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('7d')}>Last 7 Days</Button>
                        <Button variant={activeRange === '30d' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('30d')}>Last 30 Days</Button>
                        <Button variant={activeRange === 'all' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('all')}>All Time</Button>
                    </div>
                </div>
                {/* --- KPI Display --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard icon={<CheckCircle2 size={24} />} title="Jobs Completed" value={performanceData.kpis.jobsCompleted} color="bg-green-500/20 text-green-400" />
                    <KpiCard icon={<Clock size={24} />} title="Total Work Time" value={`${performanceData.kpis.totalWorkHours} hrs`} color="bg-blue-500/20 text-blue-400" />
                    <KpiCard icon={<Zap size={24} />} title="Average Efficiency" value={performanceData.kpis.avgEfficiency} color="bg-purple-500/20 text-purple-400" />
                    <KpiCard icon={<DollarSign size={24} />} title="Total Job Value" value={performanceData.kpis.totalJobValue} color="bg-yellow-500/20 text-yellow-400" />
                </div>
                {/* --- NEW: Financial KPI Display --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KpiCard icon={<DollarSign size={24} />} title="Total Monthly Overheads" value={performanceData.kpis.totalMonthlyOverheads} color="bg-red-500/20 text-red-400" />
                    <KpiCard icon={<Clock size={24} />} title="Overhead Cost per Productive Hour" value={performanceData.kpis.overheadCostPerProductiveHour} color="bg-orange-500/20 text-orange-400" />
                    <KpiCard icon={<BarChart2 size={24} />} title="Company Productive Hours/Month (Est.)" value={`${TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH} hrs`} color="bg-teal-500/20 text-teal-400" />
                </div>

                {/* --- NEW: Burdened Hourly Rates Table --- */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-bold text-white p-4 border-b border-gray-700">Burdened Hourly Rates per Employee</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-600 bg-gray-900/50">
                                    <th className="p-3 font-semibold text-gray-400">Employee</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right">Direct Rate</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right">Burdened Rate (Est.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(performanceData.burdenedHourlyRates || []).map(emp => (
                                    <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-3 text-gray-200">{emp.name}</td>
                                        <td className="p-3 text-gray-400 text-right">R{(emp.hourlyRate || 0).toFixed(2)}</td>
                                        <td className="p-3 text-blue-400 font-mono text-right">R{(emp.burdenedRate || 0).toFixed(2)}</td> {/* Ensure burdenedRate exists */}
                                    </tr>
                                ))}
                                {employees.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="3" className="text-center p-4 text-gray-500">No employees found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Job List Table --- */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-bold text-white p-4 border-b border-gray-700">Completed Job Details</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-600 bg-gray-900/50">
                                    <th className="p-3 text-sm font-semibold text-gray-400">Part</th>
                                    {!selectedEmployeeId && <th className="p-3 text-sm font-semibold text-gray-400">Employee</th>}
                                    <th className="p-3 text-sm font-semibold text-gray-400">Completed On</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Actual Time</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 text-right">Job Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ?
                                (
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-400">Loading data...</td></tr>
                                ) : performanceData.jobList.length === 0 ?
                                (
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-400">No completed jobs found for the selected criteria.</td></tr>
                                ) : (
                                    performanceData.jobList.map(job => (
                                        <tr key={job.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 text-gray-200">{job.partName}</td>
                                            {!selectedEmployeeId && <td className="p-3 text-gray-300">{getEmployeeName(job.employeeId)}</td>}
                                            <td className="p-3 text-gray-400 text-sm">{job.completedAt.toDate().toLocaleDateString()}</td>
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