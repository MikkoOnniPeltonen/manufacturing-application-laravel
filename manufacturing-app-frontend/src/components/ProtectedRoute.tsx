import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

function RoleRoute({
  allowed,
  loading,
  message,
}: { allowed: boolean; loading: boolean; message: string }) {
  const location = useLocation();
  useEffect(() => {
    if (!loading && !allowed) toast.error(message, { id: 'access-denied' });
  }, [allowed, loading, message]);
  if (loading) return <LoadingSpinner />;
  if (!allowed) return <Navigate to="/" state={{ from: location }} replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { canAccessCustomers, loading } = useAuth();
  return (
    <RoleRoute allowed={canAccessCustomers()} loading={loading} message="Admin access required." />
  );
}

export function ManagerRoute() {
  const { canAccessProduction, loading } = useAuth();
  return (
    <RoleRoute
      allowed={canAccessProduction()}
      loading={loading}
      message="Production access required."
    />
  );
}
