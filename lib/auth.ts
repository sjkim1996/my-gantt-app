'use client';

// Simple sessionStorage-based auth token handling for client-only pages.
export const LOGIN_TOKEN_KEY = 'loginToken';
export const LOGIN_TOKEN_VALUE = 'capra-admin-login-token';

export const setLoginToken = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(LOGIN_TOKEN_KEY, LOGIN_TOKEN_VALUE);
  sessionStorage.setItem('isLoggedIn', 'true');
};

export const clearLoginToken = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LOGIN_TOKEN_KEY);
  sessionStorage.removeItem('isLoggedIn');
};

export const hasValidLoginToken = () => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(LOGIN_TOKEN_KEY) === LOGIN_TOKEN_VALUE;
};
