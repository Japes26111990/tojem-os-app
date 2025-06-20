import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, deleteEmployee, getDepartments, updateDocument } from '../../../api/firestore'; // updateDocument imported
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';

const EmployeesManager = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [newEmployee, setNewEmployee] = useState({ name: '', departmentId: '', hourlyRate: '' });
    const [loading, setLoading] = useState(true);
    const [editingEmployeeId, setEditingEmployeeId] = useState(null); // State to track which employee is being edited

    const fetchData = async () => {
        setLoading(true);
        const [fetchedEmployees, fetchedDepartments] = await Promise.all([
            getEmployees(), // Fetches employees 
            getDepartments() // Fetches departments 
        ]);
        setEmployees(fetchedEmployees);
        setDepartments(fetchedDepartments);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewEmployee(prev => ({ ...prev, [name]: value }));
    };

    const handleAddOrUpdate = async (e) => { // Universal handler for add/update
        e.preventDefault();
        if (!newEmployee.name.trim() || !newEmployee.departmentId) {
            alert("Please enter an employee name and select a department.");
            return;
        }

        try {
            const dataToSave = { 
                ...newEmployee, 
                hourlyRate: Number(newEmployee.hourlyRate) || 0 
            };

            if (editingEmployeeId) {
                // If editingEmployeeId is set, update the existing employee
                await updateDocument('employees', editingEmployeeId, dataToSave); // Uses updateDocument for generic update 
                alert("Employee updated successfully!");
            } else {
                // Otherwise, add a new employee
                await addEmployee(dataToSave); // Adds new employee 
                alert("Employee added successfully!");
            }
            setNewEmployee({ name: '', departmentId: '', hourlyRate: '' }); // Reset form
            setEditingEmployeeId(null); // Exit editing mode
            fetchData(); // Refresh the list
        } catch (error) {
            console.error("Error saving employee:", error);
            alert(`Failed to ${editingEmployeeId ? 'update' : 'add'} employee.`);
        }
    };

    const handleEdit = (employee) => { // Handler for edit button click
        setNewEmployee({ 
            name: employee.name, 
            departmentId: employee.departmentId, 
            hourlyRate: employee.hourlyRate || '' // Ensure hourlyRate is a string for input value
        });
        setEditingEmployeeId(employee.id); // Set the ID of the employee being edited
    };

    const handleCancelEdit = () => { // Handler to cancel editing
        setNewEmployee({ name: '', departmentId: '', hourlyRate: '' });
        setEditingEmployeeId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure?")) {
            await deleteEmployee(id); // Deletes employee 
            fetchData(); // Refresh the list
        }
    };

    const getDepartmentName = (deptId) => departments.find(d => d.id === deptId)?.name || 'Unknown'; // Helper to get department name for display

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Employees</h3>
            <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
                <Input
                    label="Employee Name"
                    name="name"
                    value={newEmployee.name}
                    onChange={handleInputChange}
                    placeholder={editingEmployeeId ? "Edit employee name..." : "New employee name..."} // Dynamic placeholder
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
                {editingEmployeeId && ( // Show Cancel button only when in editing mode
                    <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" variant="primary">
                    {editingEmployeeId ? "Update Employee" : "Add Employee"} {/* Dynamic button text */}
                </Button>
            </form>
            <div className="space-y-3">
                {loading ? (
                    <p>Loading...</p>
                ) : (employees || []).map(emp => (
                    <div key={emp.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                        <p className="text-gray-200">
                            {emp.name} - <span className="text-gray-400 text-sm">{getDepartmentName(emp.departmentId)}</span>
                            <span className="text-blue-400 font-mono text-sm ml-4">R{(emp.hourlyRate || 0).toFixed(2)}/hr</span>
                        </p>
                        <div className="flex space-x-2"> {/* Container for action buttons */}
                            <Button onClick={() => handleEdit(emp)} variant="secondary" className="py-1 px-3 text-xs">
                                Edit
                            </Button>
                            <Button onClick={() => handleDelete(emp.id)} variant="danger" className="py-1 px-3 text-xs">Delete</Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmployeesManager;