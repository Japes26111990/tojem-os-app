// FILE: src/pages/EmployeeIntelligencePage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { getCompletedJobsForEmployee, getOverheadCategories, getOverheadExpenses, getEmployees, listenToJobCards, getSkills } from '../api/firestore'; // Added getSkills
import { ChevronsLeft, Zap, DollarSign, AlertCircle, CheckCircle2, Users, BarChartHorizontal, Lightbulb, GraduationCap } from 'lucide-react'; // Added GraduationCap icon
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

// NEW: SkillGapAnalysisWidget Component
const SkillGapAnalysisWidget = ({ employee, jobs, allSkills }) => {
    const skillInsights = useMemo(() => {
        if (!employee || !jobs || jobs.length === 0 || allSkills.length === 0) return [];

        const insights = [];
        const employeeSkillsMap = new Map(Object.entries(employee.skills || {})); // Convert employee.skills object to a Map for easier lookup
        const allSkillsMap = new Map(allSkills.map(s => [s.id, s.name]));

        // Analyze performance related to skills
        const performanceBySkill = {}; // { skillId: { totalEfficiency: N, totalRework: N, jobCount: N } }

        jobs.filter(j => j.status === 'Complete' || j.status === 'Issue')
            .forEach(job => {
                // In a real scenario, jobs would explicitly reference skills needed.
                // For now, let's infer skills from department or just broadly evaluate.
                // A more advanced integration would link job recipes to specific skills.
                // For a basic MVP, let's assume if an employee is in a department, and a skill is commonly associated
                // with that department, then jobs done in that department relate to that skill.
                // Or, if a job has tools/accessories that imply a skill (e.g., 'Welding Machine' -> 'Welding' skill).
                
                // For this example, let's simplify: if an employee has a skill and their overall
                // efficiency/rework is poor, we flag it. This is a very basic correlation.
                // A better correlation would come from job recipes explicitly stating required skills.

                // A very simple rule: if a job had an issue, and the employee claims proficiency in any skill,
                // consider it a potential area for training related to ALL their skills. This is a weak link.
                // To make it stronger, job types would need associated skills.

                // Let's refine the logic:
                // Find skills *potentially* related to the job (e.g., based on department if skills are departmental, or tools used if tools imply skills)
                // Since we don't have direct job-to-skill links in job cards yet, we'll use a heuristic.
                // Heuristic: If employee claims skill X, and their overall performance (efficiency/rework) is below average,
                // we *might* suggest training in skills where their proficiency is not 'Expert'.

                // Re-think for initial practical implementation given available data:
                // If the employee's *overall* efficiency is low AND they have skills marked 'Beginner' or 'Intermediate',
                // suggest focusing on improving those specific skills.
                // If rework rate is high, suggest review of skills where proficiency is not 'Expert'.

                // For a more direct analysis, we'd need job.requiredSkills array on the job object.
                // Since we don't have that, we'll use a simpler approach:
                // For jobs that are "Complete" or "Issue":
                // If a job leads to an "Issue", it points to a quality gap. Which skills are relevant?
                // If a job's duration is very long relative to estimated, it points to an efficiency gap.

                // Let's create a *hypothetical* linkage for now.
                // For a truly useful "skill gap" analysis without explicit job-to-skill mapping:
                // We could infer skills from `job.departmentId` (if departments map to skills) or
                // from `job.tools` or `job.processedConsumables` (if tools/materials imply a skill like 'Welding').

                // Without direct `job.requiredSkills` or `department.mainSkills` in the job document,
                // a *true* skill gap analysis tied to specific job performance is very hard.

                // Let's create an insightful analysis based on *overall performance* relative to *current skill proficiencies*.
                // This is still useful, even if not job-specific.

                // Analyze overall efficiency and rework vs. their skill levels
                if (job.status === 'Complete' && job.estimatedTime > 0 && job.startedAt && job.completedAt) {
                    const durationSeconds = (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000;
                    if (durationSeconds > 0) {
                        const efficiency = ((job.estimatedTime * 60) / durationSeconds) * 100;
                        // Example: If overall efficiency is low and they have non-expert skills, suggest those.
                    }
                }
                if (job.status === 'Issue') {
                    // Example: If rework is high, suggest reviewing their non-expert skills.
                }
            });

        // Simplified logic for initial implementation of skill gap suggestions
        // This is based on the employee's overall performance metrics (passed down from parent)
        // and their declared skill proficiencies.
        const { individual } = employee.performanceMetrics || {}; // Access metrics from the employee prop

        if (!individual) return [];

        if (individual.efficiency < 90) { // If efficiency is below 90%
            employeeSkillsMap.forEach((proficiency, skillId) => {
                if (proficiency === 'Beginner' || proficiency === 'Intermediate') {
                    insights.push({
                        type: 'efficiency_gap',
                        skillId: skillId,
                        skillName: allSkillsMap.get(skillId) || 'Unknown Skill',
                        message: `Consider training in ${allSkillsMap.get(skillId) || 'Unknown Skill'} to boost overall efficiency. (Current proficiency: ${proficiency})`
                    });
                }
            });
        }

        if (individual.reworkRate > 5) { // If rework rate is above 5%
             employeeSkillsMap.forEach((proficiency, skillId) => {
                if (proficiency !== 'Expert') { // Suggest training if not an expert in any skill
                    insights.push({
                        type: 'quality_gap',
                        skillId: skillId,
                        skillName: allSkillsMap.get(skillId) || 'Unknown Skill',
                        message: `Review techniques in ${allSkillsMap.get(skillId) || 'Unknown Skill'} to reduce rework. (Current proficiency: ${proficiency})`
                    });
                }
            });
        }
        
        // Add a general suggestion if they have no skills marked 'Expert'
        let hasExpertSkill = false;
        employeeSkillsMap.forEach(proficiency => {
            if (proficiency === 'Expert') {
                hasExpertSkill = true;
            }
        });
        if (!hasExpertSkill && jobs.length > 0) { // Only suggest if they've done some jobs
            insights.push({
                type: 'general_growth',
                message: `Encourage development towards 'Expert' proficiency in at least one key skill area.`,
                skillId: null, // No specific skill
                skillName: 'General Development'
            });
        }


        // Deduplicate messages if multiple skills trigger the same general insight
        const uniqueInsights = [];
        const seenMessages = new Set();
        insights.forEach(insight => {
            if (!seenMessages.has(insight.message)) {
                uniqueInsights.push(insight);
                seenMessages.add(insight.message);
            }
        });

        return uniqueInsights;
    }, [employee, jobs, allSkills]); // Re-run when employee (incl. metrics), jobs, or allSkills change

    if (!employee || allSkills.length === 0) return null; // Don't render if essential data is missing

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <GraduationCap size={20} className="text-purple-400"/> Skill Gap Insights & Training Suggestions
            </h3>
            {skillInsights.length > 0 ? (
                <ul className="space-y-3">
                    {skillInsights.map((insight, index) => (
                        <li key={index} className="flex items-start space-x-3 bg-gray-700/50 p-3 rounded-lg">
                            <div className="flex-shrink-0 mt-1">
                                {insight.type.includes('efficiency') && <Zap size={18} className="text-blue-400" />}
                                {insight.type.includes('quality') && <AlertCircle size={18} className="text-red-400" />}
                                {insight.type.includes('general') && <Lightbulb size={18} className="text-yellow-400" />}
                            </div>
                            <p className="text-sm text-gray-300">{insight.message}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-400 text-sm">No specific skill gaps or training suggestions identified based on current performance and skill levels. Keep up the good work!</p>
            )}
        </div>
    );
};


const EmployeeIntelligencePage = () => {
    const { employeeId } = useParams();
    const [employee, setEmployee] = useState(null);
    const [allEmployees, setAllEmployees] = useState([]);
    const [jobs, setJobs] = useState([]); // This is the selected employee's completed/issue jobs
    const [allJobs, setAllJobs] = useState([]); // This is ALL jobs in the system, for team averages
    const [allSkills, setAllSkills] = useState([]); // New state for all skills
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
           
                const [employeeDoc, completedJobs, overheadCategories, allEmps, fetchedSkills] = await Promise.all([ // Added fetchedSkills
                    getDoc(employeeDocRef),
                    getCompletedJobsForEmployee(employeeId),
                    getOverheadCategories(),
                    getEmployees(),
                    getSkills(), // Fetch all skills
                ]);

                if (employeeDoc.exists()) setEmployee({ id: employeeDoc.id, ...employeeDoc.data() });
                setJobs(completedJobs); // Jobs for this specific employee
                setAllEmployees(allEmps);
                setAllSkills(fetchedSkills); // Set all skills state
                unsubscribe = listenToJobCards(j => setAllJobs(j)); // All jobs for team metrics

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

    // Attach performance metrics to the employee object for the SkillGapAnalysisWidget
    const employeeWithMetrics = useMemo(() => {
        if (!employee) return null;
        return { ...employee, performanceMetrics: performanceMetrics };
    }, [employee, performanceMetrics]);


    if (loading) return <p className="text-white text-center">Loading Performance & Value Engine...</p>;
    if (!employee) return <p className="text-red-500 text-center">Employee not found.</p>;

    return (
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

                {/* NEW: Skill Gap Analysis Widget */}
                {employeeWithMetrics && (
                    <SkillGapAnalysisWidget 
                        employee={employeeWithMetrics} 
                        jobs={jobs} // Pass the specific employee's jobs
                        allSkills={allSkills} 
                    />
                )}
                {/* END NEW: Skill Gap Analysis Widget */}


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