import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/auth';
import { Button, Input } from '../ui';

type Mode = 'login' | 'register';

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      mode === 'login'
        ? authApi.login({ email: form.email, password: form.password })
        : authApi.register({ email: form.email, password: form.password, name: form.name }),

    onSuccess: ({ token, user }) => {
      setAuth(token, user);
      toast.success(mode === 'login' ? `Welcome back, ${user.name}!` : `Account created!`);
      navigate('/boards');
    },

    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      // Try to parse field errors from the server
      const axiosErr = err as { response?: { data?: { error?: { details?: Record<string, string[]> } } } };
      const details = axiosErr.response?.data?.error?.details;
      if (details) {
        setErrors(Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v[0]])));
      } else {
        toast.error(message);
      }
    },
  });

  function handleChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    mutation.mutate();
  }

  function switchMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setErrors({});
    setForm({ email: '', password: '', name: '' });
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[--color-text-primary] text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <TaskFlowLogo />
            <span className="text-xl font-semibold tracking-tight">TaskFlow</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-light leading-tight tracking-tight">
            Collaborate on tasks,
            <br />
            <span className="font-semibold">in real time.</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-sm">
            A lightweight Kanban board that syncs across browsers the moment you make a change.
          </p>

          {/* Feature list */}
          <ul className="space-y-3">
            {[
              'Drag and drop cards across columns',
              'Real-time collaboration with your team',
              'Invite members by email',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/70 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-white/30 text-xs">© 2024 TaskFlow</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[--color-bg]">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <TaskFlowLogo />
            <span className="text-lg font-semibold text-[--color-text-primary]">TaskFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[--color-text-primary] tracking-tight">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              {mode === 'login'
                ? 'Welcome back. Enter your details to continue.'
                : 'Get started with a free account.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Name"
                type="text"
                placeholder="Alice"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
                autoComplete="name"
                autoFocus
              />
            )}

            <Input
              label="Email"
              type="email"
              placeholder="alice@example.com"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              autoComplete="email"
              autoFocus={mode === 'login'}
            />

            <Input
              label="Password"
              type="password"
              placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            <Button
              type="submit"
              size="lg"
              loading={mutation.isPending}
              className="w-full mt-2"
            >
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-[--color-text-muted]">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>{' '}
            <button
              onClick={switchMode}
              className="text-sm font-medium text-[--color-accent] hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </div>

          {mode === 'login' && (
            <div className="mt-8 p-4 rounded-lg bg-[--color-surface] border border-[--color-border]">
              <p className="text-xs font-medium text-[--color-text-secondary] mb-2">Demo credentials</p>
              <div className="space-y-1">
                <p className="text-xs text-[--color-text-muted] font-mono">alice@example.com</p>
                <p className="text-xs text-[--color-text-muted] font-mono">password123</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm({ email: 'alice@example.com', password: 'password123', name: '' });
                }}
                className="mt-2 text-xs text-[--color-accent] hover:underline"
              >
                Fill in demo credentials →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskFlowLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="7" fill="currentColor" className="text-[--color-accent]" />
      <rect x="6" y="7" width="6" height="6" rx="1.5" fill="white" />
      <rect x="6" y="15" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
      <rect x="14" y="7" width="8" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
      <rect x="14" y="12" width="6" height="3" rx="1.5" fill="white" fillOpacity="0.6" />
      <rect x="14" y="17" width="4" height="3" rx="1.5" fill="white" fillOpacity="0.3" />
    </svg>
  );
}