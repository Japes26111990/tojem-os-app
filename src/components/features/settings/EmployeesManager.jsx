import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, deleteEmployee, getDepartments } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';

const EmployeesManager = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  // --- UPDATED: State is now an object for the whole form ---
  const [newEmployee, setNewEmployee] = useState({ name: '', departmentId: '', hourlyRate: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedEmployees, fetchedDepartments] = await Promise.all([
      getEmployees(),
      getDepartments()
    ]);
    setEmployees(fetchedEmployees);
    setDepartments(fetchedDepartments);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- UPDATED: Handle multiple inputs ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmployee.name.trim() || !newEmployee.departmentId) {
      alert("Please enter an employee name and select a department.");
      return;
    }
    try {
      // Pass the whole object, converting rate to a number
      await addEmployee({ 
          ...newEmployee, 
          hourlyRate: Number(newEmployee.hourlyRate) || 0 
      });
      // Reset the form state
      setNewEmployee({ name: '', departmentId: '', hourlyRate: '' });
      fetchData();
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      await deleteEmployee(id);
      fetchData();
    }
  };

  const getDepartmentName = (deptId) => departments.find(d => d.id === deptId)?.name || 'Unknown';

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Employees</h3>
      {/* --- UPDATED: Form now includes Hourly Rate --- */}
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
        <Input
          label="Employee Name"
          name="name"
          value={newEmployee.name}
          onChange={handleInputChange}
          placeholder="New employee name..."
        />
        <Dropdown
          label="Department"
          name="departmentId"
          value={newEmployee.departmentId}
          onChange={handleInputChange}
          options={departments || []}
          placeholder="Select a department..."
        />
        <Input
          label="Hourly Rate (R)"
          name="hourlyRate"
          type="number"
          value={newEmployee.hourlyRate}
          onChange={handleInputChange}
          placeholder="e.g., 150.50"
        />
        <Button type="submit" variant="primary">Add Employee</Button>
      </form>

      <div className="space-y-3">
        {loading ? <p>Loading...</p> : (employees || []).map(emp => (
          <div key={emp.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-200">
              {emp.name} - <span className="text-gray-400 text-sm">{getDepartmentName(emp.departmentId)}</span>
              {/* --- UPDATED: Display the rate --- */}
              <span className="text-blue-400 font-mono text-sm ml-4">R{(emp.hourlyRate || 0).toFixed(2)}/hr</span>
            </p>
            <Button onClick={() => handleDelete(emp.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeesManager;