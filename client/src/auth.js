import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      axios.get(apiBase + '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setUser(r.data.user))
        .catch(() => setUser(null));
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token, apiBase]);

  const value = useMemo(() => ({ token, setToken, user, setUser }), [token, user]);
  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() { return useContext(AuthContext); }
