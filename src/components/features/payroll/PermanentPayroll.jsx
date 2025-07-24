// src/components/features/payroll/PermanentPayroll.jsx (REFACTORED)
// This component is now highly efficient as it queries the pre-calculated `employeeDailyLogs` collection
// instead of processing thousands of raw scan events on the client-side.

import React, { useState, useEffect } from 'react';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { getDocs, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import { getEmployees } from '../../../api/firestore';
import { ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const PermanentPayroll = () => {
    const [employees, setEmployees] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [payrollResults, setPayrollResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);

    // Fetch the list of permanent employees once on component mount.
    useEffect(() => {
        const fetchEmployeesData = async () => {
            try {
                const fetchedEmployees = await getEmployees();
                setEmployees(fetchedEmployees.filter(e => e.employeeType === 'permanent'));
            } catch (err) {
                console.error("Error fetching employees:", err);
                setError("Failed to load employee data.");
                toast.error("Failed to load employee data.");
            }
        };
        fetchEmployeesData();
    }, []);

    /**
     * Handles the calculation of payroll for the selected date range.
     * Queries the pre-aggregated `employeeDailyLogs` collection.
     */
    const handleCalculatePayroll = async () => {
        if (!startDate || !endDate) {
            setError("Please select both a start and end date.");
            toast.error("Please select both a start and end date.");
            return;
        }
        setLoading(true);
        setError(null);
        setPayrollResults(null);

        try {
            // THE KEY CHANGE: Query the new, clean, and pre-calculated collection.
            // This query is fast and scalable.
            const logsQuery = query(
                collection(db, 'employeeDailyLogs'),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date', 'asc')
            );
            const logsSnapshot = await getDocs(logsQuery);
            const dailyLogs = logsSnapshot.docs.map(d => d.data());
            
            // Map over your list of employees to structure the results.
            const results = employees.map(employee => {
                const employeeLogs = dailyLogs.filter(log => log.employeeId === employee.id);
                const totalHours = employeeLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
                const totalPay = totalHours * (employee.hourlyRate || 0);

                return {
                    ...employee,
                    totalHours,
                    totalPay,
                    dailyBreakdown: employeeLogs.map(log => ({
                        date: new Date(log.date),
                        startTime: log.startTime.toDate(),
                        endTime: log.endTime.toDate(),
                        totalHours: log.totalHours || 0,
                    })),
                };
            });

            setPayrollResults(results);
            toast.success("Payroll report generated successfully.");

        } catch (err) {
            console.error("Error calculating payroll:", err);
            setError("Failed to calculate payroll. Check console for details.");
            toast.error("An error occurred while generating the report.");
        } finally {
            setLoading(false);
        }
    };
    
    // Toggles the visibility of the detailed daily breakdown for an employee.
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
                                                            <span className="text-gray-300">In: {day.startTime.toLocaleTimeString()}</span>
                                                            <span className="text-gray-300">Out: {day.endTime.toLocaleTimeString()}</span>
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
