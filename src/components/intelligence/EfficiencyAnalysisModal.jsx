// FILE: src/components/intelligence/EfficiencyAnalysisModal.jsx (NEW FILE - NO CHANGES HERE)

import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateJobDuration } from '../../utils/jobUtils';

const EfficiencyAnalysisModal = ({ jobs, employeeName, onClose }) => {
    
    const analysisData = useMemo(() => {
        if (!jobs || jobs.length === 0) return [];

        const jobsByDept = jobs.reduce((acc, job) => {
            if (!job.departmentName) return acc;
            if (!acc[job.departmentName]) {
                acc[job.departmentName] = [];
            }
            acc[job.departmentName].push(job);
            return acc;
        }, {});

        const analysis = Object.entries(jobsByDept).map(([departmentName, deptJobs]) => {
            const completedJobsWithTime = deptJobs.filter(j => j.status === 'Complete' && j.estimatedTime > 0 && j.startedAt && j.completedAt);
            
            if (completedJobsWithTime.length === 0) {
                return null;
            }

            const totalEfficiencyRatio = completedJobsWithTime.reduce((sum, job) => {
                const duration = calculateJobDuration(job, job.completedAt.toDate());
                if (duration && duration.totalMinutes > 0) {
                    const actualMinutes = duration.totalMinutes;
                    const estimatedMinutes = job.estimatedTime;
                    return sum + (estimatedMinutes / actualMinutes);
                }
                return sum;
            }, 0);

            const avgEfficiency = (totalEfficiencyRatio / completedJobsWithTime.length) * 100;

            return {
                department: departmentName,
                efficiency: Math.round(avgEfficiency),
                jobCount: completedJobsWithTime.length
            };
        }).filter(Boolean);

        return analysis;

    }, [jobs]);

    return (
        <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Efficiency Analysis</h2>
                        <p className="text-sm text-gray-400">For {employeeName}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-2">
                        <X size={20} />
                    </Button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {analysisData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={analysisData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                                <XAxis type="number" stroke="#9ca3af" unit="%" />
                                <YAxis type="category" dataKey="department" stroke="#9ca3af" width={120} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }}
                                    formatter={(value, name, props) => [`${value}% (${props.payload.jobCount} jobs)`, "Efficiency"]}
                                />
                                <Legend />
                                <Bar dataKey="efficiency" fill="#8b5cf6" name="Average Efficiency"/>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500 py-8">
                            Not enough completed jobs with time estimates to perform an efficiency analysis for this employee.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EfficiencyAnalysisModal;