import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import { ProtectedRoute, DashboardRedirect } from './routes/ProtectedRoute.jsx';
import { PageSpinner } from './components/ui/index.jsx';
import Landing from './pages/public/Landing.jsx';
import Leaderboard from './pages/public/Leaderboard.jsx';
import NotFound from './pages/public/NotFound.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';

// Pages that pull in the Markdown renderer/editor load on demand.
const EducatorProfile = lazy(() => import('./pages/public/EducatorProfile.jsx'));
const EducatorDashboard = lazy(() => import('./pages/dashboard/EducatorDashboard.jsx'));
const StudentDashboard = lazy(() => import('./pages/dashboard/StudentDashboard.jsx'));
const SpacePage = lazy(() => import('./pages/dashboard/SpacePage.jsx'));
const QuickRevision = lazy(() => import('./pages/dashboard/QuickRevision.jsx'));

export default function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Landing />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="e/:slug" element={<EducatorProfile />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          {/* Public spaces are viewable signed-out; the page asks the API what this viewer may see. */}
          <Route path="spaces/:spaceId" element={<SpacePage />} />

          <Route path="dashboard" element={<ProtectedRoute />}>
            <Route index element={<DashboardRedirect />} />
          </Route>
          <Route path="dashboard/educator" element={<ProtectedRoute roles={['EDUCATOR']} />}>
            <Route index element={<EducatorDashboard />} />
          </Route>
          <Route path="dashboard/student" element={<ProtectedRoute roles={['STUDENT']} />}>
            <Route index element={<StudentDashboard />} />
          </Route>

          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Distraction-free reader, outside the main layout */}
        <Route path="read/:itemId" element={<QuickRevision />} />
      </Routes>
    </Suspense>
  );
}
