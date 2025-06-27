// src/components/features/payroll/PermanentPayroll.jsx (Final Correct Version)

import React, { useState, useEffect } from 'react';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { getEmployees } from '../../../api/firestore';
import { getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

// --- HELPER FUNCTIONS FOR PAYROLL LOGIC ---

// Calculates the duration of a workday in hours, excluding breaks
const calculateWorkdayHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const breakMinutes = 45; // 15 min tea + 30 min lunch
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const workMinutes = Math.max(0, durationMinutes - breakMinutes);
    return workMinutes / 60;
};

// Checks if an employee was late or left early
const checkPunctuality = (date, startTime, endTime) => {
    const dayOfWeek = date.getDay(); // Sunday = 0, Friday = 5
    const standardStartTime = new Date(date.getTime());
    standardStartTime.setHours(7, 0, 0, 0);

    const standardEndTime = new Date(date.getTime());
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
        standardEndTime.setHours(17, 0, 0, 0);
    } else { // Friday
        standardEndTime.setHours(15, 45, 0, 0);
    }

    const isLate = startTime > standardStartTime;
    const leftEarly = endTime < standardEndTime;

    return { isLate, leftEarly };
};


const PermanentPayroll = () => {
    const [employees, setEmployees] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [payrollResults, setPayrollResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);

    useEffect(() => {
        const fetchEmployeesData = async () => {
            try {
                const fetchedEmployees = await getEmployees();
                // We only care about permanent employees for this page
                setEmployees(fetchedEmployees.filter(e => e.employeeType === 'permanent'));
            } catch (err) {
                console.error("Error fetching employees:", err);
                setError("Failed to load employee data.");
            }
        };
        fetchEmployeesData();
    }, []);

    const handleCalculatePayroll = async () => {
        if (!startDate || !endDate) {
            setError("Please select both a start and end date.");
            return;
        }
        setLoading(true);
        setError(null);
        setPayrollResults(null);

        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);

        try {
            // Fetch all scan events within the date range
            const scanEventsQuery = query(
                collection(db, 'scanEvents'),
                where('timestamp', '>=', startDateTime),
                where('timestamp', '<=', endDateTime),
                orderBy('timestamp', 'asc')
            );
            const scanEventsSnapshot = await getDocs(scanEventsQuery);
            const scanEvents = scanEventsSnapshot.docs.map(d => ({...d.data(), timestamp: d.data().timestamp.toDate()}));
            
            // Group scans by employee and then by day
            const dailyScans = {};
            for (const event of scanEvents) {
                if (!event.employeeId) continue;
                const dateStr = event.timestamp.toISOString().split('T')[0];
                const key = `${event.employeeId}_${dateStr}`;
                if (!dailyScans[key]) {
                    dailyScans[key] = {
                        employeeId: event.employeeId,
                        date: new Date(dateStr),
                        scans: []
                    };
                }
                dailyScans[key].scans.push(event.timestamp);
            }

            // Process each day's scans to get start/end times
            const dailyTimeEntries = Object.values(dailyScans).map(dayData => {
                const firstScan = dayData.scans[0];
                const lastScan = dayData.scans[dayData.scans.length - 1];
                const punctuality = checkPunctuality(dayData.date, firstScan, lastScan);
                return {
                    employeeId: dayData.employeeId,
                    date: dayData.date,
                    startTime: firstScan,
                    endTime: lastScan,
                    totalHours: calculateWorkdayHours(firstScan, lastScan),
                    ...punctuality
                };
            });

            // Aggregate results per employee
            const results = employees.map(employee => {
                const employeeEntries = dailyTimeEntries.filter(e => e.employeeId === employee.id);
                const totalHours = employeeEntries.reduce((sum, entry) => sum + entry.totalHours, 0);
                const totalPay = totalHours * (employee.hourlyRate || 0);

                return {
                    ...employee,
                    totalHours,
                    totalPay,
                    dailyBreakdown: employeeEntries.sort((a,b) => a.date - b.date),
                };
            });

            setPayrollResults(results);

        } catch (err) {
            console.error("Error calculating payroll:", err);
            setError("Failed to calculate payroll. Check console for details.");
        } finally {
            setLoading(false);
        }
    };
    
    const toggleEmployeeDetails = (employeeId) => {
        setExpandedEmployeeId(prevId => (prevId === employeeId ? null : employeeId));
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Calculate Payroll Period</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
                    <Input label="Period Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Input label="Period End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <Button onClick={handleCalculatePayroll} disabled={loading}>
                        {loading ? 'Calculating...' : 'Generate Hours Report'}
                    </Button>
                </div>
                {error && <p className="text-red-400 text-center">{error}</p>}
            </div>

            {payrollResults && (
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-900/50">
                            <tr className="border-b border-gray-600">
                                <th className="p-3 font-semibold text-gray-400"></th>
                                <th className="p-3 font-semibold text-gray-400">Employee</th>
                                <th className="p-3 font-semibold text-gray-400">Total Hours</th>
                                <th className="p-3 font-semibold text-gray-400">Total Pay</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payrollResults.map(result => (
                                <React.Fragment key={result.id}>
                                    <tr onClick={() => toggleEmployeeDetails(result.id)} className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer">
                                        <td className="p-3 text-center">
                                            {expandedEmployeeId === result.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                        </td>
                                        <td className="p-3 text-gray-200 font-medium">{result.name}</td>
                                        <td className="p-3 text-gray-300 font-mono">{result.totalHours.toFixed(2)}</td>
                                        <td className="p-3 text-green-400 font-bold font-mono">R {result.totalPay.toFixed(2)}</td>
                                    </tr>
                                    {expandedEmployeeId === result.id && (
                                        <tr className="bg-gray-900">
                                            <td colSpan="4" className="p-4">
                                                <h4 className="font-bold text-white mb-2">Daily Breakdown</h4>
                                                <div className="space-y-2">
                                                    {result.dailyBreakdown.length > 0 ? result.dailyBreakdown.map(day => (
                                                        <div key={day.date.toISOString()} className="grid grid-cols-4 gap-4 bg-gray-800 p-2 rounded-md">
                                                            <span className="font-semibold text-gray-300">{day.date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                                                            <span className={day.isLate ? 'text-red-400' : 'text-gray-300'}>In: {day.startTime.toLocaleTimeString()} {day.isLate && <AlertCircle size={14} className="inline ml-1"/>}</span>
                                                            <span className={day.leftEarly ? 'text-red-400' : 'text-gray-300'}>Out: {day.endTime.toLocaleTimeString()} {day.leftEarly && <AlertCircle size={14} className="inline ml-1"/>}</span>
                                                            <span>Hours: {day.totalHours.toFixed(2)}</span>
                                                        </div>
                                                    )) : <p className="text-gray-500">No work logged in this period.</p>}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PermanentPayroll;
