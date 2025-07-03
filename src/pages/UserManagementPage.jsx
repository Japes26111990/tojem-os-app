// src/pages/UserManagementPage.jsx (Upgraded with Dynamic Roles & Toasts & Discount Field)

import React, { useState, useEffect } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import { getAllUsers, updateUserRole, createUserWithRole, deleteUserWithRole, getRoles } from '../api/firestore';
import { PlusCircle, Edit, Trash2, User, Mail, Shield, Percent } from 'lucide-react'; // Import Percent icon
import toast from 'react-hot-toast';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allRoles, setAllRoles] = useState([]);

  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('');
  const [newUserDiscount, setNewUserDiscount] = useState(''); // NEW: State for new user discount
  const [addingUser, setAddingUser] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserRole, setEditingUserRole] = useState('');
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserDiscount, setEditingUserDiscount] = useState(''); // NEW: State for editing user discount

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedUsers, fetchedRoles] = await Promise.all([
          getAllUsers(),
          getRoles()
      ]);
      setUsers(fetchedUsers);
      setAllRoles(fetchedRoles);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load user or role data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
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
      // Pass the new user discount to createUserWithRole
      const result = await createUserWithRole(newUserEmail, newUserPassword, newUserRole, newUserDiscount);
      toast.success(`User ${result.email} created successfully!`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('');
      setNewUserDiscount(''); // Clear discount field
      fetchUsersAndRoles();
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
    setEditingUserName(user.email);
    setEditingUserDiscount(user.discountPercentage || ''); // Set editing discount
  };

  const handleUpdateRole = async (userId) => {
    setError(null);
    try {
      // Pass the editing user discount to updateUserRole
      await updateUserRole(userId, editingUserRole, editingUserDiscount);
      toast.success(`User role updated for ${editingUserName}!`);
      setEditingUserId(null);
      fetchUsersAndRoles();
    } catch (err) {
      console.error("Error updating role:", err.message);
      setError(`Failed to update role: ${err.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUserRole('');
    setEditingUserName('');
    setEditingUserDiscount('');
  };

  const handleDeleteUser = (userToDelete) => {
    toast((t) => (
        <span>
            Delete user {userToDelete.email}? This is permanent.
            <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                deleteUserWithRole(userToDelete.id)
                    .then(() => {
                        toast.success(`User ${userToDelete.email} deleted.`);
                        fetchUsersAndRoles();
                    })
                    .catch(err => {
                        toast.error("Failed to delete user.");
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
    ), { icon: '⚠️' });
  };


  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">User & Role Management</h2>
      <p className="text-gray-400">Manage application users, their roles, and linked employee profiles.</p>

      {error && <div className="p-3 bg-red-800 text-red-100 rounded-lg text-center">{error}</div>}

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
            options={allRoles}
            placeholder="Select a role..."
            required
          />
          {/* NEW: Discount Percentage Input */}
          <Input
            label="Discount (%)"
            type="number"
            value={newUserDiscount}
            onChange={(e) => setNewUserDiscount(e.target.value)}
            placeholder="0"
            min="0"
            max="100"
          />
          <Button type="submit" disabled={addingUser} className="col-span-full"> {/* Adjusted col-span */}
            {addingUser ? 'Adding User...' : 'Add User'}
          </Button>
        </form>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center"><User size={24} className="mr-2 text-purple-400"/> Existing Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="p-3 text-sm font-semibold text-gray-400">Email</th>
                <th className="p-3 text-sm font-semibold text-gray-400">Role</th>
                <th className="p-3 text-sm font-semibold text-gray-400">Discount</th> {/* NEW */}
                <th className="p-3 text-sm font-semibold text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center p-8 text-gray-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-8 text-gray-400">No users found.</td></tr>
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
                          options={allRoles}
                          className="w-full"
                        />
                      ) : (
                        <span className="flex items-center gap-2 text-gray-300">
                          <Shield size={16} className="text-gray-500"/>
                          {user.role}
                        </span>
                      )}
                    </td>
                    {/* NEW: Discount Cell */}
                    <td className="p-3">
                        {editingUserId === user.id ? (
                            <Input
                                type="number"
                                value={editingUserDiscount}
                                onChange={(e) => setEditingUserDiscount(e.target.value)}
                                placeholder="0"
                                min="0"
                                max="100"
                            />
                        ) : (
                            <span className="flex items-center gap-2 text-gray-300">
                                <Percent size={16} className="text-gray-500"/>
                                {(user.discountPercentage || 0).toFixed(0)}%
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
                          <Button variant="secondary" onClick={() => handleEditRole(user)} className="py-1 px-3 text-xs"><Edit size={16} className="mr-1"/> Edit</Button> {/* Changed text to just 'Edit' */}
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
