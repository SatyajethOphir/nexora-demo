import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DemoUser } from '../types';
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '../utils/storage';

interface AuthContextValue {
  user: DemoUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { ok: boolean; message: string };
  register: (name: string, email: string, password: string) => { ok: boolean; message: string };
  logout: () => void;
  updateProfile: (name: string) => { ok: boolean; message: string };
  requestPasswordReset: (email: string) => { ok: boolean; message: string };
}

const DEFAULT_DEMO_USER: DemoUser = {
  id: 'usr-demo-1',
  name: 'Rohan Sharma',
  email: 'demo@nexora.shop',
  passwordHash: btoa('Demo@1234'),
  createdAt: '2026-10-01T08:00:00.000Z',
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<DemoUser[]>(() => {
    const stored = readStorage<DemoUser[]>(STORAGE_KEYS.USERS, []);
    if (stored.length === 0) {
      writeStorage(STORAGE_KEYS.USERS, [DEFAULT_DEMO_USER]);
      return [DEFAULT_DEMO_USER];
    }
    return stored;
  });

  const [user, setUser] = useState<DemoUser | null>(() =>
    readStorage<DemoUser | null>(STORAGE_KEYS.SESSION, null)
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.USERS, users);
  }, [users]);

  const login = useCallback(
    (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const found = users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (!found) {
        return { ok: false, message: 'No demo account found with that email address.' };
      }
      if (found.passwordHash !== btoa(password)) {
        return { ok: false, message: 'Incorrect password. Please try again.' };
      }
      setUser(found);
      writeStorage(STORAGE_KEYS.SESSION, found);
      return { ok: true, message: `Welcome back, ${found.name}.` };
    },
    [users]
  );

  const register = useCallback(
    (name: string, email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const exists = users.some((u) => u.email.toLowerCase() === normalizedEmail);
      if (exists) {
        return { ok: false, message: 'An account with this email already exists in demo storage.' };
      }
      const newUser: DemoUser = {
        id: `usr-${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: btoa(password),
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
      setUser(newUser);
      writeStorage(STORAGE_KEYS.SESSION, newUser);
      return { ok: true, message: 'Demo account created and signed in.' };
    },
    [users]
  );

  const logout = useCallback(() => {
    setUser(null);
    removeStorage(STORAGE_KEYS.SESSION);
  }, []);

  const updateProfile = useCallback(
    (name: string) => {
      if (!user) return { ok: false, message: 'Not signed in.' };
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        return { ok: false, message: 'Name must be at least 2 characters.' };
      }
      const updated = { ...user, name: trimmed };
      setUser(updated);
      writeStorage(STORAGE_KEYS.SESSION, updated);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      return { ok: true, message: 'Demo profile updated.' };
    },
    [user]
  );

  const requestPasswordReset = useCallback(
    (email: string) => {
      const normalized = email.trim().toLowerCase();
      const found = users.find((u) => u.email.toLowerCase() === normalized);
      if (!found) {
        return {
          ok: true,
          message:
            'If a demo account matches this email, a simulated reset notice has been logged locally.',
        };
      }
      return {
        ok: true,
        message: `Demo reset verified for ${found.email}. In this local demonstration, you may sign in or create a new demo account anytime.`,
      };
    },
    [users]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
