import React, { useState, useEffect } from 'react';
// updateDocument is already imported which is great
import { getEmployees, addEmployee, deleteEmployee, getDepartments, updateDocument } from '../../../api/firestore'; 
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Award } from 'lucide-react'; // 1. Import an icon for the new button

// 2. Import the (soon to be created) modal component
import EmployeeSkillsModal from './EmployeeSkillsModal'; 

const EmployeesManager = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [newEmployee, setNewEmployee] = useState({ name: '', departmentId: '', hourlyRate: '' });
    const [loading, setLoading] = useState(true);
    const [editingEmployeeId, setEditingEmployeeId] = useState(null);

    // 3. Add state for the skills modal
    const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewEmployee(prev => ({ ...prev, [name]: value }));
    };

    const handleAddOrUpdate = async (e) => {
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
                await updateDocument('employees', editingEmployeeId, dataToSave);
                alert("Employee updated successfully!");
            } else {
                await addEmployee(dataToSave);
                alert("Employee added successfully!");
            }
            setNewEmployee({ name: '', departmentId: '', hourlyRate: '' });
            setEditingEmployeeId(null);
            fetchData();
        } catch (error) {
            console.error("Error saving employee:", error);
            alert(`Failed to ${editingEmployeeId ? 'update' : 'add'} employee.`);
        }
    };

    const handleEdit = (employee) => {
        setNewEmployee({ 
            name: employee.name, 
            departmentId: employee.departmentId, 
            hourlyRate: employee.hourlyRate || ''
        });
        setEditingEmployeeId(employee.id);
    };

    const handleCancelEdit = () => {
        setNewEmployee({ name: '', departmentId: '', hourlyRate: '' });
        setEditingEmployeeId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure?")) {
            await deleteEmployee(id);
            fetchData();
        }
    };

    // 4. Create a handler to open the skills modal
    const handleManageSkillsClick = (employee) => {
        setSelectedEmployee(employee);
        setIsSkillsModalOpen(true);
    };

    const getDepartmentName = (deptId) => departments.find(d => d.id === deptId)?.name || 'Unknown';

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Employees</h3>
            <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
                <Input
                    label="Employee Name"
                    name="name"
                    value={newEmployee.name}
                    onChange={handleInputChange}
                    placeholder={editingEmployeeId ? "Edit employee name..." : "New employee name..."}
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
                <div className="flex items-center gap-2">
                    {editingEmployeeId && (
                        <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" variant="primary" className="flex-grow">
                        {editingEmployeeId ? "Update Employee" : "Add Employee"}
                    </Button>
                </div>
            </form>

            <div className="space-y-3">
                {loading ? (
                    <p className="text-gray-400">Loading...</p>
                ) : (employees || []).map(emp => (
                    <div key={emp.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-md">
                        <div>
                            <p className="text-gray-200">
                                {emp.name} - <span className="text-gray-400 text-sm">{getDepartmentName(emp.departmentId)}</span>
                                <span className="text-blue-400 font-mono text-sm ml-4">R{(emp.hourlyRate || 0).toFixed(2)}/hr</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* 5. Add the new "Manage Skills" button */}
                            <Button onClick={() => handleManageSkillsClick(emp)} variant="secondary" size="sm">
                                <Award size={16} className="mr-1" /> Manage Skills
                            </Button>
                            <Button onClick={() => handleEdit(emp)} variant="secondary" size="sm">
                                Edit
                            </Button>
                            <Button onClick={() => handleDelete(emp.id)} variant="danger" size="sm">Delete</Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 6. Add the modal component, which will only appear when isSkillsModalOpen is true */}
            {isSkillsModalOpen && selectedEmployee && (
                <EmployeeSkillsModal
                    employee={selectedEmployee}
                    onClose={() => setIsSkillsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default EmployeesManager;