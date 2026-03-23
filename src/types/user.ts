export type UserRole = 'admin' | 'supervisor';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}
