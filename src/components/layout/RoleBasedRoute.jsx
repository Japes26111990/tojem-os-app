import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

/**
 * A wrapper for routes that checks if the current user has a specific permission.
 * If the user is not authorized, it redirects them to the main dashboard.
 * @param {{children: React.ReactNode, permission: string}} props
 */
const RoleBasedRoute = ({ children, permission }) => {
    const { user } = useAuth();

    // Check if the user object and permissions map exist, and if the specific permission is true.
    if (user && user.permissions && user.permissions[permission]) {
        return children;
    }

    // Redirect them to the home page if they don't have the right permission
    return <Navigate to="/" />;
};

export default RoleBasedRoute;
