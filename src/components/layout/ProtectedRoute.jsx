import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // 1. While Firebase is checking the auth state, show a loading message.
  if (loading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
        Loading Application...
      </div>
    );
  }

  // 2. If loading is finished and there's no user, redirect to the login page.
  if (!user) {
    return <Navigate to="/login" />;
  }

  // 3. If loading is finished and a user exists, show the requested page.
  return children;
};

// Ensure this exact line is at the bottom of the file
export default ProtectedRoute;