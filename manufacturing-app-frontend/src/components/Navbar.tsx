import { Button } from '@/components/ui/button';
import { ChevronRight, Factory, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const [customerName, setCustomerName] = useState('Customer');
  const { user, logout, isAuthenticated, canAccessCustomers, canAccessProduction } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const customerId = location.pathname.match(/^\/customers\/(\d+)/)?.[1];

  useEffect(() => {
    let cancelled = false;
    if (customerId && isAuthenticated) {
      setCustomerName('Customer');
      apiClient
        .GET('/v1/customers/{customer}', { params: { path: { customer: Number(customerId) } } })
        .then(({ data }) => {
          if (!cancelled && data) setCustomerName(data.name);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [customerId, isAuthenticated]);

  if (location.pathname === '/login' || !isAuthenticated) return null;

  const links = [
    { to: '/', label: 'Dashboard', visible: true },
    { to: '/manager-view', label: 'Production', visible: canAccessProduction() },
    { to: '/orders', label: 'Orders', visible: canAccessCustomers() },
    { to: '/customers', label: 'Customers', visible: canAccessCustomers() },
    { to: '/admin/history', label: 'History', visible: canAccessCustomers() },
    { to: '/admin/audit', label: 'Audit', visible: canAccessCustomers() },
    { to: '/admin/operations', label: 'Operations', visible: canAccessCustomers() },
  ];
  const currentPage = links.find(link => link.to !== '/' && location.pathname.startsWith(link.to));
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Unable to log out. Please try again.');
    }
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 py-4">
          <Link
            to="/"
            aria-label="Manufacturing home"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-accent">
              <Factory className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">
              Manufacturing
              <span className="block text-xs font-normal tracking-normal text-muted-foreground">
                Operations workspace
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs capitalize text-muted-foreground">{user?.roles?.[0]?.name}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 bg-card">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log Out
            </Button>
          </div>
        </div>
        <nav aria-label="Workspace" className="flex flex-wrap gap-1 pb-3">
          {links
            .filter(link => link.visible)
            .map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'bg-accent/50 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
        </nav>
        {customerId && (
          <nav
            aria-label="Customer breadcrumb"
            className="flex flex-wrap items-center gap-2 border-t border-border py-3 text-sm text-muted-foreground"
          >
            <Link to="/customers" className="hover:text-primary">
              Customers
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <Link to={`/customers/${customerId}`} className="hover:text-primary">
              {customerName}
            </Link>
            {location.pathname.endsWith('/edit') && (
              <>
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit</span>
              </>
            )}
          </nav>
        )}
        {!customerId && currentPage && (
          <span className="sr-only">Current section: {currentPage.label}</span>
        )}
      </div>
    </header>
  );
}

export default Navbar;
