import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUserRequest, loginRequest } from '../services/authService.js';
import { setAuthToken } from '../services/apiClient.js';

const AuthContext = createContext(null);
const storageKey = 'aacs_vendor_booths_auth';

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function writeStoredSession(session) {
  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

function clearStoredSession() {
  window.localStorage.removeItem(storageKey);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredSession()?.token || null);
  const [user, setUser] = useState(() => readStoredSession()?.user || null);
  const [vendorProfile, setVendorProfile] = useState(
    () => readStoredSession()?.vendorProfile || null
  );
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(token));

  useEffect(() => {
    setAuthToken(token);

    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    let isMounted = true;

    getCurrentUserRequest()
      .then((data) => {
        if (!isMounted) return;
        setUser(data.user);
        setVendorProfile(data.vendorProfile || null);
        writeStoredSession({
          token,
          user: data.user,
          vendorProfile: data.vendorProfile || null
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setToken(null);
        setUser(null);
        setVendorProfile(null);
        setAuthToken(null);
        clearStoredSession();
      })
      .finally(() => {
        if (isMounted) setIsBootstrapping(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function login(credentials) {
    const data = await loginRequest(credentials);

    setToken(data.token);
    setUser(data.user);
    setVendorProfile(data.vendorProfile || null);
    setAuthToken(data.token);
    writeStoredSession({
      token: data.token,
      user: data.user,
      vendorProfile: data.vendorProfile || null
    });

    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    setVendorProfile(null);
    setAuthToken(null);
    clearStoredSession();
  }

  const value = useMemo(
    () => ({
      token,
      user,
      vendorProfile,
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      login,
      logout
    }),
    [token, user, vendorProfile, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
