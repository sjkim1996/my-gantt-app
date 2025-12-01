'use client';

import { UserRole } from './authShared';

// Lightweight client-side cache so the UI can react immediately without waiting for server.
export const LOGIN_TOKEN_KEY = 'loginToken';
export const LOGIN_TOKEN_VALUE = 'capra-login';

export const setLoginToken = (session?: { id: string; role: UserRole }) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LOGIN_TOKEN_KEY, LOGIN_TOKEN_VALUE);
  sessionStorage.setItem('isLoggedIn', 'true');
  if (session?.id) sessionStorage.setItem('userId', session.id);
  if (session?.role) sessionStorage.setItem('userRole', session.role);
};

export const clearLoginToken = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LOGIN_TOKEN_KEY);
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userRole');
};

export const hasValidLoginToken = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('isLoggedIn') === 'true';
};

export const getStoredSession = () => {
  if (typeof window === 'undefined') return null;
  const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
  if (!loggedIn) return null;
  const id = sessionStorage.getItem('userId') || '';
  const role = (sessionStorage.getItem('userRole') as UserRole | null) || null;
  return role ? { id, role } : null;
};
