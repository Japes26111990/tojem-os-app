// src/components/features/settings/EmployeesManager.jsx (Upgraded with Toasts)

import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, deleteEmployee, getDepartments, updateDocument } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Dropdown from '../../ui/Dropdown';
import { Award } from 'lucide-react';
import EmployeeSkillsModal from './EmployeeSkillsModal';
import toast from 'react-hot-toast';
import { SYSTEM_ROLES } from '../../../config';

const EmployeesManager = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingEmployeeId, setEditingEmployeeId] = useState(null);
    const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const initialFormState = {
        name: '',
        departmentId: '',
        employeeType: 'permanent',
        hourlyRate: '',
        paymentModel: 'per_kg',
        rate: '',
    };
    const [newEmployee, setNewEmployee] = useState(initialFormState);

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
            toast.error("Please enter a name and select a department.");
            return;
        }

        try {
            const dataToSave = { 
                name: newEmployee.name,
                departmentId: newEmployee.departmentId,
                employeeType: newEmployee.employeeType,
                hourlyRate: newEmployee.employeeType === 'permanent' ? (Number(newEmployee.hourlyRate) || 0) : 0,
                paymentModel: newEmployee.employeeType === 'subcontractor' ? newEmployee.paymentModel : null,
                rate: newEmployee.employeeType === 'subcontractor' ? (Number(newEmployee.rate) || 0) : 0,
            };

            if (editingEmployeeId) {
                await updateDocument('employees', editingEmployeeId, dataToSave);
                toast.success("Employee updated successfully!");
            } else {
                await addEmployee(dataToSave);
                toast.success("Employee added successfully!");
            }
            setNewEmployee(initialFormState);
            setEditingEmployeeId(null);
            fetchData();
        } catch (error) {
            console.error("Error saving employee:", error);
            toast.error(`Failed to ${editingEmployeeId ? 'update' : 'add'} employee.`);
        }
    };

    const handleEdit = (employee) => {
        setEditingEmployeeId(employee.id);
        setNewEmployee({
            name: employee.name || '',
            departmentId: employee.departmentId || '',
            employeeType: employee.employeeType || 'permanent',
            hourlyRate: employee.hourlyRate || '',
            paymentModel: employee.paymentModel || 'per_kg',
            rate: employee.rate || '',
        });
    };

    const handleCancelEdit = () => {
        setNewEmployee(initialFormState);
        setEditingEmployeeId(null);
    };

    const handleDelete = (id) => {
        toast((t) => (
            <span>
                Are you sure?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteEmployee(id)
                        .then(() => {
                            toast.success("Employee deleted.");
                            fetchData();
                        })
                        .catch(err => {
                            toast.error("Failed to delete employee.");
                            console.error(err);
                        });
                    toast.dismiss(t.id);
                }}>
                    Delete
                </Button>
                <Button variant="secondary" size="sm" className="ml-2" onClick={() => toast.dismiss(t.id)}>
                    Cancel
                </Button>
            </span>
        ), {
            icon: 'âš ï¸ ',
        });
    };

    const handleManageSkillsClick = (employee) => {
        setSelectedEmployee(employee);
        setIsSkillsModalOpen(true);
    };

    const getDepartmentName = (deptId) => departments.find(d => d.id === deptId)?.name || 'Unknown';

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Employees & Subcontractors</h3>
            <form onSubmit={handleAddOrUpdate} className="space-y-4 items-end mb-6 p-4 bg-gray-900/50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Name" name="name" value={newEmployee.name} onChange={handleInputChange} placeholder={editingEmployeeId ? "Edit name..." : "New name..."} />
                    <Dropdown label="Department" name="departmentId" value={newEmployee.departmentId} onChange={handleInputChange} options={departments || []} placeholder="Select department..." />
                    <Dropdown label="Employee Type" name="employeeType" value={newEmployee.employeeType} onChange={handleInputChange} options={[{id: 'permanent', name: 'Permanent'}, {id: 'subcontractor', name: 'Subcontractor'}]} />
                </div>
                
                {newEmployee.employeeType === 'permanent' && (
                    <div className="animate-fade-in">
                        <Input label="Hourly Rate (R)" name="hourlyRate" type="number" value={newEmployee.hourlyRate} onChange={handleInputChange} placeholder="e.g., 150.50" />
                    </div>
                )}

                {newEmployee.employeeType === 'subcontractor' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        <Dropdown label="Payment Model" name="paymentModel" value={newEmployee.paymentModel} onChange={handleInputChange} options={[{id: 'per_kg', name: 'Per Kilogram (kg)'}, {id: 'per_hour', name: 'Per Hour'}, {id: 'per_product', name: 'Per Product'}]} />
                        <Input label="Rate (R)" name="rate" type="number" value={newEmployee.rate} onChange={handleInputChange} placeholder="e.g., 40 for per_kg" />
                    </div>
                )}

                <div className="flex items-center gap-2 pt-4">
                    {editingEmployeeId && (
                        <Button type="button" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
                    )}
                    <Button type="submit" variant="primary" className="flex-grow">
                        {editingEmployeeId ? "Update" : "Add"}
                    </Button>
                </div>
            </form>

            <div className="space-y-3">
                {loading ? <p className="text-gray-400">Loading...</p> : (employees || []).map(emp => (
                    <div key={emp.id} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-md">
                        <div>
                            <p className="text-gray-200">
                                {emp.name} - <span className="text-gray-400 text-sm">{getDepartmentName(emp.departmentId)}</span>
                                {emp.employeeType === 'permanent' && <span className="text-blue-400 font-mono text-sm ml-4">R{(emp.hourlyRate || 0).toFixed(2)}/hr</span>}
                                {emp.employeeType === 'subcontractor' && <span className="text-purple-400 font-mono text-sm ml-4">Subcontractor ({emp.paymentModel})</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={() => handleManageSkillsClick(emp)} variant="secondary" size="sm"><Award size={16} className="mr-1" /> Manage Skills</Button>
                            <Button onClick={() => handleEdit(emp)} variant="secondary" size="sm">Edit</Button>
                            <Button onClick={() => handleDelete(emp.id)} variant="danger" size="sm">Delete</Button>
                        </div>
                    </div>
                ))}
            </div>

            {isSkillsModalOpen && selectedEmployee && (
                <EmployeeSkillsModal employee={selectedEmployee} onClose={() => setIsSkillsModalOpen(false)} />
            )}
        </div>
    );
};

export default EmployeesManager;