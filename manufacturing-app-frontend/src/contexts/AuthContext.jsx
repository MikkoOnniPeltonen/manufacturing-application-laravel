import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const token = sessionStorage.getItem('authToken');
    const storedUser = sessionStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await api.get('/me');
      setUser(response.data);
      sessionStorage.setItem('user', JSON.stringify(response.data));
    } catch (_error) {
      // Token invalid, clear auth
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/login', { email, password });
    const { user: userData, token } = response.data;

    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (_error) {
      // Ignore logout errors
    }
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const hasRole = role => {
    if (!user?.roles) return false;
    return user.roles.some(r => r.name === role);
  };

  const isAdmin = () => hasRole('admin');
  const isManager = () => hasRole('manager');
  const canAccessProduction = () => isManager();
  const canAccessCustomers = () => isAdmin();

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasRole,
        isAdmin,
        isManager,
        canAccessProduction,
        canAccessCustomers,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
