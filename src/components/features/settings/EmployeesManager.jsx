import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, deleteEmployee, getDepartments } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';

const EmployeesManager = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
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

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !selectedDeptId) {
      alert("Please enter an employee name and select a department.");
      return;
    }
    try {
      await addEmployee({ name: newEmployeeName, departmentId: selectedDeptId });
      setNewEmployeeName('');
      setSelectedDeptId('');
      fetchData();
    } catch (error) {
      console.error("Error adding employee:", error);
      alert("Failed to add employee.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await deleteEmployee(id);
        fetchData();
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Failed to delete employee.");
      }
    }
  };

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : 'Unknown';
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Employees</h3>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
        <Input
          label="Employee Name"
          name="newEmployee"
          value={newEmployeeName}
          onChange={(e) => setNewEmployeeName(e.target.value)}
          placeholder="New employee name..."
        />
        {/* --- FIX APPLIED TO DROPDOWN --- */}
        <Dropdown
          label="Department"
          name="department"
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          options={departments || []}
          placeholder="Select a department..."
        />
        <Button type="submit" variant="primary">Add Employee</Button>
      </form>

      <div className="space-y-3">
        {/* --- FIX APPLIED TO THE LIST MAP --- */}
        {loading ? <p>Loading...</p> : (employees || []).map(emp => (
          <div key={emp.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-200">
              {emp.name} - <span className="text-gray-400 text-sm">{getDepartmentName(emp.departmentId)}</span>
            </p>
            <Button onClick={() => handleDelete(emp.id)} variant="danger" className="py-1 px-3 text-xs">
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeesManager;