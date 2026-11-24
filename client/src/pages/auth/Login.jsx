import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth, dashboardPathFor } from '../../context/AuthContext.jsx';
import { errorMessage } from '../../api/client.js';
import { Button, Field, Input } from '../../components/ui/index.jsx';
import AuthShell from './AuthShell.jsx';

/** Only allow in-app redirects (no //evil.com or absolute URLs). */
export const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null);

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={next || dashboardPathFor(user)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.fullName.split(' ')[0]}`);
      navigate(next || dashboardPathFor(u), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell
      title="Log in to DeskFolio"
      subtitle="Pick up where you left off."
      footer={
        <>
          New here?{' '}
          <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-indigo-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email">
          {(id) => <Input id={id} type="email" autoComplete="email" required value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="Password">
          {(id) => (
            <Input id={id} type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} />
          )}
        </Field>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Log in
        </Button>
      </form>
    </AuthShell>
  );
}
