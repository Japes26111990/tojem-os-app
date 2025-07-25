// src/components/layout/RoleBasedRoute.jsx (ENHANCED)
// This component has been upgraded to handle more complex, fine-grained permissions.
// It can now accept an array of permissions and will grant access if the user has AT LEAST ONE of them.
// This allows for more flexible and secure role definitions in the future.

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

/**
 * A wrapper for routes that checks if the current user has the required permission(s).
 * If the user is not authorized, it redirects them to their default landing page.
 * @param {{children: React.ReactNode, permission: string | string[]}} props
 */
const RoleBasedRoute = ({ children, permission }) => {
    const { user } = useAuth();

    // Ensure the user and their permissions object exist.
    if (!user || !user.permissions) {
        console.warn("RoleBasedRoute: User or user.permissions is undefined. Redirecting.");
        return <Navigate to="/" />;
    }

    const userPermissions = user.permissions;
    
    // The 'permission' prop can now be a single string or an array of strings.
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];

    // Check if the user has AT LEAST ONE of the required permissions.
    // This provides flexibility, e.g., a route could be accessible by a 'manager' OR an 'editor'.
    const hasPermission = requiredPermissions.some(p => userPermissions[p] === true);

    if (hasPermission) {
        return children; // User has permission, render the requested page.
    }

    // If the user does not have permission, redirect them to their designated landing page.
    // This prevents users from getting stuck on an unauthorized page.
    console.log(`Redirecting: User does not have required permission(s): ${requiredPermissions.join(', ')}`);
    return <Navigate to={user.landingPage || '/'} />;
};

export default RoleBasedRoute;
