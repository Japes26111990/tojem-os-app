import React, { useState, useEffect } from 'react';
// import MainLayout from '../components/layout/MainLayout'; // REMOVE THIS IMPORT
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import { getAllUsers, updateUserRole, createUserWithRole, deleteUserWithRole } from '../api/firestore';
import { PlusCircle, Edit, Trash2, User, Mail, Shield } from 'lucide-react';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for adding new user
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState(''); // Corrected line
  const [newUserRole, setNewUserRole] = useState('Workshop Employee'); // Default role for new users
  const [addingUser, setAddingUser] = useState(false);

  // State for editing existing user
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState('');
  const [editingUserName, setEditingUserName] = useState(''); // Assuming you might display name

  const availableRoles = [
    { id: 'Manager', name: 'Manager' },
    { id: 'QC Inspector', name: 'QC Inspector' },
    { id: 'Workshop Employee', name: 'Workshop Employee' },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load user data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserRole) {
      setError("Email, password, and role are required for new users.");
      return;
    }
    setAddingUser(true);
    setError(null);
    try {
      // Call the Cloud Function to create user (function needs to be deployed first)
      const result = await createUserWithRole(newUserEmail, newUserPassword, newUserRole);
      alert(`User ${result.email} created successfully with role ${newUserRole}!`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('Workshop Employee');
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error("Error adding user:", err.message);
      setError(`Failed to add user: ${err.message}`);
    } finally {
      setAddingUser(false);
    }
  };

  const handleEditRole = (user) => {
    setEditingUserId(user.id);
    setEditingUserRole(user.role);
    setEditingUserName(user.email); // Use email as name for display
  };

  const handleUpdateRole = async (userId) => {
    setError(null);
    try {
      await updateUserRole(userId, editingUserRole);
      alert(`User role updated successfully for ${editingUserName}!`);
      setEditingUserId(null); // Exit editing mode
      fetchUsers(); // Refresh list
    } catch (err) {
      console.error("Error updating role:", err.message);
      setError(`Failed to update role: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUserRole('');
    setEditingUserName('');
  };

  const handleDeleteUser = async (userToDelete) => {
    if (window.confirm(`Are you sure you want to PERMANENTLY delete user ${userToDelete.email}? This action cannot be undone and will delete their authentication record and user document.`)) {
      setError(null);
      try {
        // Call the Cloud Function to delete user (function needs to be deployed first)
        await deleteUserWithRole(userToDelete.id);
        alert(`User ${userToDelete.email} deleted successfully!`);
        fetchUsers(); // Refresh list
      } catch (err) {
        console.error("Error deleting user:", err.message);
        setError(`Failed to delete user: ${err.message}`);
      }
    }
  };


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">User & Role Management</h2>
      <p className="text-gray-400">Manage application users, their roles, and linked employee profiles.</p>

      {error && <div className="p-3 bg-red-800 text-red-100 rounded-lg text-center">{error}</div>}

      {/* Add New User Form */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center"><PlusCircle size={24} className="mr-2 text-blue-400"/> Add New Application User</h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input
            label="Email"
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="user@company.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            placeholder="********"
            required
          />
          <Dropdown
            label="Role"
            name="newUserRole"
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value)}
            options={availableRoles}
            required
          />
          <Button type="submit" disabled={addingUser} className="col-span-1">
            {addingUser ? 'Adding User...' : 'Add User'}
          </Button>
        </form>
      </div>

      {/* User List & Role Editor */}
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center"><User size={24} className="mr-2 text-purple-400"/> Existing Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="p-3 text-sm font-semibold text-gray-400">Email</th>
                <th className="p-3 text-sm font-semibold text-gray-400">Role</th>
                <th className="p-3 text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" className="text-center p-8 text-gray-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="3" className="text-center p-8 text-gray-400">No users found.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="border-b border-gray-700">
                    <td className="p-3 text-gray-200 flex items-center gap-2">
                      <Mail size={16} className="text-gray-500"/>
                      {user.email}
                    </td>
                    <td className="p-3">
                      {editingUserId === user.id ? (
                        <Dropdown
                          name="editingUserRole"
                          value={editingUserRole}
                          onChange={(e) => setEditingUserRole(e.target.value)}
                          options={availableRoles}
                          className="w-full"
                        />
                      ) : (
                        <span className="flex items-center gap-2 text-gray-300">
                          <Shield size={16} className="text-gray-500"/>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="p-3 flex space-x-2">
                      {editingUserId === user.id ? (
                        <>
                          <Button variant="primary" onClick={() => handleUpdateRole(user.id)} className="py-1 px-3 text-xs">Save</Button>
                          <Button variant="secondary" onClick={handleCancelEdit} className="py-1 px-3 text-xs">Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="secondary" onClick={() => handleEditRole(user)} className="py-1 px-3 text-xs"><Edit size={16} className="mr-1"/> Edit Role</Button>
                          <Button variant="danger" onClick={() => handleDeleteUser(user)} className="py-1 px-3 text-xs"><Trash2 size={16} className="mr-1"/> Delete</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;
