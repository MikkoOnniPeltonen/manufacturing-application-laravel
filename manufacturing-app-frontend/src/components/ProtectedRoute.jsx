import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Requires authentication
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// Requires admin role
export function AdminRoute() {
  const { canAccessCustomers, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  useEffect(() => {
    if (!loading && !canAccessCustomers()) {
      toast.error('Access Denied: Admin access required.', {
        id: 'admin-access-denied',
      });
    }
  }, [loading, canAccessCustomers]);

  if (!canAccessCustomers()) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// Requires manager or admin role
export function ManagerRoute() {
  const { canAccessProduction, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  useEffect(() => {
    if (!loading && !canAccessProduction()) {
      toast.error('Access Denied: Production access required.', {
        id: 'manager-access-denied', // Prevent duplicate toasts
      });
    }
  }, [loading, canAccessProduction]);

  if (!canAccessProduction()) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
