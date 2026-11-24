import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Trophy, X } from 'lucide-react';
import { useAuth, dashboardPathFor } from '../../context/AuthContext.jsx';
import { Avatar, Button, cx } from '../ui/index.jsx';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-zinc-900">
      <img src="/favicon.svg" alt="" className="size-7" />
      DeskFolio
    </Link>
  );
}

const linkClass = ({ isActive }) =>
  cx(
    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  );

export default function Navbar() {
  const { user, logout, status } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const signOut = () => {
    logout();
    navigate('/');
  };

  const links = (
    <>
      <NavLink to="/leaderboard" className={linkClass}>
        <Trophy className="size-4" /> Leaderboard
      </NavLink>
      {user && (
        <NavLink to={dashboardPathFor(user)} className={linkClass}>
          <LayoutDashboard className="size-4" /> Dashboard
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">{links}</nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {status === 'loading' ? null : user ? (
            <>
              <div className="flex items-center gap-2 pr-1">
                <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
                <div className="leading-tight">
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-zinc-500 capitalize">{user.role.toLowerCase()}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut} aria-label="Log out">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" size="sm">
                Log in
              </Button>
              <Button as={Link} to="/register" size="sm">
                Get started
              </Button>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-200/80 bg-white px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-3">{links}</nav>
          <div className="mt-3 border-t border-zinc-100 pt-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={user.fullName} size="sm" />
                  <span className="text-sm font-medium">{user.fullName}</span>
                </div>
                <Button variant="secondary" size="sm" onClick={signOut}>
                  <LogOut className="size-4" /> Log out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button as={Link} to="/login" variant="secondary">
                  Log in
                </Button>
                <Button as={Link} to="/register">
                  Get started
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
