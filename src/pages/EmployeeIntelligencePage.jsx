import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
// MainLayout import removed
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { getCompletedJobsForEmployee, getOverheadCategories, getOverheadExpenses, getEmployees, listenToJobCards } from '../api/firestore';
import { ChevronsLeft, Zap, DollarSign, AlertCircle, CheckCircle2, Users, BarChartHorizontal } from 'lucide-react';
import EfficiencyChart from '../components/intelligence/EfficiencyChart';
import PerformanceSnapshot from '../components/intelligence/PerformanceSnapshot';
import ValueWasteAnalysis from '../components/intelligence/ValueWasteAnalysis';
import ReworkAnalysisModal from '../components/intelligence/ReworkAnalysisModal';
import RealTimeValueWidget from '../components/intelligence/RealTimeValueWidget';
import SkillProgressionWidget from '../components/intelligence/SkillProgressionWidget';
import JobCompletionAnalysisWidget from '../components/intelligence/JobCompletionAnalysisWidget';
import EfficiencyAnalysisModal from '../components/intelligence/EfficiencyAnalysisModal';


const KpiCard = ({ icon, title, value, teamAverage, color, onClick, buttonText }) => (
    <div className={`bg-gray-800 p-5 rounded-lg border border-gray-700 flex flex-col justify-between`}>
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
                {teamAverage && (
                     <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Users size={12} className="mr-1"/>
                        <span>Team Avg: {teamAverage}</span>
                    </div>
                )}
            </div>
        </div>
        {onClick && (
            <button onClick={onClick} className="mt-4 text-xs font-semibold text-blue-400 hover:text-blue-300 text-left flex items-center">
                <BarChartHorizontal size={14} className="mr-1" />
                {buttonText || 'Analyze'}
            </button>
        )}
    </div>
);

