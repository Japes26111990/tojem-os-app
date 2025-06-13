import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts and Pages
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/Login';
import SettingsPage from './pages/SettingsPage';
import JobCreatorPage from './pages/JobCreatorPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import ScannerPage from './pages/ScannerPage';
import QcPage from './pages/QcPage';
import StockControlPage from './pages/StockControlPage';


// UI Components
import Button from './components/ui/Button';

function Dashboard() {
  const { user, signOut } = useAuth();
  return (
    <MainLayout>
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Dashboard!</h2>
        <p className="text-gray-400 mb-6">You are signed in as: <span className="font-semibold text-blue-400">{user.email}</span></p>
        <Button onClick={signOut} variant="danger" className="py-1 px-3 text-xs">
          Sign Out
        </Button>
      </div>
    </MainLayout>
  );
}

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/stock" element={<StockControlPage />} />
                <Route path="/creator" element={<JobCreatorPage />} />
                <Route path="/tracking" element={<LiveTrackingPage />} />
                <Route path="/scan" element={<ScannerPage />} />
                <Route path="/qc" element={<QcPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;