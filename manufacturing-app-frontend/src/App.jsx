import AllCustomersPage from './pages/AllCustomersPage';
import CreateCustomerPage from './pages/CreateCustomerPage';
import CustomerPage from './pages/CustomerPage';
import EditCustomerPage from './pages/EditCustomerPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ManagerViewPage from './pages/ManagerViewPage';
import ProductionHistoryPage from './pages/ProductionHistoryPage';

import Navbar from './components/Navbar';
import { AdminRoute, ManagerRoute, ProtectedRoute } from './components/ProtectedRoute';

import { Toaster } from 'react-hot-toast';
import { Route, Routes } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes - require authentication */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          {/* Manager-only routes */}
          <Route element={<ManagerRoute />}>
            <Route path="/manager-view" element={<ManagerViewPage />} />
          </Route>

          {/* Admin-only routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/history" element={<ProductionHistoryPage />} />
            <Route path="/customers" element={<AllCustomersPage />} />
            <Route path="/customers/:customerId" element={<CustomerPage />} />
            <Route path="/customers/:customerId/edit" element={<EditCustomerPage />} />
            <Route path="/customers/create" element={<CreateCustomerPage />} />
          </Route>
        </Route>
      </Routes>
      <Toaster position="bottom-right" reverseOrder={false} />
    </>
  );
}

export default App;
