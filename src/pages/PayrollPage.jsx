import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown'; // Assuming you might use this for employee selection
import { getEmployees } from '../api/firestore'; // Import getEmployees as we'll need employee data

const PayrollPage = () => {
  const [employees, setEmployees] = useState([]); // State to store employee data
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(''); // For employee filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [payrollResults, setPayrollResults] = useState([]); // To store calculated payroll
  const [loading, setLoading] = useState(false); // Reset loading state for actual feature
  const [error, setError] = useState(null); // Reset error state

  // Fetch employees on component mount
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
    // Basic validation
    if (!startDate || !endDate) {
      setError("Please select both a start and end date.");
      return;
    }
    // Convert date strings to Date objects for Firestore queries
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    // Adjust end date to include the entire day
    endDateTime.setHours(23, 59, 59, 999);

    if (startDateTime > endDateTime) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError(null);
    setPayrollResults([]); // Clear previous results

    try {
      // For now, we're still just confirming the API call.
      // The actual logic for calculation and using selectedEmployeeId will come next.
      // We will integrate getCompletedJobsInRange here in the next step.

      // Placeholder: In the next step, we'll actually fetch the jobs and do calculations
      console.log(`Calculating payroll for employee ${selectedEmployeeId || 'All'} from ${startDate} to ${endDate}`);
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      
      setPayrollResults([ // Mock data for now
        { id: 'mock1', name: 'Mock Employee 1', totalHours: 40, totalPay: 6000 },
        { id: 'mock2', name: 'Mock Employee 2', totalHours: 35, totalPay: 5250 }
      ]);

    } catch (err) {
      console.error("Error calculating payroll:", err);
      setError("Failed to calculate payroll. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-white">Payroll Management</h2>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Calculate Payroll Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
            <Dropdown
              label="Select Employee (Optional)"
              name="employeeFilter"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              options={[{ id: '', name: 'All Employees' }, ...employees]} // Add "All Employees" option
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
                      <td className="p-3 text-gray-300">{result.totalHours.toFixed(1)}</td>
                      <td className="p-3 text-green-400 font-bold">R {result.totalPay.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PayrollPage;
