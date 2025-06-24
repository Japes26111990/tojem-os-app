import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

/**
 * A wrapper for routes that checks if the current user has one of the required roles.
 * If the user is not authorized, it redirects them to the main dashboard.
 * @param {{children: React.ReactNode, roles: Array<string>}} props
 */
const RoleBasedRoute = ({ children, roles }) => {
    const { user } = useAuth();

    if (user && roles.includes(user.role)) {
        return children;
    }

    // Redirect them to the home page if they don't have the right role
    return <Navigate to="/" />;
};

export default RoleBasedRoute;