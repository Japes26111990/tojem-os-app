import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, getEmployees, getDepartments } from '../api/firestore';
import JobDetailsPanel from '../components/features/job_cards/JobDetailsPanel';
import Input from '../components/ui/Input';
import Dropdown from '../components/ui/Dropdown';
import Button from '../components/ui/Button';

const JobHistoryPage = () => {
  const [allJobs, setAllJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedJobId, setSelectedJobId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const [emps, depts] = await Promise.all([getEmployees(), getDepartments()]);
        setEmployees(emps);
        setDepartments(depts);

        const unsub = listenToJobCards(jobs => {
            const completedJobs = jobs.filter(j =>
                ['Complete', 'Issue', 'Archived - Issue'].includes(j.status)
            ).sort((a,b) => b.createdAt.seconds - a.createdAt.seconds); // Sort newest first
            setAllJobs(completedJobs);
            setLoading(false);
        });

        return () => unsub();
    };
    
    fetchData();
  }, []);

  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
        const searchMatch = searchTerm === '' || 
            job.partName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.jobId?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const deptMatch = !selectedDept || job.departmentId === selectedDept;
        const empMatch = !selectedEmp || job.employeeId === selectedEmp;
        
        const jobDate = job.completedAt?.toDate();
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if(start) start.setHours(0,0,0,0);
        if(end) end.setHours(23,59,59,999);

        const dateMatch = (!start || jobDate >= start) && (!end || jobDate <= end);

        return searchMatch && deptMatch && empMatch && dateMatch;
    });
  }, [allJobs, searchTerm, selectedDept, selectedEmp, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDept('');
    setSelectedEmp('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Job History</h1>
      
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Dropdown label="Filter by Department" options={departments} value={selectedDept} onChange={e => setSelectedDept(e.target.value)} placeholder="All Departments" />
            <Dropdown label="Filter by Employee" options={employees} value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} placeholder="All Employees" />
            <Input label="Search by Part Name or Job ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input label="Completed After (Start Date)" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <Input label="Completed Before (End Date)" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            <Button onClick={clearFilters} variant="secondary">Clear All Filters</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 bg-gray-900/50 p-4 rounded-lg max-h-[60vh] overflow-y-auto">
          {loading && <p className="text-gray-400">Loading job history...</p>}
          {!loading && filteredJobs.length === 0 && <p className="text-gray-400 text-center py-8">No jobs match the current filters.</p>}
          {!loading && filteredJobs.map(job => (
            <div
              key={job.id}
              onClick={() => setSelectedJobId(job.jobId)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                job.jobId === selectedJobId ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <p className="font-bold">{job.partName} ({job.jobId})</p>
              <p className="text-xs">{job.departmentName} — {job.status}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          {selectedJobId ? (
            <JobDetailsPanel jobId={selectedJobId} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select a job from the list to view its details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobHistoryPage;