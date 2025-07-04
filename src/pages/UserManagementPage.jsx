// src/pages/UserManagementPage.jsx (UPDATED for Client Management)

import React, { useState, useEffect } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Dropdown from '../components/ui/Dropdown';
import { getAllUsers, updateUserRole, createUserWithRole, deleteUserWithRole, getRoles } from '../api/firestore';
import { PlusCircle, Edit, Trash2, User, Mail, Shield, Percent, Building } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allRoles, setAllRoles] = useState([]);

    // State for new internal staff user
    const [newStaffUser, setNewStaffUser] = useState({ email: '', password: '', role: '' });
    
    // State for new client user
    const [newClientUser, setNewClientUser] = useState({ companyName: '', email: '', password: '', discountPercentage: '0' });

    const [addingUser, setAddingUser] = useState(false);

    const [editingUserId, setEditingUserId] = useState(null);
    const [editingUserRole, setEditingUserRole] = useState('');
    const [editingUserName, setEditingUserName] = useState('');
    const [editingUserDiscount, setEditingUserDiscount] = useState('');
    const [editingUserCompany, setEditingUserCompany] = useState('');

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

    const handleAddClient = async (e) => {
        e.preventDefault();
        if (!newClientUser.email || !newClientUser.password || !newClientUser.companyName) {
            return toast.error("Company Name, Email, and Password are required for new clients.");
        }
        setAddingUser(true);
        setError(null);
        try {
            const result = await createUserWithRole(newClientUser.email, newClientUser.password, 'Client', newClientUser.discountPercentage, newClientUser.companyName);
            toast.success(`Client user ${result.email} created successfully!`);
            setNewClientUser({ companyName: '', email: '', password: '', discountPercentage: '0' });
            fetchUsersAndRoles();
        } catch (err) {
            console.error("Error adding client:", err.message);
            setError(`Failed to add client: ${err.message}`);
        } finally {
            setAddingUser(false);
        }
    };
    
    const handleAddStaff = async (e) => {
        e.preventDefault();
        if (!newStaffUser.email || !newStaffUser.password || !newStaffUser.role) {
            return toast.error("Email, password, and role are required for new staff.");
        }
        setAddingUser(true);
        setError(null);
        try {
            const result = await createUserWithRole(newStaffUser.email, newStaffUser.password, newStaffUser.role);
            toast.success(`Staff user ${result.email} created successfully!`);
            setNewStaffUser({ email: '', password: '', role: '' });
            fetchUsersAndRoles();
        } catch (err) {
            console.error("Error adding staff user:", err.message);
            setError(`Failed to add staff user: ${err.message}`);
        } finally {
            setAddingUser(false);
        }
    };

    const handleEditUser = (user) => {
        setEditingUserId(user.id);
        setEditingUserRole(user.role);
        setEditingUserName(user.email);
        setEditingUserDiscount(user.discountPercentage || '0');
        setEditingUserCompany(user.companyName || '');
    };

    const handleUpdateUser = async (userId) => {
        setError(null);
        try {
            await updateUserRole(userId, editingUserRole, editingUserDiscount, editingUserCompany);
            toast.success(`User updated for ${editingUserName}!`);
            handleCancelEdit(); // Reset form after successful update
            fetchUsersAndRoles();
        } catch (err) {
            console.error("Error updating user:", err.message);
            setError(`Failed to update user: ${err.message}`);
        }
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setEditingUserRole('');
        setEditingUserName('');
        setEditingUserDiscount('');
        setEditingUserCompany('');
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
                        .catch(err => toast.error("Failed to delete user."));
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
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center"><User size={24} className="mr-2 text-blue-400"/> Add New Staff User</h3>
                <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input label="Staff Email" type="email" value={newStaffUser.email} onChange={(e) => setNewStaffUser({...newStaffUser, email: e.target.value})} required />
                    <Input label="Password" type="password" value={newStaffUser.password} onChange={(e) => setNewStaffUser({...newStaffUser, password: e.target.value})} required />
                    <Dropdown label="Role" value={newStaffUser.role} onChange={(e) => setNewStaffUser({...newStaffUser, role: e.target.value})} options={allRoles.filter(r => r.name !== 'Client')} placeholder="Select a role..." required />
                    <Button type="submit" disabled={addingUser} className="md:col-span-3">
                        {addingUser ? 'Adding...' : 'Add Staff User'}
                    </Button>
                </form>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center"><Building size={24} className="mr-2 text-green-400"/> Add New Client User</h3>
                <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <Input label="Company Name" value={newClientUser.companyName} onChange={(e) => setNewClientUser({...newClientUser, companyName: e.target.value})} required />
                    <Input label="Client Email" type="email" value={newClientUser.email} onChange={(e) => setNewClientUser({...newClientUser, email: e.target.value})} required />
                    <Input label="Password" type="password" value={newClientUser.password} onChange={(e) => setNewClientUser({...newClientUser, password: e.target.value})} required />
                    <Input label="Discount (%)" type="number" value={newClientUser.discountPercentage} onChange={(e) => setNewClientUser({...newClientUser, discountPercentage: e.target.value})} placeholder="0" min="0" max="100"/>
                    <Button type="submit" disabled={addingUser} className="md:col-span-4">
                        {addingUser ? 'Adding...' : 'Add Client User'}
                    </Button>
                </form>
            </div>


            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Existing Users</h3>
                {error && <div className="p-3 bg-red-800 text-red-100 rounded-lg text-center mb-4">{error}</div>}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="p-3 text-sm font-semibold text-gray-400">User / Company</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Role</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Discount</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center p-8 text-gray-400">Loading users...</td></tr>
                            ) : users.map(user => (
                                <tr key={user.id} className="border-b border-gray-700">
                                    <td className="p-3 text-gray-200">
                                        <div className="flex items-center gap-2 font-semibold">
                                            {user.role === 'Client' ? <Building size={16} className="text-gray-500"/> : <User size={16} className="text-gray-500"/>}
                                            {editingUserId === user.id 
                                                ? <Input value={editingUserCompany} onChange={(e) => setEditingUserCompany(e.target.value)} placeholder="Company Name"/>
                                                : (user.companyName || user.email)
                                            }
                                        </div>
                                        {user.role === 'Client' && <p className="text-xs text-gray-400 ml-8">{user.email}</p>}
                                    </td>
                                    <td className="p-3">
                                        {editingUserId === user.id ? (
                                            <Dropdown value={editingUserRole} onChange={(e) => setEditingUserRole(e.target.value)} options={allRoles} className="w-full" />
                                        ) : (
                                            <span className="flex items-center gap-2 text-gray-300">
                                                <Shield size={16} className="text-gray-500"/>
                                                {user.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {editingUserId === user.id ? (
                                            <Input type="number" value={editingUserDiscount} onChange={(e) => setEditingUserDiscount(e.target.value)} placeholder="0" min="0" max="100" />
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
                                                <Button variant="primary" onClick={() => handleUpdateUser(user.id)} className="py-1 px-3 text-xs">Save</Button>
                                                <Button variant="secondary" onClick={handleCancelEdit} className="py-1 px-3 text-xs">Cancel</Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="secondary" onClick={() => handleEditUser(user)} className="py-1 px-3 text-xs"><Edit size={16} className="mr-1"/> Edit</Button>
                                                <Button variant="danger" onClick={() => handleDeleteUser(user)} className="py-1 px-3 text-xs"><Trash2 size={16} className="mr-1"/> Delete</Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagementPage;