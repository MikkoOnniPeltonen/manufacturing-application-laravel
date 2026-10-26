import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  Boxes,
  Check,
  Eye,
  EyeOff,
  Factory,
  Loader2,
  PackageCheck,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}!`);
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to sign in. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-[#f6f5f1] text-[#192821] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col overflow-hidden bg-[#192e26] px-12 py-10 text-white lg:flex xl:px-20">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d2e3a5] text-[#192e26]">
            <Factory className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Manufacturing</span>
        </div>

        <div className="relative z-10 my-auto max-w-lg py-20">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.22em] text-[#bdcdbf]">
            Your operations, connected
          </p>
          <h1 className="text-5xl font-medium leading-[1.12] tracking-[-0.045em] xl:text-6xl">
            Less friction.
            <br />
            <span className="text-[#d2e3a5]">More flow.</span>
          </h1>
          <p className="mt-7 max-w-sm text-base leading-7 text-[#bdcdbf]">
            Bring your orders, production lines and customer relationships into one focused
            workspace.
          </p>

          <div className="mt-14 rounded-2xl border border-white/15 bg-white/[0.04] p-6">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.16em] text-[#bdcdbf]">
              From order to delivery
            </p>
            <div className="flex items-center" aria-hidden="true">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d2e3a5] text-[#192e26]">
                <Boxes className="h-5 w-5" />
              </span>
              <span className="mx-3 h-px flex-1 bg-white/20" />
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 text-[#d2e3a5]">
                <Factory className="h-5 w-5" />
              </span>
              <span className="mx-3 h-px flex-1 bg-white/20" />
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 text-[#d2e3a5]">
                <PackageCheck className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-3 flex justify-between text-xs text-[#d0d9d3]">
              <span>Plan orders</span>
              <span>Run production</span>
              <span>Deliver</span>
            </div>
          </div>
        </div>

        <p className="text-xs tracking-wide text-[#bdcdbf]">
          Built around the way your team works.
        </p>
      </section>

      <section
        className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-12 xl:px-20"
        aria-labelledby="sign-in-heading"
      >
        <div className="flex items-center gap-3 lg:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#192e26] text-[#d2e3a5]">
            <Factory className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-semibold tracking-tight">Manufacturing</p>
            <p className="text-xs text-[#66736b]">Operations workspace</p>
          </div>
        </div>
        <div className="my-auto w-full max-w-sm self-center py-14 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce1d7] bg-[#edf0e7] px-3 py-1.5 text-xs font-medium text-[#526445]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#648347]" aria-hidden="true" />
            Operations workspace
          </span>
          <h2
            id="sign-in-heading"
            className="mt-7 text-4xl font-semibold tracking-[-0.045em] sm:text-[2.75rem]"
          >
            Welcome back.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#66736b]">
            Sign in to pick up where your team left off.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#25392e]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-lg border-[#d7ddd4] bg-white px-4 text-[#192821] shadow-sm placeholder:text-[#8b948d] focus-visible:ring-[#60834a] focus-visible:ring-offset-[#f6f5f1]"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-sm font-medium text-[#25392e]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 rounded-lg border-[#d7ddd4] bg-white pl-4 pr-12 text-[#192821] shadow-sm placeholder:text-[#8b948d] focus-visible:ring-[#60834a] focus-visible:ring-offset-[#f6f5f1]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(value => !value)}
                  disabled={isLoading}
                  className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-md text-[#66736b] transition-colors hover:bg-[#edf0e7] hover:text-[#192821] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60834a] disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
              >
                {errorMessage}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full gap-3 rounded-lg bg-[#243f30] text-sm font-medium text-white shadow-sm hover:bg-[#31543f] focus-visible:ring-[#60834a] focus-visible:ring-offset-[#f6f5f1]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 flex items-start gap-2.5 text-xs leading-5 text-[#66736b]">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Need access? Contact your workspace administrator.</p>
          </div>
          {import.meta.env.VITE_DEMO_MODE === 'true' && (
            <div className="mt-6 rounded-lg border border-[#dce1d7] bg-[#edf0e7] p-4 text-xs leading-6 text-[#526445]">
              <p className="font-semibold">Demo accounts</p>
              <p>Manager: manager@manufacturing.com</p>
              <p>Admin: admin@manufacturing.com</p>
              <p>Password: SecurePass2026!</p>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-[#7b857d]">
          One workspace. Every step of production.
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
