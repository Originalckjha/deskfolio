import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Presentation } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, dashboardPathFor } from '../../context/AuthContext.jsx';
import { errorMessage } from '../../api/client.js';
import { Button, Field, Input, Textarea, cx } from '../../components/ui/index.jsx';
import AuthShell from './AuthShell.jsx';
import { safeNext } from './Login.jsx';

const roles = [
  { value: 'STUDENT', label: 'Student', hint: 'Join classes with a code', icon: GraduationCap },
  { value: 'EDUCATOR', label: 'Educator', hint: 'Create spaces and share notes', icon: Presentation },
];

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: params.get('role') === 'EDUCATOR' ? 'EDUCATOR' : 'STUDENT',
    subjects: '',
    bio: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={next || dashboardPathFor(user)} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isEducator = form.role === 'EDUCATOR';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    const subjects = form.subjects.split(',').map((s) => s.trim()).filter(Boolean);
    if (isEducator && subjects.length === 0) return setError('Add at least one subject you teach');

    setLoading(true);
    try {
      const u = await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(isEducator && { subjects, bio: form.bio }),
      });
      toast.success('Account created');
      navigate(next || dashboardPathFor(u), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free for educators and students."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-zinc-700">I am a</legend>
          <div className="grid grid-cols-2 gap-2">
            {roles.map(({ value, label, hint, icon: Icon }) => (
              <label
                key={value}
                className={cx(
                  'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition',
                  form.role === value
                    ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-zinc-200 hover:border-zinc-300',
                )}
              >
                <input type="radio" name="role" value={value} checked={form.role === value} onChange={set('role')} className="sr-only" />
                <Icon className={cx('size-5', form.role === value ? 'text-indigo-600' : 'text-zinc-400')} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-zinc-500">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Full name">
          {(id) => <Input id={id} autoComplete="name" required value={form.fullName} onChange={set('fullName')} />}
        </Field>
        <Field label="Email">
          {(id) => <Input id={id} type="email" autoComplete="email" required value={form.email} onChange={set('email')} />}
        </Field>
        <Field label="Password" hint="At least 8 characters">
          {(id) => (
            <Input id={id} type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
          )}
        </Field>

        {isEducator && (
          <>
            <Field label="Subjects you teach" hint="Comma-separated, e.g. Physics, Maths">
              {(id) => <Input id={id} value={form.subjects} onChange={set('subjects')} placeholder="Physics, Maths" />}
            </Field>
            <Field label="Short bio" hint="Shown on your public profile">
              {(id) => <Textarea id={id} rows={3} maxLength={1000} value={form.bio} onChange={set('bio')} />}
            </Field>
          </>
        )}

        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Create {isEducator ? 'educator' : 'student'} account
        </Button>
      </form>
    </AuthShell>
  );
}