const EmployeeIntelligencePage = () => {
    const { employeeId } = useParams();
    const [employee, setEmployee] = useState(null);
    const [allEmployees, setAllEmployees] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [allJobs, setAllJobs] = useState([]);
    const [overheads, setOverheads] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isReworkModalOpen, setReworkModalOpen] = useState(false);
    const [isEfficiencyModalOpen, setEfficiencyModalOpen] = useState(false);

    useEffect(() => {
        let unsubscribe = () => {};
        const fetchAllData = async () => {
            if (!employeeId) return;
            setLoading(true);
            try {
                const employeeDocRef = doc(db, 'employees', employeeId);
                const [employeeDoc, completedJobs, overheadCategories, allEmps] = await Promise.all([
                    getDoc(employeeDocRef),
                    getCompletedJobsForEmployee(employeeId),
                    getOverheadCategories(),
                    getEmployees(),
                ]);

                if (employeeDoc.exists()) setEmployee({ id: employeeDoc.id, ...employeeDoc.data() });
                setJobs(completedJobs);
                setAllEmployees(allEmps);
                unsubscribe = listenToJobCards(j => setAllJobs(j));

                let totalOverheads = 0;
                const expensePromises = overheadCategories.map(cat => getOverheadExpenses(cat.id));
                const expenseResults = await Promise.all(expensePromises);
                expenseResults.flat().forEach(exp => { totalOverheads += exp.amount || 0; });
                setOverheads(totalOverheads);
            } catch (error) { console.error("Error fetching employee data:", error); }
            setLoading(false);
        };

        fetchAllData();
        return () => unsubscribe();
    }, [employeeId]);

    const { performanceMetrics, overheadCostPerHour } = useMemo(() => {
        // ... (memoized logic remains the same)
        const metrics = {
            individual: { efficiency: 0, netValueAdded: 0, reworkRate: 0, jobsCompleted: 0 },
            team: { efficiency: 0, netValueAdded: 0, reworkRate: 0 }
        };
        if (!employee || allEmployees.length === 0) return { performanceMetrics: metrics, overheadCostPerHour: 0 };
        
        const calculatedOverheadCostPerHour = overheads / 173.2; 
        
        const issueJobsCount = jobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue').length;
        const completedJobs = jobs.filter(j => j.status === 'Complete');
        let individualTotalWorkMinutes = 0, individualTotalEfficiencyRatioSum = 0, individualTotalJobValue = 0;
        completedJobs.forEach(job => {
            if (job.startedAt && job.completedAt) {
                const durationSeconds = (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000;
                if(durationSeconds > 0) {
                    individualTotalWorkMinutes += durationSeconds / 60;
                    if (job.estimatedTime > 0) {
                        individualTotalEfficiencyRatioSum += (job.estimatedTime * 60) / durationSeconds;
                    }
                }
            }
            individualTotalJobValue += job.totalCost || 0;
        });

        const burdenedRate = (employee.hourlyRate || 0) + calculatedOverheadCostPerHour;
        const totalLaborCost = (individualTotalWorkMinutes / 60) * burdenedRate;
        
        metrics.individual = {
            efficiency: completedJobs.length > 0 ? (individualTotalEfficiencyRatioSum / completedJobs.length) * 100 : 0,
            netValueAdded: individualTotalJobValue - totalLaborCost,
            reworkRate: jobs.length > 0 ? (issueJobsCount / jobs.length) * 100 : 0,
            jobsCompleted: jobs.length
        };

        const departmentEmployees = allEmployees.filter(e => e.departmentId === employee.departmentId);
        const departmentEmployeeIds = new Set(departmentEmployees.map(e => e.id));
        const departmentJobs = allJobs.filter(j => j.completedAt && departmentEmployeeIds.has(j.employeeId));
        const teamIssueJobsCount = departmentJobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue').length;
        const teamCompletedJobs = departmentJobs.filter(j => j.status === 'Complete');
        let teamTotalEfficiencyRatioSum = 0, teamTotalValue = 0, teamTotalLaborCost = 0;
        teamCompletedJobs.forEach(job => {
            if (job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                const actualSeconds = (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000;
                if(actualSeconds > 0) teamTotalEfficiencyRatioSum += (job.estimatedTime * 60) / actualSeconds;
            }
            const jobWorkMinutes = ((job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000) / 60;
            const employeeForJob = allEmployees.find(e => e.id === job.employeeId);
            if(employeeForJob) teamTotalLaborCost += (jobWorkMinutes / 60) * ((employeeForJob.hourlyRate || 0) + calculatedOverheadCostPerHour);
            teamTotalValue += job.totalCost || 0;
        });

        metrics.team = {
            efficiency: teamCompletedJobs.length > 0 ? (teamTotalEfficiencyRatioSum / teamCompletedJobs.length) * 100 : 0,
            netValueAdded: departmentEmployees.length > 0 ? (teamTotalValue - teamTotalLaborCost) / departmentEmployees.length : 0,
            reworkRate: departmentJobs.length > 0 ? (teamIssueJobsCount / departmentJobs.length) * 100 : 0
        };

        return { performanceMetrics: metrics, overheadCostPerHour: calculatedOverheadCostPerHour };
    }, [employee, jobs, allEmployees, allJobs, overheads]);

    // THE FIX: Remove the MainLayout wrappers from the loading/error states
    if (loading) return <p className="text-white text-center">Loading Performance & Value Engine...</p>;
    if (!employee) return <p className="text-red-500 text-center">Employee not found.</p>;

    return (
        // The page content is no longer wrapped in MainLayout
        <>
            <div className="space-y-8">
                <div>
                    <Link to="/performance" className="flex items-center text-blue-400 hover:text-blue-300 mb-4">
                        <ChevronsLeft size={20} className="mr-1" />
                        Back to Business Performance Dashboard
                    </Link>
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h2 className="text-3xl font-bold text-white">{employee.name}</h2>
                        <p className="text-gray-400">Performance & Value Engine</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard 
                        icon={<Zap size={24} />} 
                        title="Overall Efficiency" 
                        value={`${performanceMetrics.individual.efficiency.toFixed(0)}%`} 
                        teamAverage={`${performanceMetrics.team.efficiency.toFixed(0)}%`} 
                        color="bg-purple-500/20 text-purple-400"
                        onClick={() => setEfficiencyModalOpen(true)}
                        buttonText="Analyze by Department"
                    />
                    <KpiCard 
                        icon={<DollarSign size={24} />} 
                        title="Net Value Added (Period)" 
                        value={`R ${performanceMetrics.individual.netValueAdded.toFixed(2)}`} 
                        teamAverage={`R ${performanceMetrics.team.netValueAdded.toFixed(2)}`} 
                        color="bg-green-500/20 text-green-400" 
                    />
                    <KpiCard 
                        icon={<AlertCircle size={24} />} 
                        title="Rework / Issue Rate" 
                        value={`${performanceMetrics.individual.reworkRate.toFixed(1)}%`} 
                        teamAverage={`${performanceMetrics.team.reworkRate.toFixed(1)}%`} 
                        color="bg-red-500/20 text-red-400" 
                        onClick={() => setReworkModalOpen(true)}
                        buttonText="Analyze Root Causes"
                    />
                    <KpiCard 
                        icon={<CheckCircle2 size={24} />} 
                        title="Jobs Completed" 
                        value={performanceMetrics.individual.jobsCompleted} 
                        color="bg-blue-500/20 text-blue-400" 
                    />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                         <PerformanceSnapshot metrics={performanceMetrics} />
                    </div>
                    <RealTimeValueWidget
                        jobs={jobs}
                        employee={employee}
                        overheadCostPerHour={overheadCostPerHour}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">Efficiency Over Time</h3>
                        <EfficiencyChart jobs={jobs} />
                    </div>
                    <ValueWasteAnalysis jobs={jobs} />
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <JobCompletionAnalysisWidget employeeId={employeeId} />
                   <SkillProgressionWidget employeeId={employeeId} />
                </div>
            </div>

            {isEfficiencyModalOpen && (
                <EfficiencyAnalysisModal
                    jobs={jobs}
                    employeeName={employee.name}
                    onClose={() => setEfficiencyModalOpen(false)}
                />
            )}

            {isReworkModalOpen && (
                <ReworkAnalysisModal
                    jobs={jobs}
                    employeeName={employee.name}
                    onClose={() => setReworkModalOpen(false)}
                />
            )}
        </>
    );
};

export default EmployeeIntelligencePage;