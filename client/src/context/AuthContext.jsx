import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStore } from '../api/client.js';
import { authApi } from '../api/endpoints.js';

const AuthContext = createContext(null);

export function dashboardPathFor(user) {
  if (user?.role === 'EDUCATOR') return '/dashboard/educator';
  if (user?.role === 'STUDENT') return '/dashboard/student';
  return '/leaderboard';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [educatorProfile, setEducatorProfile] = useState(null);
  // 'loading' until a stored token has been checked against /auth/me
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'ready'));

  const applySession = useCallback((res) => {
    if (res.token) tokenStore.set(res.token);
    setUser(res.user);
    setEducatorProfile(res.educatorProfile ?? null);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setEducatorProfile(null);
  }, []);

  const refresh = useCallback(async () => {
    const res = await authApi.me();
    applySession(res);
    return res;
  }, [applySession]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    refresh()
      .catch(logout)
      .finally(() => setStatus('ready'));
  }, [refresh, logout]);

  // The axios interceptor fires this when the API rejects our token.
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      educatorProfile,
      status,
      isAuthenticated: Boolean(user),
      login: async (email, password) => applySession(await authApi.login({ email, password })),
      register: async (body) => applySession(await authApi.register(body)),
      logout,
      refresh,
    }),
    [user, educatorProfile, status, applySession, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
