import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const extractCustomerId = path => {
  const match = path.match(/\/customers\/(\d+)/);
  return match ? match[1] : null;
};

function Navbar() {
  const [customerName, setCustomerName] = useState('');
  const { user, logout, isAuthenticated, canAccessCustomers } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const customerId = extractCustomerId(location.pathname);
    if (customerId && isAuthenticated) {
      apiClient
        .GET('/v1/customers/{customer}', { params: { path: { customer: Number(customerId) } } })
        .then(({ data, error }) => {
          if (error || !data) throw error ?? new Error('Unable to load customer.');
          setCustomerName(data.name);
        })
        .catch(err => {
          console.error('Error fetching customer: ', err);
          setCustomerName('Customer');
        });
    } else {
      setCustomerName('');
    }
  }, [location, isAuthenticated]);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathLength = pathSegments.length;
  const isEditPage = pathSegments.includes('edit');
  const isLoginPage = pathSegments.includes('login');

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const renderAllCustomers = () => {
    if (pathLength === 1) {
      return <BreadcrumbPage className="text-white font-semibold">All Customers</BreadcrumbPage>;
    }
    if (isEditPage) {
      return <BreadcrumbEllipsis className="text-slate-400" />;
    }
    return (
      <Link to="/customers" className="hover:text-white transition-colors">
        All Customers
      </Link>
    );
  };

  // Don't show navbar on login page
  if (isLoginPage) return null;

  return (
    <header className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 text-slate-300 shadow-sm">
      <Breadcrumb>
        <BreadcrumbList className="text-slate-400">
          <BreadcrumbItem>
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-slate-600" />

          {pathSegments.includes('manager-view') && (
            <BreadcrumbItem>
              <BreadcrumbPage className="text-white font-semibold">Manager View</BreadcrumbPage>
            </BreadcrumbItem>
          )}

          {pathSegments.includes('customers') && canAccessCustomers() && (
            <>
              <BreadcrumbItem>{renderAllCustomers()}</BreadcrumbItem>
              {pathLength >= 2 && (
                <>
                  <BreadcrumbSeparator className="text-slate-600" />
                  <BreadcrumbItem>
                    {pathLength === 2 ? (
                      <BreadcrumbPage className="text-white font-semibold">
                        {pathSegments[1] === 'create' ? 'Create' : customerName}
                      </BreadcrumbPage>
                    ) : (
                      <Link
                        to={`customers/${pathSegments[1]}`}
                        className="hover:text-white transition-colors"
                      >
                        {customerName}
                      </Link>
                    )}
                  </BreadcrumbItem>
                </>
              )}

              {isEditPage && (
                <>
                  <BreadcrumbSeparator className="text-slate-600" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-white font-semibold">Edit</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {isAuthenticated && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            {user?.name} <span className="text-slate-600">|</span>{' '}
            <span className="text-blue-400">{user?.roles?.[0]?.name}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Log Out
          </Button>
        </div>
      )}
    </header>
  );
}

export default Navbar;
