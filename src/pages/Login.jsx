import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TojemLogo from '../assets/TOJEM 2024.png'; // Import your logo image
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, user } = useAuth(); // Get user from context
  const navigate = useNavigate(); // Initialize navigate

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signIn(email, password);
      // The onAuthStateChanged listener in AuthContext will update the user state.
      // Once the user state is updated, the useEffect below will handle redirection.
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    }
  };

  // Effect to redirect after successful login when user object is updated
  React.useEffect(() => {
    if (user && user.uid) {
      // Redirect to the user's specific landing page or default to '/'
      navigate(user.landingPage || '/');
    }
  }, [user, navigate]);

  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg w-full max-w-md">
        {/* Replaced H1 text with your logo image for the login page */}
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
          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>
      </div> 
    </div>
  );
};

export default LoginPage;
