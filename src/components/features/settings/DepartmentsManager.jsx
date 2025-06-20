import React, { useState, useEffect } from 'react';
import { getDepartments, addDepartment, deleteDepartment, updateDocument } from '../../../api/firestore'; // updateDocument imported
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const DepartmentsManager = () => {
    const [departments, setDepartments] = useState([]);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingDeptId, setEditingDeptId] = useState(null); // State to track which department is being edited

    const fetchDepartments = async () => {
        setLoading(true);
        const depts = await getDepartments(); // Fetches departments from Firestore 
        setDepartments(depts);
        setLoading(false);
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!newDepartmentName.trim()) return;

        try {
            if (editingDeptId) {
                // If editingDeptId is set, update the existing department
                await updateDocument('departments', editingDeptId, { name: newDepartmentName }); // Uses updateDocument for generic update 
                alert("Department updated successfully!");
            } else {
                // Otherwise, add a new department
                await addDepartment(newDepartmentName); // Adds new department 
                alert("Department added successfully!");
            }
            setNewDepartmentName(''); // Clear input field
            setEditingDeptId(null); // Exit editing mode
            fetchDepartments(); // Refresh the list of departments
        } catch (error) {
            console.error("Error saving department:", error);
            alert(`Failed to ${editingDeptId ? 'update' : 'add'} department.`);
        }
    };

    const handleEdit = (dept) => {
        setNewDepartmentName(dept.name); // Pre-fill form with department's current name
        setEditingDeptId(dept.id); // Set the ID of the department being edited
    };

    const handleCancelEdit = () => {
        setNewDepartmentName(''); // Clear input field
        setEditingDeptId(null); // Exit editing mode
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this department?")) {
            try {
                await deleteDepartment(id); // Deletes department 
                alert("Department deleted successfully!");
                fetchDepartments(); // Refresh the list
            } catch (error) {
                console.error("Error deleting department:", error);
                alert("Failed to delete department.");
            }
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Departments</h3>
            <form onSubmit={handleAddOrUpdate} className="flex items-center space-x-4 mb-6">
                <Input
                    name="departmentName"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder={editingDeptId ? "Edit department name..." : "New department name..."} // Dynamic placeholder
                    className="flex-grow"
                />
                {editingDeptId && ( // Show Cancel button only when in editing mode
                    <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" variant="primary">
                    {editingDeptId ? "Update Department" : "Add Department"} {/* Dynamic button text */}
                </Button>
            </form>
            <div className="space-y-3">
                {loading ? (
                    <p>Loading departments...</p>
                ) : (
                    (departments || []).map(dept => (
                        <div key={dept.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                            <p className="text-gray-200">{dept.name}</p>
                            <div className="flex space-x-2"> {/* Container for action buttons */}
                                <Button onClick={() => handleEdit(dept)} variant="secondary" className="py-1 px-3 text-xs">
                                    Edit
                                </Button>
                                <Button onClick={() => handleDelete(dept.id)} variant="danger" className="py-1 px-3 text-xs">
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DepartmentsManager;