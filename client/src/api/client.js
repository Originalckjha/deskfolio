import axios from 'axios';

const TOKEN_KEY = 'deskfolio_token';

// Storage can throw (private mode, blocked site data), so every access is guarded.
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* session-only login */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 60_000, // uploads and Render cold starts can be slow
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // An expired or revoked token: drop it and let AuthContext reset the session.
    if (err.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  },
);

/** Human-readable message from an API/axios error. */
export function errorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  if (data?.details?.length) {
    const d = data.details[0];
    return d.field ? `${capitalize(d.field)}: ${d.message}` : d.message;
  }
  if (data?.message) return data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  return err?.message || fallback;
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
