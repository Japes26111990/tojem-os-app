// src/pages/EmployeeIntelligencePage.jsx (Corrected, Optimized & Expanded)

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { getCompletedJobsForEmployee, getOverheadCategories, getOverheadExpenses, getEmployees, listenToJobCards, getSkills, getTrainingResources } from '../api/firestore';
import { ChevronsLeft, Zap, DollarSign, AlertCircle, CheckCircle2, Users, BarChartHorizontal, Lightbulb, GraduationCap, Link as LinkIcon, Award, Gem, ShieldCheck, Star, TrendingDown, Clock, ShieldAlert } from 'lucide-react';

// Child Components (Widgets)
import EfficiencyChart from '../components/intelligence/EfficiencyChart';
import PerformanceSnapshot from '../components/intelligence/PerformanceSnapshot';
import ValueWasteAnalysis from '../components/intelligence/ValueWasteAnalysis';
import ReworkAnalysisModal from '../components/intelligence/ReworkAnalysisModal';
import RealTimeValueWidget from '../components/intelligence/RealTimeValueWidget';
import SkillProgressionWidget from '../components/intelligence/SkillProgressionWidget';
import JobCompletionAnalysisWidget from '../components/intelligence/JobCompletionAnalysisWidget';
import EfficiencyAnalysisModal from '../components/intelligence/EfficiencyAnalysisModal';
import TrophyCase from '../components/intelligence/TrophyCase';
import ReliabilityReport from '../components/intelligence/ReliabilityReport'; // <-- Import the newly completed component

