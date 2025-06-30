import React, { useState, useEffect } from 'react';
import { getDepartments, addDepartment, deleteDepartment, updateDocument } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import toast from 'react-hot-toast'; // --- IMPORT TOAST ---

const DepartmentsManager = () => {
    const [departments, setDepartments] = useState([]);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingDeptId, setEditingDeptId] = useState(null);

    const fetchDepartments = async () => {
        setLoading(true);
        const depts = await getDepartments();
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
                await updateDocument('departments', editingDeptId, { name: newDepartmentName });
                toast.success("Department updated successfully!"); // --- REPLACE ALERT ---
            } else {
                await addDepartment(newDepartmentName);
                toast.success("Department added successfully!"); // --- REPLACE ALERT ---
            }
            setNewDepartmentName('');
            setEditingDeptId(null);
            fetchDepartments();
        } catch (error) {
            console.error("Error saving department:", error);
            toast.error(`Failed to ${editingDeptId ? 'update' : 'add'} department.`); // --- REPLACE ALERT ---
        }
    };

    const handleEdit = (dept) => {
        setNewDepartmentName(dept.name);
        setEditingDeptId(dept.id);
    };

    const handleCancelEdit = () => {
        setNewDepartmentName('');
        setEditingDeptId(null);
    };

    const handleDelete = (id) => {
        // --- REPLACE window.confirm ---
        toast((t) => (
            <span>
                Are you sure you want to delete this department?
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteDepartment(id)
                        .then(() => {
                            toast.success("Department deleted.");
                            fetchDepartments();
                        })
                        .catch(err => {
                            toast.error("Failed to delete department.");
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
            icon: '⚠️',
        });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Manage Departments</h3>
            <form onSubmit={handleAddOrUpdate} className="flex items-center space-x-4 mb-6">
                <Input
                    name="departmentName"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder={editingDeptId ? "Edit department name..." : "New department name..."}
                    className="flex-grow"
                />
                {editingDeptId && (
                    <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" variant="primary">
                    {editingDeptId ? "Update Department" : "Add Department"}
                </Button>
            </form>
            <div className="space-y-3">
                {loading ? (
                    <p>Loading departments...</p>
                ) : (
                    (departments || []).map(dept => (
                        <div key={dept.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                            <p className="text-gray-200">{dept.name}</p>
                            <div className="flex space-x-2">
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
