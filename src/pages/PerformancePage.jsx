import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
// Corrected import path for firestore.js: '../../../api/firestore' -> '../api/firestore'
import { getEmployees, listenToJobCards, getOverheadCategories, getOverheadExpenses } from '../api/firestore'; 
import Dropdown from '../components/ui/Dropdown';
import Button from '../components/ui/Button';
import { CheckCircle2, AlertCircle, BarChart2, Clock, DollarSign, Zap } from 'lucide-react';

// A local KPI Card component for this page
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
    // Component states
    const [employees, setEmployees] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [overheadCategories, setOverheadCategories] = useState([]); 
    const [allOverheadExpenses, setAllOverheadExpenses] = useState([]); 

    const [loading, setLoading] = useState(true);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [activeRange, setActiveRange] = useState('all'); // '7d', '30d', 'all'

    // Static constant for Total Company Productive Hours per Month (Temporary for this step)
    const TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH = 320; 

    // State for current time, updated every second, used for live tracking calculations
    const [currentTime, setCurrentTime] = useState(Date.now());


    // Effect hook for data fetching and real-time listeners
    useEffect(() => {
        let unsubscribeJobs = () => {}; // Initialize as a no-op function
        let intervalId = null; // Initialize intervalId outside to ensure cleanup works

        const fetchAllDataAndSetupListeners = async () => {
            setLoading(true); // Start loading

            try {
                // 1. Fetch static/less frequently changing data first (employees, overhead categories)
                const [fetchedEmployees, fetchedCategories] = await Promise.all([
                    getEmployees(),
                    getOverheadCategories(),
                ]);
                setEmployees(fetchedEmployees);
                setOverheadCategories(fetchedCategories);

                // 2. Fetch all individual overhead expenses for total calculation
                let collectedExpenses = [];
                // Use Promise.all for fetching expenses from all categories concurrently
                const expensePromises = fetchedCategories.map(category => getOverheadExpenses(category.id));
                const results = await Promise.all(expensePromises);
                results.forEach(expensesArray => {
                    collectedExpenses = [...collectedExpenses, ...expensesArray];
                });
                setAllOverheadExpenses(collectedExpenses);

                // 3. Set up the real-time listener for jobs
                // This will update 'jobs' state whenever a change occurs in Firestore
                unsubscribeJobs = listenToJobCards((fetchedJobs) => {
                    setJobs(fetchedJobs);
                    // Setting loading=false here can be tricky if jobs come in slightly after others.
                    // Let's set it after initial data and ensure calculations can handle empty 'jobs' briefly.
                });

                // Set initial current time and interval for live calculations
                setCurrentTime(Date.now()); // Set initial value
                intervalId = setInterval(() => { // Start interval
                    setCurrentTime(Date.now());
                }, 1000);

                setLoading(false); // All initial data loading is complete or subscribed to

            } catch (error) {
                console.error("Failed to fetch all data for performance page:", error);
                alert("Error loading performance data. Please check console.");
                setLoading(false); // Ensure loading is off even on error
            }
        };

        fetchAllDataAndSetupListeners(); // Call the main async function
        
        // Cleanup function for useEffect
        return () => {
            if (unsubscribeJobs) {
                unsubscribeJobs(); // Unsubscribe from Firestore listener
            }
            if (intervalId) { 
                clearInterval(intervalId); // Clear the time interval
            }
        };

    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount


    // The main calculation engine for the page (memoized for performance)
    const performanceData = useMemo(() => {
            // Ensure all critical data is available before performing complex calculations
            if (loading && jobs.length === 0 && employees.length === 0 && allOverheadExpenses.length === 0) {
                return {
                    jobList: [],
                    kpis: {
                        jobsCompleted: 0,
                        totalWorkHours: "0.0",
                        avgEfficiency: "0%",
                        totalJobValue: "R 0.00",
                        totalMonthlyOverheads: "R 0.00",
                        overheadCostPerProductiveHour: "R 0.00",
                    },
                    burdenedHourlyRates: []
                };
            }

        // 1. Filter jobs by Date Range and Employee (existing logic)
        const now = new Date(currentTime); // Use currentTime for date filtering base
        let startDate = null;
        if (activeRange === '7d') {
            startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (activeRange === '30d') {
            startDate = new Date(now.setDate(now.getDate() - 30));
        }
        // Ensure jobs array is not null/undefined before filtering
        const dateFilteredJobs = (jobs || []).filter(job => {
            if (job.status !== 'Complete' || !job.completedAt) return false;
            const completedDate = job.completedAt?.toDate(); // Safely access toDate
            if (!completedDate) return false; // Ensure completedDate exists
            if (!startDate) return true; 
            return completedDate >= startDate;
        });
        const employeeFilteredJobs = selectedEmployeeId
            ? dateFilteredJobs.filter(job => job.employeeId === selectedEmployeeId)
            : dateFilteredJobs;

        // 2. Calculate Job-related KPIs (existing logic)
        const jobsCompleted = employeeFilteredJobs.length;
        let totalWorkMinutes = 0;
        let totalEfficiencyRatioSum = 0; // Renamed for clarity: sum of individual job efficiency ratios
        let totalJobValue = 0;

        employeeFilteredJobs.forEach(job => {
            if (job.startedAt && job.completedAt) {
                const startedAtTime = job.startedAt.toDate().getTime(); // Ensure conversion to time
                const completedAtTime = job.completedAt.toDate().getTime(); // Ensure conversion to time
                const pausedMs = job.totalPausedMilliseconds || 0;

                let durationSeconds = (completedAtTime - startedAtTime - pausedMs) / 1000;
                durationSeconds = Math.max(0, durationSeconds); // Ensure non-negative duration

                if (durationSeconds > 0) {
                    totalWorkMinutes += durationSeconds / 60;
                }
            }
            // Corrected efficiency calculation: average of individual efficiencies
            if (job.estimatedTime && job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                const startedAtTime = job.startedAt?.toDate()?.getTime();
                const completedAtTime = job.completedAt?.toDate()?.getTime();
                const pausedMs = job.totalPausedMilliseconds || 0;
                const actualSeconds = Math.max(0, (completedAtTime - startedAtTime - pausedMs) / 1000);
                
                if (actualSeconds > 0) {
                    totalEfficiencyRatioSum += (job.estimatedTime * 60) / actualSeconds; // Sum (estimated_seconds / actual_seconds)
                }
            }
            if(typeof job.totalCost === 'number') { // Robustly check if totalCost is a number
                totalJobValue += job.totalCost;
            }
        });
        // Final average efficiency calculation
        const avgEfficiency = jobsCompleted > 0 ? (totalEfficiencyRatioSum / jobsCompleted) * 100 : 0; 

        // --- NEW: Calculate Burdened Labor Rate ---
        const totalMonthlyOverheads = (allOverheadExpenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        let overheadCostPerProductiveHour = 0;
        if (TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH > 0) {
            overheadCostPerProductiveHour = totalMonthlyOverheads / TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH;
        }

        const burdenedHourlyRates = (employees || []).map(emp => ({
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
            burdenedHourlyRates: burdenedHourlyRates 
        };
    }, [jobs, selectedEmployeeId, activeRange, employees, allOverheadExpenses, TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH, currentTime]); 


    const handleDateRangeSelect = (range) => {
        setActiveRange(range);
    };

    const getEmployeeName = (id) => (employees || []).find(e => e.id === id)?.name || 'N/A';

    // Helper to format the final duration for the table
    const formatFinalDuration = (job) => {
        if (!job.startedAt || !job.completedAt) return 'N/A';
        const startedAtTime = job.startedAt?.toDate()?.getTime();
        const completedAtTime = job.completedAt?.toDate()?.getTime();

        if (typeof startedAtTime !== 'number' || typeof completedAtTime !== 'number') return 'N/A'; // Check for valid timestamps

        let durationSeconds = (completedAtTime - startedAtTime - (job.totalPausedMilliseconds || 0)) / 1000;
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
                                {/* Check if burdenedHourlyRates is populated before mapping */}
                                {performanceData.burdenedHourlyRates && performanceData.burdenedHourlyRates.length > 0 ? (
                                    performanceData.burdenedHourlyRates.map(emp => (
                                        <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 text-gray-200">{emp.name}</td>
                                            <td className="p-3 text-gray-400 text-right">R{(emp.hourlyRate || 0).toFixed(2)}</td>
                                            <td className="p-3 text-blue-400 font-mono text-right">R{(emp.burdenedRate || 0).toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : ( // Fallback if no employees or rates
                                    <tr>
                                        <td colSpan="3" className="text-center p-4 text-gray-500">No employee data to display burdened rates.</td>
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
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-500">No completed jobs found for the selected criteria.</td></tr>
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