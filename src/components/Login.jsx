import React, { useState } from 'react';
import { IconSun, IconMoon, IconLock, IconUser, IconEyeCheck, IconEyeOff, IconLogin } from '@tabler/icons-react';

const Login = ({ onLogin, darkMode, toggleDarkMode }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await onLogin({ username, password });
      if (!result.success) {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-dark-800 transition-colors duration-200">
      <div className="max-w-md w-full px-6 py-10 bg-white dark:bg-dark-700 shadow-medium dark:shadow-none rounded-2xl">
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-dark-500 dark:text-dark-100 hover:bg-gray-100 dark:hover:bg-dark-600 focus:outline-none transition-colors duration-200"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <IconSun size={20} /> : <IconMoon size={20} />}
          </button>
        </div>
        
        <div className="text-center mb-8">
          <div className="mb-3 inline-flex">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-medium">
              <span className="text-white font-bold text-3xl">P</span>
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-1">
            Pro<span className="text-primary-600 dark:text-primary-400">POS</span>
          </h1>
          <p className="text-dark-500 dark:text-dark-200">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 animate-fade-in" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-dark-700 dark:text-dark-200 text-sm font-medium mb-2" htmlFor="username">
              Username
            </label>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                <IconUser size={18} />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 py-3 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-dark-700 dark:text-dark-200 text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-400 dark:text-dark-300">
                <IconLock size={18} />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 bg-white dark:bg-dark-600 text-dark-800 dark:text-white border-gray-200 dark:border-dark-500 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 dark:focus:border-primary-400 transition-colors duration-200"
                placeholder="Enter your password"
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-dark-400 dark:text-dark-300 hover:text-dark-600 dark:hover:text-dark-100 focus:outline-none"
                >
                  {showPassword ? <IconEyeCheck size={18} /> : <IconEyeOff size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white font-medium py-3 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors duration-200 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center">
                  <IconLogin size={18} className="mr-2" />
                  Sign In
                </span>
              )}
            </button>
          </div>

          <div className="text-center text-sm text-dark-500 dark:text-dark-300">
            <p>Default admin credentials: admin / admin</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 