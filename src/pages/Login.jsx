import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signIn(email, password);
      // The onAuthStateChanged listener will handle the redirect
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-400 text-center mb-2">TOJEM OS</h1>
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
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;