import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('autiassist_token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('autiassist_token');
    if (storedToken) {
      api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
    }

    if (!storedToken) {
      setLoading(false);
      return;
    }

    api.get('/api/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('autiassist_token');
        setToken('');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    const authToken = response.data.access_token;
    localStorage.setItem('autiassist_token', authToken);
    api.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(response.data.user);
    return response.data;
  };

  const signup = async (payload) => {
    const response = await api.post('/api/auth/signup', payload);
    const authToken = response.data.access_token;
    localStorage.setItem('autiassist_token', authToken);
    api.defaults.headers.common.Authorization = `Bearer ${authToken}`;
    setToken(authToken);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('autiassist_token');
    delete api.defaults.headers.common.Authorization;
    setToken('');
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, loading, login, signup, logout, setUser }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
