// src/components/features/floorplan/FloorPlan.jsx (NEW FILE)

import React, { useMemo } from 'react';
import { HardHat } from 'lucide-react';

// A component to represent a single job on the floor plan
const JobMarker = ({ job }) => (
    <div 
        className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-md shadow-lg flex items-center gap-1 animate-fade-in"
        title={`${job.partName} (${job.jobId}) - ${job.employeeName}`}
    >
        <HardHat size={10} />
        <span className="truncate">{job.partName}</span>
    </div>
);

// A component to represent a department area on the floor plan
const DepartmentArea = ({ department, jobs }) => (
    <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-xl p-4 min-h-[200px]">
        <h3 className="font-bold text-white border-b border-gray-600 pb-2 mb-3">{department.name}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {jobs.map(job => (
                <JobMarker key={job.id} job={job} />
            ))}
        </div>
    </div>
);

const FloorPlan = ({ jobs, departments }) => {
    // Filter for only jobs that are currently "In Progress"
    const activeJobs = useMemo(() => {
        return jobs.filter(job => job.status === 'In Progress');
    }, [jobs]);

    // Group the active jobs by their department ID
    const jobsByDepartment = useMemo(() => {
        return activeJobs.reduce((acc, job) => {
            const deptId = job.departmentId;
            if (!acc[deptId]) {
                acc[deptId] = [];
            }
            acc[deptId].push(job);
            return acc;
        }, {});
    }, [activeJobs]);

    return (
        <div className="space-y-6">
            {departments.map(dept => (
                <DepartmentArea 
                    key={dept.id}
                    department={dept}
                    jobs={jobsByDepartment[dept.id] || []}
                />
            ))}
            {departments.length === 0 && (
                <p className="text-center text-gray-500 py-10">No departments found. Please add departments in Settings.</p>
            )}
        </div>
    );
};

export default FloorPlan;
