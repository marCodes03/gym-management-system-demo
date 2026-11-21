import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api, { setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'gym_auth_token',
  USER: 'gym_auth_user',
  ACTIVE_SCREEN: 'gym_active_screen',
};

export function getDefaultScreenForRole(roleCode) {
  return roleCode === 'ADMIN' ? 'dashboard' : 'check-in';
}

function readStoredToken() {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN) || null;
  } catch {
    return null;
  }
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStoredScreen(user) {
  if (!user) return 'login';
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEYS.ACTIVE_SCREEN);
    if (saved && saved !== 'login') return saved;
  } catch {
    // Ignore storage read errors
  }
  return getDefaultScreenForRole(user.role_code);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredToken());
  const [user, setUser] = useState(() => {
    const storedToken = readStoredToken();
    return storedToken ? readStoredUser() : null;
  });
  const [activeScreen, setActiveScreenState] = useState(() => {
    const storedToken = readStoredToken();
    const storedUser = storedToken ? readStoredUser() : null;
    return readStoredScreen(storedUser);
  });

  const setActiveScreen = useCallback((screen) => {
    setActiveScreenState(screen);
    try {
      if (screen && screen !== 'login') {
        localStorage.setItem(AUTH_STORAGE_KEYS.ACTIVE_SCREEN, screen);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEYS.ACTIVE_SCREEN);
      }
    } catch {
      // Ignore storage write errors
    }
  }, []);

  /**
   * Authenticate via email & password against POST /api/v1/auth/login,
   * or hydrate directly if called with `{ token, user }`.
   */
  const login = useCallback(async (emailOrPayload, password) => {
    let sessionToken;
    let sessionUser;

    if (
      typeof emailOrPayload === 'object' &&
      emailOrPayload !== null &&
      emailOrPayload.token &&
      emailOrPayload.user
    ) {
      sessionToken = emailOrPayload.token;
      sessionUser = emailOrPayload.user;
    } else {
      const response = await api.post(
        '/auth/login',
        { email: emailOrPayload, password },
        { skipAuth: true }
      );
      sessionToken = response?.data?.token;
      sessionUser = response?.data?.user;
    }

    if (!sessionToken || !sessionUser) {
      throw new Error('Unexpected authentication response from server.');
    }

    const defaultScreen = getDefaultScreenForRole(sessionUser.role_code);

    setAuthToken(sessionToken);
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, sessionToken);
      localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(sessionUser));
      localStorage.setItem(AUTH_STORAGE_KEYS.ACTIVE_SCREEN, defaultScreen);
    } catch {
      // Ignore storage write errors
    }

    setToken(sessionToken);
    setUser(sessionUser);
    setActiveScreenState(defaultScreen);

    return { token: sessionToken, user: sessionUser };
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
      localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
      localStorage.removeItem(AUTH_STORAGE_KEYS.ACTIVE_SCREEN);
    } catch {
      // Ignore storage errors
    }
    setToken(null);
    setUser(null);
    setActiveScreenState('login');
  }, []);

  const updateUser = useCallback((partialUser) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partialUser };
      try {
        localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  }, []);

  const isAdmin = user?.role_code === 'ADMIN';
  const isFrontDesk = user?.role_code === 'FRONT_DESK';
  const isAuthenticated = Boolean(token && user);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isAdmin,
      isFrontDesk,
      activeScreen,
      setActiveScreen,
      login,
      logout,
      updateUser,
    }),
    [
      user,
      token,
      isAuthenticated,
      isAdmin,
      isFrontDesk,
      activeScreen,
      setActiveScreen,
      login,
      logout,
      updateUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return ctx;
}

export default AuthContext;
