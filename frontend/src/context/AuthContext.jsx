import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('setcs_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.verifyToken(token)
        .then(res => {
          if (res.success) {
            setUser(res.data);
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    if (res.success) {
      const { token: t, user: u } = res.data;
      sessionStorage.setItem('setcs_token', t);
      setToken(t);
      setUser(u);
    }
    return res;
  };

  const register = async (data) => {
    const res = await api.register(data);
    return res;
  };

  const completeProfile = async (data) => {
    const res = await api.completeProfile(data);
    if (res.success && res.data) {
      const { token: t, user: u } = res.data;
      sessionStorage.setItem('setcs_token', t);
      setToken(t);
      setUser(u);
    }
    return res;
  };

  const logout = () => {
    sessionStorage.removeItem('setcs_token');
    localStorage.removeItem('setcs_token');
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles) => user && roles.includes(user.role);
  const hasPermission = (perm) => user && user.permissions && user.permissions.includes(perm);
  const needsSetup = user && user.profileCompleted === false;

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, register, completeProfile, logout,
      hasRole, hasPermission, isAuthenticated: !!user, needsSetup
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
