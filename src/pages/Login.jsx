// src/pages/Login.jsx

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TojemLogo from '../assets/TOJEM 2024.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      // After successful sign-in, the AuthContext state will change.
      // The main App component will detect this change and automatically
      // render the correct layout and pages. No navigation is needed here.
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg w-full max-w-md">
        <img src={TojemLogo} alt="TOJEM OS Logo" className="h-16 mx-auto mb-4 object-contain" />
        <p className="text-gray-400 text-center mb-6">Please sign in to continue</p>
        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </div> 
    </div>
  );
};

export default LoginPage;
