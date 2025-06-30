// src/components/features/settings/RoleManager.jsx (Corrected & Self-Healing)

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { Shield, Lock, Unlock, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Define all available permissions in the application
const ALL_PERMISSIONS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'quotes', label: 'Sales Quotes' },
    { id: 'marketing', label: 'Marketing Dashboard' },
    { id: 'orders', label: 'Sales Orders' },
    { id: 'purchasing', label: 'Purchasing Hub' },
    { id: 'stockTake', label: 'Stock Take' },
    { id: 'tracking', label: 'Live Tracking' },
    { id: 'scanner', label: 'Scanner' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'jobCreator', label: 'Job Creator' },
    { id: 'qc', label: 'Quality Control' },
    { id: 'issues', label: 'Issues & Halts' },
    { id: 'adjustment', label: 'Job Card Adjustment' },
    { id: 'performance', label: 'Performance BI' },
    { id: 'profitability', label: 'Profitability BI' },
    { id: 'valuation', label: 'Valuation BI' },
    { id: 'assets', label: 'Asset Intelligence' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'settings', label: 'Settings' },
];

const RoleManager = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState(null);
    const [newRoleName, setNewRoleName] = useState('');

    const fetchRoles = async () => {
        setLoading(true);
        const rolesCollectionRef = collection(db, 'roles');
        const snapshot = await getDocs(rolesCollectionRef);
        const fetchedRoles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // --- SELF-HEALING LOGIC: Ensure Manager role exists ---
        const managerRoleExists = fetchedRoles.some(role => role.name === 'Manager');
        if (!managerRoleExists) {
            console.log("Manager role not found, creating it with full permissions...");
            try {
                // Create a permissions object with all permissions set to true
                const fullPermissions = ALL_PERMISSIONS.reduce((acc, permission) => {
                    acc[permission.id] = true;
                    return acc;
                }, {});

                // Create the document with the specific ID "Manager"
                const managerRoleRef = doc(db, 'roles', 'Manager');
                await setDoc(managerRoleRef, {
                    name: 'Manager',
                    permissions: fullPermissions
                });
                console.log("Default 'Manager' role created successfully.");
                // Add the new role to our local state to avoid a re-fetch
                fetchedRoles.push({ id: 'Manager', name: 'Manager', permissions: fullPermissions });
                toast.success("Default 'Manager' role created.");
            } catch (error) {
                console.error("Error creating default Manager role:", error);
                toast.error("Could not create default Manager role.");
            }
        }
        // --- END SELF-HEALING LOGIC ---

        setRoles(fetchedRoles);
        setLoading(false);
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleSelectRole = (role) => {
        setSelectedRole({ ...role, permissions: role.permissions || {} });
    };

    const handlePermissionChange = (permissionId, value) => {
        setSelectedRole(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permissionId]: value
            }
        }));
    };

    const handleSaveRole = async () => {
        if (!selectedRole) return;
        const roleRef = doc(db, 'roles', selectedRole.id);
        try {
            await setDoc(roleRef, { name: selectedRole.name, permissions: selectedRole.permissions }, { merge: true });
            toast.success(`Role "${selectedRole.name}" updated successfully!`);
            fetchRoles();
        } catch (error) {
            toast.error("Failed to update role.");
            console.error("Error updating role:", error);
        }
    };

    const handleAddNewRole = async () => {
        if (!newRoleName.trim()) return toast.error("Role name cannot be empty.");
        try {
            await addDoc(collection(db, 'roles'), {
                name: newRoleName.trim(),
                permissions: {} // Start with no permissions
            });
            toast.success(`Role "${newRoleName.trim()}" created.`);
            setNewRoleName('');
            fetchRoles();
        } catch (error) {
            toast.error("Failed to create role.");
            console.error("Error creating role:", error);
        }
    };

    const handleDeleteRole = (roleId, roleName) => {
        if (roleName === 'Manager') {
            return toast.error("The 'Manager' role cannot be deleted.");
        }
        toast((t) => (
            <span>
                Delete role "{roleName}"? This cannot be undone.
                <Button variant="danger" size="sm" className="ml-2" onClick={() => {
                    deleteDoc(doc(db, 'roles', roleId))
                        .then(() => {
                            toast.success("Role deleted.");
                            fetchRoles();
                            setSelectedRole(null);
                        })
                        .catch(err => toast.error("Failed to delete role."));
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
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Role & Permission Management</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Role List and Creation */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h4 className="font-bold text-lg text-white mb-2">System Roles</h4>
                        <div className="space-y-2">
                            {loading ? <p className="text-gray-400">Loading roles...</p> :
                                roles.map(role => (
                                    <div 
                                        key={role.id}
                                        onClick={() => handleSelectRole(role)}
                                        className={`p-3 rounded-md cursor-pointer transition-colors flex justify-between items-center ${selectedRole?.id === role.id ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    >
                                        <span className="font-semibold">{role.name}</span>
                                        {role.name !== 'Manager' && (
                                            <Button variant="icon" size="sm" className="text-red-400 hover:text-red-300 p-1" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id, role.name); }}>
                                                <Trash2 size={16}/>
                                            </Button>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <div className="space-y-3 border-t border-gray-700 pt-6">
                        <h4 className="font-bold text-lg text-white">Add New Role</h4>
                        <div className="flex gap-2">
                            <Input placeholder="e.g., Floor Staff" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
                            <Button onClick={handleAddNewRole}><PlusCircle size={16} /></Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Permission Editor */}
                <div className="lg:col-span-2">
                    {!selectedRole ? (
                        <div className="flex items-center justify-center h-full bg-gray-900/50 p-6 rounded-xl border-2 border-dashed border-gray-700 text-gray-500">
                           <p>Select a role from the list to manage its permissions.</p>
                       </div>
                    ) : (
                        <div className="bg-gray-900/50 p-6 rounded-xl">
                            <h4 className="text-xl font-bold text-blue-400 mb-4">Editing Permissions for: {selectedRole.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-3">
                                {ALL_PERMISSIONS.map(permission => (
                                    <div key={permission.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                        <label htmlFor={permission.id} className="text-gray-200">{permission.label}</label>
                                        <button 
                                            id={permission.id}
                                            onClick={() => handlePermissionChange(permission.id, !selectedRole.permissions[permission.id])}
                                            className={`p-2 rounded-full transition-colors ${selectedRole.permissions[permission.id] ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                                        >
                                            {selectedRole.permissions[permission.id] ? <Unlock size={16} /> : <Lock size={16} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                             <div className="text-right border-t border-gray-700 pt-4 mt-4">
                                <Button onClick={handleSaveRole} variant="primary">Save Changes for "{selectedRole.name}"</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoleManager;
