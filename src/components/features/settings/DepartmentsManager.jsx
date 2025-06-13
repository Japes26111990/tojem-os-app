import React, { useState, useEffect } from 'react';
import { getDepartments, addDepartment, deleteDepartment } from '../../../api/firestore';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const DepartmentsManager = () => {
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDepartments = async () => {
    setLoading(true);
    const depts = await getDepartments();
    setDepartments(depts);
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newDepartmentName.trim()) return;
    try {
      await addDepartment(newDepartmentName);
      setNewDepartmentName('');
      fetchDepartments();
    } catch (error) {
      console.error("Error adding department:", error);
      alert("Failed to add department.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      try {
        await deleteDepartment(id);
        fetchDepartments();
      } catch (error) {
        console.error("Error deleting department:", error);
        alert("Failed to delete department.");
      }
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Manage Departments</h3>

      <form onSubmit={handleAdd} className="flex items-center space-x-4 mb-6">
        <Input
          name="newDepartment"
          value={newDepartmentName}
          onChange={(e) => setNewDepartmentName(e.target.value)}
          placeholder="New department name..."
          className="flex-grow"
        />
        <Button type="submit" variant="primary">Add Department</Button>
      </form>

      <div className="space-y-3">
        {/* --- FIX APPLIED HERE --- */}
        {loading ? <p>Loading departments...</p> : (departments || []).map(dept => (
          <div key={dept.id} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
            <p className="text-gray-200">{dept.name}</p>
            <Button onClick={() => handleDelete(dept.id)} variant="danger" className="py-1 px-3 text-xs">
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsManager;