// src/pages/KanbanPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { listenToJobCards, getEmployees } from '../api/firestore';
import KanbanBoard from '../components/features/kanban/KanbanBoard';
import Dropdown from '../components/ui/Dropdown';
import Input from '../components/ui/Input';
import { LayoutGrid } from 'lucide-react';

const KanbanPage = () => {
    const [jobs, setJobs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ employeeId: '', searchTerm: '' });

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const fetchedEmployees = await getEmployees();
                setEmployees(fetchedEmployees);
                
                // We need all jobs for the Kanban board, not paginated
                const unsubscribe = listenToJobCards((allJobs) => {
                    // Note: listenToJobCards without pagination returns the array directly
                    setJobs(allJobs);
                    setLoading(false);
                });
                return unsubscribe;

            } catch (error) {
                console.error("Error fetching data for Kanban board:", error);
                setLoading(false);
            }
        };
        
        const unsubscribePromise = fetchInitialData();
        return () => { unsubscribePromise.then(unsub => unsub && unsub()); };
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            const employeeMatch = !filters.employeeId || job.employeeId === filters.employeeId;
            const searchMatch = !filters.searchTerm || 
                job.partName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                job.jobId.toLowerCase().includes(filters.searchTerm.toLowerCase());
            return employeeMatch && searchMatch;
        });
    }, [jobs, filters]);

    if (loading) {
        return <p className="text-center text-gray-400">Loading Kanban Board...</p>;
    }

    return (
        // --- UPDATED STRUCTURE ---
        // The parent div now controls the overall layout and scrolling,
        // preventing the nested scroll container issue.
        <div className="flex flex-col h-full space-y-6">
            <div className="flex-shrink-0">
                <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                    <LayoutGrid />
                    Workshop Kanban Board
                </h2>
                <p className="text-gray-400 mt-1">Drag and drop jobs to update their status.</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        name="searchTerm"
                        placeholder="Search by Job ID or Part Name..."
                        value={filters.searchTerm}
                        onChange={handleFilterChange}
                    />
                    <Dropdown
                        name="employeeId"
                        options={employees}
                        value={filters.employeeId}
                        onChange={handleFilterChange}
                        placeholder="Filter by Employee..."
                    />
                </div>
            </div>

            {/* The KanbanBoard itself is now wrapped in a div that handles overflow */}
            <div className="flex-grow overflow-x-auto pb-4">
                <KanbanBoard jobs={filteredJobs} employees={employees} />
            </div>
        </div>
    );
};

export default KanbanPage;
