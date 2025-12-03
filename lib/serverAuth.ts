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
import dbConnect from './db';
import Account from '@/models/Account';

export type SessionUser = {
  id: string;
  role: UserRole;
  label?: string;
  team?: string;
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

const normalizeAccount = (account: { userId: string; password: string; role: UserRole; label?: string; team?: string }) => ({
  id: account.userId,
  password: account.password,
  role: account.role,
  label: account.label || account.userId,
  team: account.team || '',
});

const seedDefaultsIfEmpty = async (): Promise<boolean> => {
  try {
    await dbConnect();
  } catch (error) {
    console.error('[AUTH] DB unavailable, falling back to static users', error);
    return false;
  }

  const count = await Account.countDocuments({});
  if (count > 0) return true;
  try {
    await Account.insertMany(
      AUTH_USERS.map((u) => ({
        userId: u.id,
        password: u.password,
        role: u.role,
        label: u.label,
        team: '',
      }))
    );
  } catch (error) {
    console.error('[AUTH] seed failed', error);
  }
  return true;
};

export const ensureAccountsSeeded = seedDefaultsIfEmpty;

export const findUserByCredentials = async (id: string, password: string) => {
  const seeded = await seedDefaultsIfEmpty();
  if (seeded) {
    try {
      const account = await Account.findOne({ userId: id, password }).lean();
      if (account)
        return normalizeAccount(account as unknown as { userId: string; password: string; role: UserRole; label?: string; team?: string });
    } catch (error) {
      console.error('[AUTH] account lookup failed', error);
    }
  }
  const fallback = AUTH_USERS.find((u) => u.id === id && u.password === password) || null;
  return fallback ? { ...fallback } : null;
};

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

export const requireAdmin = (req: Request): { session: SessionUser | null; response?: NextResponse } => {
  const { session, response } = requireAuth(req);
  if (!session) return { session: null, response };
  if (session.role !== 'admin') {
    return {
      session,
      response: NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 }),
    };
  }
  return { session };
};
