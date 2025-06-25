import React, { useState, useEffect } from 'react';
// MainLayout import removed
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import { getEmployees, getCompletedJobsInRange } from '../api/firestore';
import { calculateJobDuration } from '../utils/jobUtils';

const PayrollPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payrollResults, setPayrollResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployeesData = async () => {
      try {
        const fetchedEmployees = await getEmployees();
        setEmployees(fetchedEmployees);
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
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    if (startDateTime > endDateTime) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError(null);
    setPayrollResults([]);

    try {
      const jobsInPeriod = await getCompletedJobsInRange(startDateTime, endDateTime);
      const employeesToProcess = selectedEmployeeId ? employees.filter(e => e.id === selectedEmployeeId) : employees;
      
      const results = employeesToProcess.map(employee => {
        const employeeJobs = jobsInPeriod.filter(job => job.employeeId === employee.id);
        const totalMinutes = employeeJobs.reduce((total, job) => {
          const duration = calculateJobDuration(job, job.completedAt.toDate());
          return total + (duration ? duration.totalMinutes : 0);
        }, 0);
        
        const totalHours = totalMinutes / 60;
        const totalPay = totalHours * (employee.hourlyRate || 0);

        return {
          id: employee.id,
          name: employee.name,
          totalHours,
          totalPay
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

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Payroll Management</h2>
      
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Calculate Payroll Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
          <Dropdown
            label="Select Employee (Optional)"
            name="employeeFilter"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            options={[{ id: '', name: 'All Employees' }, ...employees]}
            placeholder="Filter by employee..."
          />
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button onClick={handleCalculatePayroll} disabled={loading} className="md:col-span-1">
            {loading ? 'Calculating...' : 'Calculate Payroll'}
          </Button>
        </div>
        {error && <p className="text-red-400 text-center">{error}</p>}
      </div>

      {payrollResults.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Payroll Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="p-3 text-sm font-semibold text-gray-400">Employee</th>
                  <th className="p-3 text-sm font-semibold text-gray-400">Total Hours</th>
                  <th className="p-3 text-sm font-semibold text-gray-400">Total Pay</th>
                </tr>
              </thead>
              <tbody>
                {payrollResults.map(result => (
                  <tr key={result.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-3 text-gray-200">{result.name}</td>
                    <td className="p-3 text-gray-300">{result.totalHours.toFixed(2)}</td>
                    <td className="p-3 text-green-400 font-bold">R {result.totalPay.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPage;