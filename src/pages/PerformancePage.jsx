import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
// Import all necessary Firestore API functions
import { getEmployees, listenToJobCards, getOverheadCategories, getOverheadExpenses } from '../api/firestore'; 
import Button from '../components/ui/Button';
import { CheckCircle2, AlertCircle, BarChart2, Clock, DollarSign, Zap, ArrowDown, ArrowUp } from 'lucide-react'; // Added Arrow icons for sorting

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
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(''); // This state is no longer used for dropdown, but keeping it for now
    const [activeRange, setActiveRange] = useState('all'); // '7d', '30d', 'all'

    // New state for sorting employee performance table
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    // Static constant for Total Company Productive Hours per Month (Temporary for this step)
    const TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH = 320; 

    // State for current time, updated every second, used for live tracking calculations
    const [currentTime, setCurrentTime] = useState(Date.now());


    // Effect hook for data fetching and real-time listeners
    useEffect(() => {
        let unsubscribeJobs = () => {}; // Initialized as a no-op
        let intervalId = null; // Initialized as null

        const fetchAllDataAndSetupListeners = async () => {
            setLoading(true);

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
                const expensePromises = fetchedCategories.map(category => getOverheadExpenses(category.id));
                const results = await Promise.all(expensePromises);
                results.forEach(expensesArray => {
                    collectedExpenses = [...collectedExpenses, ...expensesArray];
                });
                setAllOverheadExpenses(collectedExpenses);

                // 3. Set up the real-time listener for jobs
                unsubscribeJobs = listenToJobCards((fetchedJobs) => {
                    setJobs(fetchedJobs);
                });

                // Set initial current time and interval for live calculations
                setCurrentTime(Date.now()); 
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

        // Call the main async function
        // The return of useEffect is its cleanup function. We must ensure it runs correctly.
        fetchAllDataAndSetupListeners();
        
        // This is the actual cleanup returned by the useEffect hook
        return () => {
            if (unsubscribeJobs) {
                unsubscribeJobs(); // Clean up Firestore listener
            }
            if (intervalId) { // Clean up setInterval
                clearInterval(intervalId);
            }
        };

    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount


    // The main calculation engine for the page (memoized for performance)
    const performanceData = useMemo(() => {
            // Return early if data is still loading to prevent errors
            if (loading && jobs.length === 0 && employees.length === 0 && allOverheadExpenses.length === 0) {
                return {
                    overallKpis: { 
                        jobsCompleted: 0,
                        totalWorkHours: "0.0",
                        avgEfficiency: "0%",
                        totalJobValue: "R 0.00",
                        totalMonthlyOverheads: "R 0.00",
                        overheadCostPerProductiveHour: "R 0.00",
                    },
                    employeePerformanceMetrics: [], 
                };
            }

        // 1. Filter jobs by Date Range and Employee (existing logic)
        const now = new Date(currentTime); 
        let startDate = null;
        if (activeRange === '7d') {
            startDate = new Date(now.setDate(now.getDate() - 7));
        } else if (activeRange === '30d') {
            startDate = new Date(now.setDate(now.getDate() - 30));
        }
        // Ensure jobs array is not null/undefined before filtering
        const dateFilteredJobs = (jobs || []).filter(job => {
            if (job.status !== 'Complete' || !job.completedAt) return false;
            const completedDate = job.completedAt?.toDate(); 
            if (!completedDate) return false; 
            if (!startDate) return true; 
            return completedDate >= startDate;
        });

        // For this page, we calculate metrics for ALL employees for comparison, regardless of selectedEmployeeId
        // The previous 'employeeFilteredJobs' was for a single selected employee.
        // Now, we iterate through 'employees' and filter 'dateFilteredJobs' by each employee.

        // Calculate Overall KPIs (for the top summary cards) - This logic remains based on dateFilteredJobs
        // These sums are across ALL jobs for the selected date range.
        const overallJobsCompleted = dateFilteredJobs.length;
        let overallTotalWorkMinutes = 0;
        let overallTotalEfficiencyRatioSum = 0;
        let overallTotalJobValue = 0;

        dateFilteredJobs.forEach(job => {
            if (job.startedAt && job.completedAt) {
                const startedAtTime = job.startedAt.toDate().getTime();
                const completedAtTime = job.completedAt.toDate().getTime();
                const pausedMs = job.totalPausedMilliseconds || 0;
                let durationSeconds = (completedAtTime - startedAtTime - pausedMs) / 1000;
                durationSeconds = Math.max(0, durationSeconds); 
                if (durationSeconds > 0) {
                    overallTotalWorkMinutes += durationSeconds / 60;
                }
            }
            if (job.estimatedTime && job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                const startedAtTime = job.startedAt.toDate().getTime();
                const completedAtTime = job.completedAt.toDate().getTime();
                const pausedMs = job.totalPausedMilliseconds || 0;
                const actualSeconds = Math.max(0, (completedAtTime - startedAtTime - pausedMs) / 1000);
                if (actualSeconds > 0) {
                    overallTotalEfficiencyRatioSum += (job.estimatedTime * 60) / actualSeconds;
                }
            }
            if(typeof job.totalCost === 'number') {
                overallTotalJobValue += job.totalCost;
            }
        });

        const overallAvgEfficiency = overallJobsCompleted > 0 ? (overallTotalEfficiencyRatioSum / overallJobsCompleted) * 100 : 0;


        // --- Calculate Burdened Labor Rate (Overall) ---
        const totalMonthlyOverheads = (allOverheadExpenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        let overheadCostPerProductiveHour = 0;
        if (TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH > 0) {
            overheadCostPerProductiveHour = totalMonthlyOverheads / TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH;
        }

        // --- Calculate Individual Employee Performance Metrics for the Table ---
        const employeePerformanceMetrics = (employees || []).map(emp => {
            const currentEmployeeJobs = dateFilteredJobs.filter(job => job.employeeId === emp.id);
            
            let empJobsCompleted = currentEmployeeJobs.length;
            let empTotalWorkMinutes = 0;
            let empTotalEfficiencyRatioSum = 0;
            let empTotalJobValue = 0;

            currentEmployeeJobs.forEach(job => {
                if (job.startedAt && job.completedAt) {
                    const startedAtTime = job.startedAt.toDate().getTime();
                    const completedAtTime = job.completedAt.toDate().getTime();
                    const pausedMs = job.totalPausedMilliseconds || 0;
                    let durationSeconds = (completedAtTime - startedAtTime - pausedMs) / 1000;
                    durationSeconds = Math.max(0, durationSeconds); 
                    if (durationSeconds > 0) {
                        empTotalWorkMinutes += durationSeconds / 60;
                    }
                }
                if (job.estimatedTime && job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                    const startedAtTime = job.startedAt.toDate().getTime();
                    const completedAtTime = job.completedAt.toDate().getTime();
                    const pausedMs = job.totalPausedMilliseconds || 0;
                    const actualSeconds = Math.max(0, (completedAtTime - startedAtTime - pausedMs) / 1000);
                    if (actualSeconds > 0) {
                        empTotalEfficiencyRatioSum += (job.estimatedTime * 60) / actualSeconds;
                    }
                }
                if(typeof job.totalCost === 'number') {
                    empTotalJobValue += job.totalCost;
                }
            });

            const empAvgEfficiency = empJobsCompleted > 0 ? (empTotalEfficiencyRatioSum / empJobsCompleted) * 100 : 0;
            const burdenedRate = (emp.hourlyRate || 0) + overheadCostPerProductiveHour;

            return {
                id: emp.id,
                name: emp.name,
                hourlyRate: emp.hourlyRate || 0,
                burdenedRate: burdenedRate,
                jobsCompleted: empJobsCompleted,
                totalWorkHours: empTotalWorkMinutes / 60, 
                avgEfficiency: empAvgEfficiency,
                totalJobValue: empTotalJobValue,
            };
        });

        // Apply sorting to the individual employee performance metrics
        let sortedEmployeePerformanceMetrics = [...employeePerformanceMetrics]; // Create a mutable copy for sorting
        if (sortConfig.key) {
            sortedEmployeePerformanceMetrics.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (typeof aValue === 'string') { // Handle string sorting
                    return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                } else { // Handle numeric sorting
                    return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                }
            });
        }


        return {
            overallKpis: { // These are for the top summary cards
                jobsCompleted: overallJobsCompleted,
                totalWorkHours: overallTotalWorkMinutes.toFixed(1),
                avgEfficiency: `${Math.round(overallAvgEfficiency)}%`,
                totalJobValue: `R ${overallTotalJobValue.toFixed(2)}`,
                totalMonthlyOverheads: `R ${totalMonthlyOverheads.toFixed(2)}`,
                overheadCostPerProductiveHour: `R ${overheadCostPerProductiveHour.toFixed(2)}`,
            },
            employeePerformanceMetrics: sortedEmployeePerformanceMetrics, // Provide the sorted metrics
            jobList: dateFilteredJobs // Provide the filtered job list for the lower table
        };
    }, [jobs, activeRange, employees, allOverheadExpenses, TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH, currentTime, sortConfig]); 


    const handleDateRangeSelect = (range) => {
        setActiveRange(range);
    };

    // Function to handle sorting requests from table headers
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Helper to display sort indicator icon in table headers
    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
        }
        return null;
    };


    // Helper to format the final duration for the table (used in the bottom "Completed Job Details" table)
    const formatFinalDuration = (job) => {
        if (!job.startedAt || !job.completedAt) return 'N/A';
        const startedAtTime = job.startedAt?.toDate()?.getTime();
        const completedAtTime = job.completedAt?.toDate()?.getTime();

        if (typeof startedAtTime !== 'number' || typeof completedAtTime !== 'number' || isNaN(startedAtTime) || isNaN(completedAtTime)) return 'N/A'; // More robust check

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
                    {/* Removed employee selection dropdown to focus on overall and individual employee comparison */}
                    <div className="md:col-span-3 flex items-end justify-center gap-2"> {/* Centered buttons */}
                        <Button variant={activeRange === '7d' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('7d')}>Last 7 Days</Button>
                        <Button variant={activeRange === '30d' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('30d')}>Last 30 Days</Button>
                        <Button variant={activeRange === 'all' ? 'primary' : 'secondary'} onClick={() => handleDateRangeSelect('all')}>All Time</Button>
                    </div>
                </div>
                {/* --- Overall KPI Display --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard icon={<CheckCircle2 size={24} />} title="Jobs Completed (Overall)" value={performanceData.overallKpis.jobsCompleted} color="bg-green-500/20 text-green-400" />
                    <KpiCard icon={<Clock size={24} />} title="Total Work Time (Overall)" value={`${performanceData.overallKpis.totalWorkHours} hrs`} color="bg-blue-500/20 text-blue-400" />
                    <KpiCard icon={<Zap size={24} />} title="Average Efficiency (Overall)" value={performanceData.overallKpis.avgEfficiency} color="bg-purple-500/20 text-purple-400" />
                    <KpiCard icon={<DollarSign size={24} />} title="Total Job Value (Overall)" value={performanceData.overallKpis.totalJobValue} color="bg-yellow-500/20 text-yellow-400" />
                </div>
                {/* --- Financial KPI Display (Overall) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KpiCard icon={<DollarSign size={24} />} title="Total Monthly Overheads" value={performanceData.overallKpis.totalMonthlyOverheads} color="bg-red-500/20 text-red-400" />
                    <KpiCard icon={<Clock size={24} />} title="Overhead Cost per Productive Hour" value={performanceData.overallKpis.overheadCostPerProductiveHour} color="bg-orange-500/20 text-orange-400" />
                    <KpiCard icon={<BarChart2 size={24} />} title="Company Productive Hours/Month (Est.)" value={`${TOTAL_COMPANY_PRODUCTIVE_HOURS_PER_MONTH} hrs`} color="bg-teal-500/20 text-teal-400" />
                </div>

                {/* --- NEW: Employee Performance Ranking Table --- */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-bold text-white p-4 border-b border-gray-700">Individual Employee Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-600 bg-gray-900/50">
                                    <th className="p-3 font-semibold text-gray-400">Employee</th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('hourlyRate')}>
                                        Direct Rate {getSortIndicator('hourlyRate')}
                                    </th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('burdenedRate')}>
                                        Burdened Rate {getSortIndicator('burdenedRate')}
                                    </th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('jobsCompleted')}>
                                        Jobs Completed {getSortIndicator('jobsCompleted')}
                                    </th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('totalWorkHours')}>
                                        Work Hours {getSortIndicator('totalWorkHours')}
                                    </th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('avgEfficiency')}>
                                        Efficiency {getSortIndicator('avgEfficiency')}
                                    </th>
                                    <th className="p-3 font-semibold text-gray-400 text-right cursor-pointer" onClick={() => requestSort('totalJobValue')}>
                                        Job Value {getSortIndicator('totalJobValue')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center p-8 text-gray-400">Loading employee data...</td></tr>
                                ) : performanceData.employeePerformanceMetrics.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center p-8 text-gray-500">No employee performance data available for this period.</td></tr>
                                ) : (
                                    performanceData.employeePerformanceMetrics.map(emp => (
                                        <tr key={emp.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 text-gray-200">{emp.name}</td>
                                            <td className="p-3 text-gray-400 text-right">R{(emp.hourlyRate || 0).toFixed(2)}</td>
                                            <td className="p-3 text-blue-400 font-mono text-right">R{(emp.burdenedRate || 0).toFixed(2)}</td>
                                            <td className="p-3 text-gray-300 text-right">{emp.jobsCompleted}</td>
                                            <td className="p-3 text-gray-300 text-right">{emp.totalWorkHours.toFixed(1)}</td>
                                            <td className="p-3 text-gray-300 text-right">{`${Math.round(emp.avgEfficiency)}%`}</td>
                                            <td className="p-3 text-green-400 font-mono text-right">R{(emp.totalJobValue || 0).toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Job List Table (Original) --- */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <h3 className="text-lg font-bold text-white p-4 border-b border-gray-700">Completed Job Details (Filtered by Date Range)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-600 bg-gray-900/50">
                                    <th className="p-3 text-sm font-semibold text-gray-400">Part</th>
                                     {/* Removed employee column here since individual employee table is above */}
                                    <th className="p-3 text-sm font-semibold text-gray-400">Completed On</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400">Actual Time</th>
                                    <th className="p-3 text-sm font-semibold text-gray-400 text-right">Job Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ?
                                (
                                    <tr><td colSpan="4" className="text-center p-8 text-gray-400">Loading job details...</td></tr>
                                ) : performanceData.jobList && performanceData.jobList.length === 0 ?
                                 ( 
                                    <tr><td colSpan="4" className="text-center p-8 text-gray-500">No completed jobs found for the selected criteria.</td></tr>
                                ) : (
                                    performanceData.jobList.map(job => (
                                        <tr key={job.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                            <td className="p-3 text-gray-200">{job.partName}</td>
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