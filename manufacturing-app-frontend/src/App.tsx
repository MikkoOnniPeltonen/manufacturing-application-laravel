import Navbar from './components/Navbar';
import { AdminRoute, ManagerRoute, ProtectedRoute } from './components/ProtectedRoute';

import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { Route, Routes } from 'react-router-dom';
import './App.css';

const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const OperationsPage = lazy(() => import('./pages/OperationsPage'));

const AllCustomersPage = lazy(() => import('./pages/AllCustomersPage'));
const CreateCustomerPage = lazy(() => import('./pages/CreateCustomerPage'));
const CustomerPage = lazy(() => import('./pages/CustomerPage'));
const EditCustomerPage = lazy(() => import('./pages/EditCustomerPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ManagerViewPage = lazy(() => import('./pages/ManagerViewPage'));
const ProductionHistoryPage = lazy(() => import('./pages/ProductionHistoryPage'));

function RouteLoadingFallback() {
  return (
    <output className="min-h-screen flex items-center justify-center" aria-live="polite">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/25" />
      <span className="sr-only">Loading page</span>
    </output>
  );
}

function App() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route element={<ManagerRoute />}>
              <Route path="/manager-view" element={<ManagerViewPage />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/admin/audit" element={<AuditPage />} />
              <Route path="/admin/operations" element={<OperationsPage />} />
              <Route path="/admin/history" element={<ProductionHistoryPage />} />
              <Route path="/customers" element={<AllCustomersPage />} />
              <Route path="/customers/:customerId" element={<CustomerPage />} />
              <Route path="/customers/:customerId/edit" element={<EditCustomerPage />} />
              <Route path="/customers/create" element={<CreateCustomerPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="bottom-right" reverseOrder={false} />
    </>
  );
}

export default App;
