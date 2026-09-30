import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wt_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('wt_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const d = await api.login({ email, password });
    localStorage.setItem('wt_token', d.token);
    setUser(d.user);
    return d.user;
  }

  async function register(payload) {
    const d = await api.register(payload);
    localStorage.setItem('wt_token', d.token);
    setUser(d.user);
    return d.user;
  }

  async function logout() {
    try { await api.logout(); } catch {}
    localStorage.removeItem('wt_token');
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
