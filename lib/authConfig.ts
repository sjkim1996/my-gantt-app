import { UserRole, isEditRole } from './authShared';

export type { UserRole };
export { isEditRole };

export type AuthUser = {
  id: string;
  password: string;
  role: UserRole;
  label: string;
  allowedMembers?: string[];
};

export const AUTH_USERS: AuthUser[] = [
  { id: 'capra_admin', password: '0000', role: 'admin', label: '최고관리자' },
  { id: 'capra_leads', password: '0311!', role: 'lead', label: '팀장' },
  {
    id: 'capra',
    password: 'capra',
    role: 'member',
    label: '팀원',
    allowedMembers: ['capra'],
  },
];

export const SESSION_COOKIE_NAME = 'capra_auth_token';
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours
export const AUTH_SECRET = process.env.AUTH_SECRET || 'capra-session-secret';
