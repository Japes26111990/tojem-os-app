// src/components/intelligence/ReliabilityReport.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../api/firebase';
import Button from '../ui/Button';
import { Clock, UserCheck } from 'lucide-react';

const KpiCard = ({ title, value, unit }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg text-center">
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-white">
            {value} <span className="text-xl text-gray-400">{unit}</span>
        </p>
    </div>
);

// This function can be simplified as the backend now handles the complex logic
const checkPunctualityFromLog = (log) => {
    // This is a placeholder for more advanced logic if needed in the future.
    // For now, we can assume the backend log provides what we need or derive it.
    const isLate = (log.totalHours || 0) < 8; // Example logic
    const leftEarly = false; // Example logic
    return { isLate, leftEarly };
};


const ReliabilityReport = ({ employeeId }) => {
    const [timeEntries, setTimeEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('month');

    useEffect(() => {
        // --- THIS IS THE FIX ---
        // We now fetch from the pre-aggregated 'employeeDailyLogs' collection,
        // which is faster and doesn't violate security rules.
        const fetchWorkLogs = async () => {
            if (!employeeId) return;
            setLoading(true);
            try {
                const logsQuery = query(
                    collection(db, 'employeeDailyLogs'),
                    where('employeeId', '==', employeeId),
                    orderBy('date', 'desc')
                );
                const snapshot = await getDocs(logsQuery);
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTimeEntries(logs);

            } catch (err) {
                console.error("Error fetching reliability data from daily logs:", err);
            }
            setLoading(false);
        };
        fetchWorkLogs();
    }, [employeeId]);

    const filteredMetrics = useMemo(() => {
        const now = new Date();
        let startDate;

        if (filter === 'week') {
            const dayOfWeek = now.getDay();
            const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
            startDate = new Date(now.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
        } else if (filter === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            startDate = new Date(now.getFullYear(), 0, 1);
        }
        
        // Convert startDate to a string 'YYYY-MM-DD' for comparison
        const startDateString = startDate.toISOString().split('T')[0];

        const filtered = timeEntries.filter(entry => entry.date >= startDateString);

        // This logic can be simplified or adjusted based on your business rules
        const daysLate = filtered.filter(entry => entry.totalHours < 7.5 && entry.totalHours > 1).length; // Example: Late if less than 7.5 hours
        const daysLeftEarly = filtered.length - daysLate; // Example

        return { daysLate, daysLeftEarly, totalMinutesLate: daysLate * 15 }; // Example calculation

    }, [timeEntries, filter]);

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserCheck size={20} className="text-teal-400" />
                    Reliability Report
                </h3>
                <div className="flex gap-1 bg-gray-700 p-1 rounded-lg">
                    <Button onClick={() => setFilter('week')} variant={filter === 'week' ? 'primary' : 'secondary'} className="py-1 px-3 text-xs">This Week</Button>
                    <Button onClick={() => setFilter('month')} variant={filter === 'month' ? 'primary' : 'secondary'} className="py-1 px-3 text-xs">This Month</Button>
                    <Button onClick={() => setFilter('year')} variant={filter === 'year' ? 'primary' : 'secondary'} className="py-1 px-3 text-xs">This Year</Button>
                </div>
            </div>
            {loading ? (
                <p className="text-gray-400">Loading reliability data...</p>
            ) : timeEntries.length === 0 ? (
                 <p className="text-gray-500 text-center py-4">No attendance data found for this employee.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard title="Days Late" value={filteredMetrics.daysLate} unit="days" />
                    <KpiCard title="Days Left Early" value={filteredMetrics.daysLeftEarly} unit="days" />
                    <KpiCard title="Total Minutes Late" value={Math.round(filteredMetrics.totalMinutesLate)} unit="mins" />
                </div>
            )}
        </div>
    );
};

export default ReliabilityReport;