const KpiCard = ({ icon, title, value, teamAverage, color, onClick, buttonText }) => (
    <div className={`bg-gray-800 p-5 rounded-lg border border-gray-700 flex flex-col justify-between`}>
        <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${color}`}>{icon}</div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
                {teamAverage && (<div className="flex items-center text-xs text-gray-500 mt-1"><Users size={12} className="mr-1"/><span>Team Avg: {teamAverage}</span></div>)}
            </div>
        </div>
        {onClick && (
            <button onClick={onClick} className="mt-4 text-xs font-semibold text-blue-400 hover:text-blue-300 text-left flex items-center">
                <BarChartHorizontal size={14} className="mr-1" />{buttonText || 'Analyze'}
            </button>
        )}
    </div>
);

const SkillGapAnalysisWidget = ({ employee, jobs, allSkills, trainingResources }) => {
    const skillInsights = useMemo(() => {
        if (!employee || !jobs || !allSkills) return [];
        const insights = [];
        const employeeSkillsMap = new Map(Object.entries(employee.skills || {}));
        const allSkillsMap = new Map(allSkills.map(s => [s.id, s.name]));
        const resourcesMap = (trainingResources || []).reduce((acc, resource) => {
            if (!acc[resource.skillId]) { acc[resource.skillId] = []; }
            acc[resource.skillId].push(resource);
            return acc;
        }, {});
        const { individual } = employee.performanceMetrics || {};
        if (!individual) return [];
        if (individual.efficiency < 90) {
            employeeSkillsMap.forEach((proficiency, skillId) => {
                if (proficiency < 4) { insights.push({ type: 'efficiency_gap', skillId: skillId, skillName: allSkillsMap.get(skillId) || 'Unknown Skill', message: `Consider training in ${allSkillsMap.get(skillId) || 'this skill'} to boost overall efficiency.`, currentProficiency: proficiency }); }
            });
        }
        if (individual.reworkRate > 5) {
             employeeSkillsMap.forEach((proficiency, skillId) => {
                if (proficiency < 5) { insights.push({ type: 'quality_gap', skillId: skillId, skillName: allSkillsMap.get(skillId) || 'Unknown Skill', message: `Review techniques in ${allSkillsMap.get(skillId) || 'this skill'} to reduce rework.`, currentProficiency: proficiency }); }
            });
        }
        const uniqueInsights = [];
        const seenMessages = new Set();
        insights.forEach(insight => {
            if (!seenMessages.has(insight.message)) {
                insight.resources = resourcesMap[insight.skillId] || [];
                uniqueInsights.push(insight);
                seenMessages.add(insight.message);
            }
        });
        return uniqueInsights;
    }, [employee, jobs, allSkills, trainingResources]);

    if (!employee || !allSkills) return null;
    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><GraduationCap size={20} className="text-purple-400"/> Skill Gap & Training Suggestions</h3>
            {skillInsights.length > 0 ? (
                <ul className="space-y-4">
                    {skillInsights.map((insight, index) => (
                        <li key={index} className="bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-1">{insight.type.includes('efficiency') ? <Zap size={18} className="text-blue-400" /> : <AlertCircle size={18} className="text-red-400" />}</div>
                                <div><p className="text-sm text-gray-200">{insight.message}</p><p className="text-xs text-gray-400">Current Proficiency Level: {insight.currentProficiency}</p></div>
                            </div>
                            {insight.resources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-600/50 space-y-2">
                                    <p className="text-xs font-semibold text-gray-300">Suggested Resources:</p>
                                    {insight.resources.map(res => (<a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-blue-400 hover:underline"><LinkIcon size={14} className="mr-2"/>{res.resourceName} ({res.type})</a>))}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (<p className="text-gray-400 text-sm">No specific skill gaps or training suggestions identified.</p>)}
        </div>
    );
};

const ProactiveInterventionWidget = ({ jobs, employee, allSkills }) => {
    const alerts = useMemo(() => {
        const recentJobs = [...jobs]
            .filter(j => j.status === 'Complete' || j.status === 'Issue')
            .sort((a, b) => b.completedAt.toDate() - a.completedAt.toDate())
            .slice(0, 5);

        if (recentJobs.length < 3) return [];

        const newAlerts = [];
        
        const efficiencies = recentJobs.map(j => {
            if (!j.estimatedTime || !j.completedAt?.toDate() || !j.startedAt?.toDate()) return null;
            const actualSeconds = (j.completedAt.toDate().getTime() - j.startedAt.toDate().getTime() - (j.totalPausedMilliseconds || 0)) / 1000;
            if (actualSeconds <= 0) return null;
            return (j.estimatedTime * 60) / actualSeconds;
        }).filter(e => e !== null);

        if (efficiencies.length >= 3 && efficiencies[0] < efficiencies[efficiencies.length - 1]) {
            newAlerts.push({
                id: 'efficiency-decline',
                icon: <TrendingDown className="text-yellow-400" size={20} />,
                title: "Efficiency Trend Alert",
                message: "A potential decline in efficiency has been observed over the last few jobs. Early review is recommended."
            });
        }
        
        const issueCount = recentJobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue').length;
        if (issueCount >= 2) {
             newAlerts.push({
                id: 'rework-increase',
                icon: <ShieldAlert className="text-red-400" size={20} />,
                title: "Rework Rate Concern",
                message: `An increase in jobs with issues (${issueCount} of the last ${recentJobs.length}) has been detected. Consider a quality check-in.`
            });
        }

        const underestimatedJobs = recentJobs.filter(j => {
            if (!j.estimatedTime || !j.completedAt?.toDate() || !j.startedAt?.toDate()) return false;
            const actualSeconds = (j.completedAt.toDate().getTime() - j.startedAt.toDate().getTime() - (j.totalPausedMilliseconds || 0)) / 1000;
            return actualSeconds > (j.estimatedTime * 60);
        }).length;

        if (underestimatedJobs / recentJobs.length >= 0.6) {
             newAlerts.push({
                id: 'time-estimation',
                icon: <Clock className="text-blue-400" size={20} />,
                title: "Time Estimation Pattern",
                message: "A pattern of underestimating job duration has been noted. A review of the estimation process may be helpful."
            });
        }

        return newAlerts;

    }, [jobs, employee, allSkills]);

    if (alerts.length === 0) return null;

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-yellow-500/30">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Lightbulb size={20} className="text-yellow-400"/> Proactive Interventions</h3>
            <p className="text-sm text-gray-400 mb-4">The following trends have been identified from recent activity and may warrant a proactive conversation.</p>
            <ul className="space-y-3">
                {alerts.map(alert => (
                    <li key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-700/40 rounded-md">
                        <div className="flex-shrink-0 mt-1">{alert.icon}</div>
                        <div>
                            <h4 className="font-semibold text-gray-200">{alert.title}</h4>
                            <p className="text-sm text-gray-300">{alert.message}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const EmployeeIntelligencePage = () => {
    const { employeeId } = useParams();
    const [employee, setEmployee] = useState(null);
    const [allEmployees, setAllEmployees] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [allJobs, setAllJobs] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [trainingResources, setTrainingResources] = useState([]);
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
                const [employeeDoc, completedJobs, overheadCategories, allEmps, fetchedSkills, fetchedResources] = await Promise.all([
                    getDoc(employeeDocRef), getCompletedJobsForEmployee(employeeId), getOverheadCategories(), getEmployees(), getSkills(), getTrainingResources(),
                ]);
                if (employeeDoc.exists()) setEmployee({ id: employeeDoc.id, ...employeeDoc.data() });
                setJobs(completedJobs); setAllEmployees(allEmps); setAllSkills(fetchedSkills); setTrainingResources(fetchedResources);
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

    const { performanceMetrics, overheadCostPerHour, earnedBadges } = useMemo(() => {
        const metrics = { individual: { efficiency: 0, netValueAdded: 0, reworkRate: 0, jobsCompleted: 0 }, team: { efficiency: 0, netValueAdded: 0, reworkRate: 0 } };
        if (!employee || allEmployees.length === 0) return { performanceMetrics: metrics, overheadCostPerHour: 0, earnedBadges: [] };
        
        const calculatedOverheadCostPerHour = overheads > 0 && allEmployees.length > 0 ? overheads / (allEmployees.length * 173.2) : 0;
        const issueJobsCount = jobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue').length;
        const completedJobs = jobs.filter(j => j.status === 'Complete');
        let individualTotalWorkMinutes = 0, individualTotalEfficiencyRatioSum = 0, individualTotalJobValue = 0, jobsWithTime = 0;
        
        completedJobs.forEach(job => {
            if (job.startedAt?.toDate && job.completedAt?.toDate) {
                const durationSeconds = (job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000;
                if(durationSeconds > 0) {
                    individualTotalWorkMinutes += durationSeconds / 60;
                    if (job.estimatedTime > 0) { 
                        individualTotalEfficiencyRatioSum += (job.estimatedTime * 60) / durationSeconds;
                        jobsWithTime++;
                     }
                }
            }
            individualTotalJobValue += job.totalCost || 0;
        });

        const burdenedRate = (employee.hourlyRate || 0) + calculatedOverheadCostPerHour;
        const totalLaborCost = (individualTotalWorkMinutes / 60) * burdenedRate;
        metrics.individual = {
            efficiency: jobsWithTime > 0 ? (individualTotalEfficiencyRatioSum / jobsWithTime) * 100 : 0,
            netValueAdded: individualTotalJobValue - totalLaborCost,
            reworkRate: jobs.length > 0 ? (issueJobsCount / jobs.length) * 100 : 0,
            jobsCompleted: jobs.length
        };
        
        const departmentEmployees = allEmployees.filter(e => e.departmentId === employee.departmentId);
        const departmentEmployeeIds = new Set(departmentEmployees.map(e => e.id));
        const departmentJobs = allJobs.filter(j => j.completedAt && departmentEmployeeIds.has(j.employeeId));
        const teamIssueJobsCount = departmentJobs.filter(j => j.status === 'Issue' || j.status === 'Archived - Issue').length;
        const teamCompletedJobs = departmentJobs.filter(j => j.status === 'Complete' && j.startedAt?.toDate && j.completedAt?.toDate);
        
        const employeeMap = new Map(allEmployees.map(e => [e.id, e]));
        let teamTotalEfficiencyRatioSum = 0, teamTotalValue = 0, teamTotalLaborCost = 0, teamJobsWithTime = 0;
        
        teamCompletedJobs.forEach(job => {
            const jobWorkMinutes = ((job.completedAt.toDate().getTime() - job.startedAt.toDate().getTime() - (job.totalPausedMilliseconds || 0)) / 1000) / 60;
            if (job.estimatedTime > 0 && jobWorkMinutes > 0) {
                const actualSeconds = jobWorkMinutes * 60;
                teamTotalEfficiencyRatioSum += (job.estimatedTime * 60) / actualSeconds;
                teamJobsWithTime++;
            }
            const employeeForJob = employeeMap.get(job.employeeId);
            if(employeeForJob) {
                 const empBurdenedRate = (employeeForJob.hourlyRate || 0) + calculatedOverheadCostPerHour;
                 teamTotalLaborCost += (jobWorkMinutes / 60) * empBurdenedRate;
            }
            teamTotalValue += job.totalCost || 0;
        });

        metrics.team = {
            efficiency: teamJobsWithTime > 0 ? (teamTotalEfficiencyRatioSum / teamJobsWithTime) * 100 : 0,
            netValueAdded: departmentEmployees.length > 0 ? (teamTotalValue - teamTotalLaborCost) / departmentEmployees.length : 0,
            reworkRate: departmentJobs.length > 0 ? (teamIssueJobsCount / departmentJobs.length) * 100 : 0
        };

        const badges = [];
        if (metrics.individual.reworkRate <= 1 && metrics.individual.jobsCompleted >= 10) {
            badges.push({ id: 'quality-champ', icon: <ShieldCheck size={24} />, label: 'Quality Champion', color: 'bg-green-500/20 text-green-300', description: 'Awarded for maintaining a rework rate of 1% or less over at least 10 jobs.' });
        }
        if (metrics.individual.efficiency >= 120 && metrics.individual.jobsCompleted >= 10) {
            badges.push({ id: 'efficiency-king', icon: <Zap size={24} />, label: 'Efficiency King', color: 'bg-purple-500/20 text-purple-300', description: 'Awarded for maintaining an average efficiency of 120% or more.' });
        }
        if (metrics.individual.jobsCompleted >= 100) {
            badges.push({ id: '100-club', icon: <Gem size={24} />, label: '100 Club', color: 'bg-blue-500/20 text-blue-300', description: 'Awarded for completing 100 jobs.' });
        }
        const kudosCount = jobs.filter(j => j.kudos === true).length;
        if (kudosCount > 0) {
            badges.push({ id: 'kudos', icon: <Star size={24} />, label: `${kudosCount}x Kudos`, color: 'bg-yellow-500/20 text-yellow-300', description: 'Recognized by management for outstanding work.' });
        }

        return { performanceMetrics: metrics, overheadCostPerHour: calculatedOverheadCostPerHour, earnedBadges: badges };
    }, [employee, jobs, allEmployees, allJobs, overheads]);

    const employeeWithMetrics = useMemo(() => {
        if (!employee) return null;
        return { ...employee, performanceMetrics };
    }, [employee, performanceMetrics]);

    if (loading) return <p className="text-white text-center">Loading Performance & Value Engine...</p>;
    if (!employee) return <p className="text-red-500 text-center">Employee not found.</p>;

    return (
        <>
            <div className="space-y-8">
                <div>
                    <Link to="/performance" className="flex items-center text-blue-400 hover:text-blue-300 mb-4"><ChevronsLeft size={20} className="mr-1" />Back to Business Performance Dashboard</Link>
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h2 className="text-3xl font-bold text-white">{employee.name}</h2>
                        <p className="text-gray-400">Performance & Value Engine</p>
                    </div>
                </div>
                <TrophyCase badges={earnedBadges} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard icon={<Zap size={24} />} title="Overall Efficiency" value={`${performanceMetrics.individual.efficiency.toFixed(0)}%`} teamAverage={`${performanceMetrics.team.efficiency.toFixed(0)}%`} color="bg-purple-500/20 text-purple-400" onClick={() => setEfficiencyModalOpen(true)} buttonText="Analyze by Department" />
                    <KpiCard icon={<DollarSign size={24} />} title="Net Value Added (Period)" value={`R ${performanceMetrics.individual.netValueAdded.toFixed(2)}`} teamAverage={`R ${performanceMetrics.team.netValueAdded.toFixed(2)}`} color="bg-green-500/20 text-green-400" />
                    <KpiCard icon={<AlertCircle size={24} />} title="Rework / Issue Rate" value={`${performanceMetrics.individual.reworkRate.toFixed(1)}%`} teamAverage={`${performanceMetrics.team.reworkRate.toFixed(1)}%`} color="bg-red-500/20 text-red-400" onClick={() => setReworkModalOpen(true)} buttonText="Analyze Root Causes"/>
                    <KpiCard icon={<CheckCircle2 size={24} />} title="Jobs Completed" value={performanceMetrics.individual.jobsCompleted} color="bg-blue-500/20 text-blue-400" />
                </div>
                
                <ProactiveInterventionWidget jobs={jobs} employee={employee} allSkills={allSkills} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2"><PerformanceSnapshot metrics={performanceMetrics} /></div>
                    <RealTimeValueWidget jobs={jobs} employee={employee} overheadCostPerHour={overheadCostPerHour} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">Efficiency Over Time</h3>
                        <EfficiencyChart jobs={jobs} />
                    </div>
                    <ValueWasteAnalysis jobs={jobs} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* The component is now correctly placed here */}
                    <ReliabilityReport employeeId={employeeId} />
                    <SkillProgressionWidget employeeId={employeeId} />
                </div>
                {employeeWithMetrics && (<SkillGapAnalysisWidget employee={employeeWithMetrics} jobs={jobs} allSkills={allSkills} trainingResources={trainingResources} />)}
            </div>
            {isEfficiencyModalOpen && (<EfficiencyAnalysisModal jobs={jobs} employeeName={employee.name} onClose={() => setEfficiencyModalOpen(false)} />)}
            {isReworkModalOpen && (<ReworkAnalysisModal jobs={jobs} employeeName={employee.name} onClose={() => setReworkModalOpen(false)} />)}
        </>
    );
};

export default EmployeeIntelligencePage;
