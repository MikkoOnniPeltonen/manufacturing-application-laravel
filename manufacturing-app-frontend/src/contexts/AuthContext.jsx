import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { initializeCsrf } from '../api/csrf';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    try {
      const { data } = await apiClient.GET('/v1/me');
      setUser(data);
    } catch (_error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    await initializeCsrf();
    const { data, error } = await apiClient.POST('/v1/login', {
      body: { email, password },
    });

    if (error || !data) {
      throw error ?? new Error('Login failed');
    }

    const { user: userData } = data;

    setUser(userData);

    return userData;
  };

  const logout = async () => {
    try {
      await apiClient.POST('/v1/logout');
    } catch (_error) {
      // Clear local state even if the server is unavailable.
    }
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
