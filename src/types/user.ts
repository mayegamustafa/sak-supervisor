export type UserRole = 'admin' | 'supervisor';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  photo_url?: string;
  created_at: string;
  last_seen?: string;
  online?: boolean;
  biometric_enabled?: boolean;
  biometric_required?: boolean;
}
