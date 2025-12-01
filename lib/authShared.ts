export type UserRole = 'admin' | 'lead' | 'member';

export const isEditRole = (role?: UserRole | null) => role === 'admin' || role === 'lead';
