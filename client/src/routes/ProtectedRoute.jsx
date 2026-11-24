import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, dashboardPathFor } from '../context/AuthContext.jsx';
import { PageSpinner } from '../components/ui/index.jsx';

/** Requires a signed-in user; with `roles`, also requires one of those roles. */
export function ProtectedRoute({ roles }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageSpinner />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardPathFor(user)} replace />;
  }
  return <Outlet />;
}

export function DashboardRedirect() {
  const { user } = useAuth();
  return <Navigate to={dashboardPathFor(user)} replace />;
}
