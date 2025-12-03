'use client';

import { UserRole } from './authShared';

// Lightweight client-side cache so the UI can react immediately without waiting for server.
export const LOGIN_TOKEN_KEY = 'loginToken';
export const LOGIN_TOKEN_VALUE = 'capra-login';

export const setLoginToken = (session?: { id: string; role: UserRole; team?: string }) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LOGIN_TOKEN_KEY, LOGIN_TOKEN_VALUE);
  sessionStorage.setItem('isLoggedIn', 'true');
  if (session?.id) sessionStorage.setItem('userId', session.id);
  if (session?.role) sessionStorage.setItem('userRole', session.role);
  if (session?.team) sessionStorage.setItem('userTeam', session.team);
};

export const clearLoginToken = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LOGIN_TOKEN_KEY);
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('userTeam');
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
  const team = sessionStorage.getItem('userTeam') || '';
  return role ? { id, role, team } : null;
};
