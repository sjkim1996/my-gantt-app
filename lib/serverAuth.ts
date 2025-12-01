import crypto from 'crypto';
import { NextResponse } from 'next/server';
import {
  AUTH_SECRET,
  AUTH_USERS,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  UserRole,
  isEditRole,
} from './authConfig';

export type SessionUser = {
  id: string;
  role: UserRole;
  label?: string;
};

const parseCookies = (cookieHeader: string | null): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rest] = part.split('=');
    if (!rawKey) return acc;
    const key = rawKey.trim();
    const value = rest.join('=').trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
};

const encode = (payload: object) => Buffer.from(JSON.stringify(payload)).toString('base64url');

const sign = (payload: object) =>
  crypto.createHmac('sha256', AUTH_SECRET).update(JSON.stringify(payload)).digest('base64url');

const buildToken = (session: SessionUser) => {
  const payload = { ...session, iat: Date.now() };
  const signature = sign(payload);
  return `${encode(payload)}.${signature}`;
};

const decodeToken = (token: string): SessionUser | null => {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const expected = sign(JSON.parse(payloadJson));
    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
      return null;
    }
    const parsed = JSON.parse(payloadJson) as SessionUser;
    if (!parsed.id || !parsed.role) return null;
    return parsed;
  } catch (error) {
    console.error('[AUTH] decode failed', error);
    return null;
  }
};

export const findUserByCredentials = (id: string, password: string) =>
  AUTH_USERS.find((u) => u.id === id && u.password === password) || null;

export const writeSessionCookie = (res: NextResponse, session: SessionUser) => {
  res.cookies.set(SESSION_COOKIE_NAME, buildToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
};

export const clearSessionCookie = (res: NextResponse) => {
  res.cookies.set(SESSION_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' });
};

export const getSessionFromRequest = (req: Request): SessionUser | null => {
  const cookieHeader = req.headers.get('cookie');
  const token = parseCookies(cookieHeader)[SESSION_COOKIE_NAME];
  if (!token) return null;
  return decodeToken(token);
};

export const requireAuth = (req: Request): { session: SessionUser | null; response?: NextResponse } => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 }),
    };
  }
  return { session };
};

export const requireEditor = (req: Request): { session: SessionUser | null; response?: NextResponse } => {
  const { session, response } = requireAuth(req);
  if (!session) return { session: null, response };
  if (!isEditRole(session.role)) {
    return {
      session,
      response: NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 }),
    };
  }
  return { session };
};
