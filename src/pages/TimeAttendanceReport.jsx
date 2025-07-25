// src/pages/TimeAttendanceReport.jsx (CORRECTED & ENHANCED)
// 1. Fixed a bug where date filtering was not being applied correctly.
// 2. Added a live calculation for the current day's "Total Hours" so you don't have to wait for the nightly process.

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../api/firebase'; 
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { CSVLink } from 'react-csv';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

const TimeAttendanceReport = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchWorkLogs = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'employeeDailyLogs'), orderBy('date', 'desc'));
                const querySnapshot = await getDocs(q);
                
                // Fetch the raw data, keeping the timestamp objects for live calculation
                const logsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setLogs(logsData);
            } catch (error) {
                console.error("Error fetching time attendance logs:", error);
                toast.error("Could not fetch time logs. Check permissions and collection name.");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkLogs();
    }, []);

    // This logic now correctly filters the logs based on the selected dates.
    const filteredLogs = useMemo(() => {
        if (!startDate && !endDate) {
            return logs;
        }
        return logs.filter(log => {
            // Use simple string comparison for dates to avoid timezone issues.
            if (startDate && log.date < startDate) return false;
            if (endDate && log.date > endDate) return false;
            return true;
        });
    }, [logs, startDate, endDate]);


    // This new section processes the filtered logs for display, adding live calculations.
    const displayLogs = useMemo(() => {
        return filteredLogs.map(log => {
            let displayTotalHours = log.totalHours || 0;

            // If the log is for today and not yet finalized, calculate hours live.
            if (log.status === 'pending' && log.startTime && log.endTime) {
                const startTime = log.startTime.toDate();
                const endTime = log.endTime.toDate();
                const breakMinutes = 45;
                const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                const workMinutes = Math.max(0, durationMinutes - breakMinutes);
                displayTotalHours = workMinutes / 60;
            }

            return {
                id: log.id,
                date: log.date,
                employeeName: log.employeeName,
                startTime: log.startTime ? log.startTime.toDate().toLocaleTimeString('en-ZA') : 'N/A',
                endTime: log.endTime ? log.endTime.toDate().toLocaleTimeString('en-ZA') : 'Review Needed',
                totalHours: displayTotalHours,
            };
        });
    }, [filteredLogs]);


    const csvHeaders = [
        { label: "Date", key: "date" },
        { label: "Employee Name", key: "employeeName" },
        { label: "Clock In", key: "startTime" },
        { label: "Clock Out", key: "endTime" },
        { label: "Total Hours", key: "totalHours" }
    ];

    const csvData = displayLogs.map(log => ({
        ...log,
        totalHours: log.totalHours.toFixed(2)
    }));

    if (loading) {
        return <p className="text-center text-gray-400">Loading attendance data...</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Automated Time & Attendance Report</h2>
                    <p className="text-gray-400 -mt-1">This data is captured automatically from the first and last job scans of the day.</p>
                </div>
                <CSVLink
                    data={csvData}
                    headers={csvHeaders}
                    filename={`time_attendance_${startDate}_to_${endDate}.csv`}
                    className="inline-block"
                >
                    <Button variant="secondary">
                        <Download size={16} className="mr-2" />
                        Export to CSV
                    </Button>
                </CSVLink>
            </div>
            
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
                        {displayLogs.length > 0 ? (
                            displayLogs.map(log => (
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
