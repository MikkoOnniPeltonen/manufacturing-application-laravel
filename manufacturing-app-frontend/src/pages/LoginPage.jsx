import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = '/';

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}!`);
      navigate(from, { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset the demo data? This will clear all sales and restored the initial state.',
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/reset-demo');
      toast.success('Demo data has been reset.');
    } catch (_error) {
      toast.error('Failed to reset demo data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 shadow-xl">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg border-b border-blue-500">
          <CardTitle className="text-2xl font-bold">Manufacturing System</CardTitle>
          <CardDescription className="text-blue-100">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@manufacturing.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-blue-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 text-sm text-slate-500">
            <p className="font-medium text-slate-400">Test Accounts:</p>
            <p>Manager: manager@manufacturing.com</p>
            <p>Admin: admin@manufacturing.com</p>
            <p>Password: SecurePass2026!</p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetDemo}
              disabled={isLoading}
              className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              Reset Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
