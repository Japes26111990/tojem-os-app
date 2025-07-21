// src/pages/TimeAttendanceReport.jsx (NEW FILE)

import React, { useState, useEffect } from 'react';
import { db } from '../api/firebase'; 
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import Input from '../components/ui/Input';

const TimeAttendanceReport = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchWorkLogs = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'dailyWorkLogs'), orderBy('date', 'desc'));
                const querySnapshot = await getDocs(q);
                
                const logsData = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        startTime: data.startTime ? data.startTime.toDate().toLocaleTimeString('en-ZA') : 'N/A',
                        endTime: data.endTime ? data.endTime.toDate().toLocaleTimeString('en-ZA') : 'Still Clocked In',
                    };
                });
                setLogs(logsData);
            } catch (error) {
                console.error("Error fetching time attendance logs:", error);
                alert("Could not fetch time logs.");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        if (!startDate && !endDate) return true;
        const logDate = new Date(log.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && logDate < start) return false;
        if (end && logDate > end) return false;
        return true;
    });

    if (loading) {
        return <p className="text-center text-gray-400">Loading attendance data...</p>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Automated Time & Attendance Report</h2>
            <p className="text-gray-400 -mt-4">This data is captured automatically from the first and last job scans of the day.</p>
            
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-900/50">
                        <tr className="border-b border-gray-600">
                            <th className="p-3 font-semibold text-gray-400">Date</th>
                            <th className="p-3 font-semibold text-gray-400">Employee Name</th>
                            <th className="p-3 font-semibold text-gray-400">Clock In Time</th>
                            <th className="p-3 font-semibold text-gray-400">Clock Out Time</th>
                            <th className="p-3 font-semibold text-gray-400 text-right">Total Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map(log => (
                                <tr key={log.id} className="border-b border-gray-700">
                                    <td className="p-3 text-gray-300">{log.date}</td>
                                    <td className="p-3 text-white font-medium">{log.employeeName}</td>
                                    <td className="p-3 text-gray-300">{log.startTime}</td>
                                    <td className="p-3 text-gray-300">{log.endTime}</td>
                                    <td className="p-3 text-white font-mono text-right">{log.totalHours > 0 ? log.totalHours.toFixed(2) : '--'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center p-8 text-gray-500">No attendance data found for the selected period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TimeAttendanceReport;
