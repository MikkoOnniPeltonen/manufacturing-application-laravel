import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  canAccessProduction: () => boolean;
  canAccessCustomers: () => boolean;
  isAuthenticated: boolean;
}
import { currentUser, loginUser, logoutUser } from '../api/auth';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verifyToken();
    const expire = () => {
      setUser(null);
      queryClient.cancelQueries().then(() => queryClient.clear());
    };
    window.addEventListener('auth:expired', expire);
    return () => window.removeEventListener('auth:expired', expire);
  }, []);

  const verifyToken = async () => {
    try {
      setUser(await currentUser());
    } catch (_error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const userData = await loginUser(email, password);

    await queryClient.cancelQueries();
    queryClient.clear();
    setUser(userData);

    return userData;
  };

  const logout = async () => {
    await logoutUser();
    await queryClient.cancelQueries();
    queryClient.clear();
    setUser(null);
  };

  const hasRole = (role: string) => {
    if (!user?.roles) return false;
    return user.roles.some(r => r.name === role);
  };

  const isAdmin = () => hasRole('admin');
  const isManager = () => hasRole('manager');
  const canAccessProduction = () => isManager() || isAdmin();
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
