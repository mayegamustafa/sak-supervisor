export type UserRole = 'admin' | 'supervisor';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  photo_url?: string;
  /** Saved signature image (transparent PNG data URL) attachable during assessments. */
  signature_url?: string;
  /**
   * Supervision departments this user may view (assigned by admin).
   * Empty/absent = unrestricted (sees all departments' tools).
   */
  departments?: string[];
  created_at: string;
  last_seen?: string;
  online?: boolean;
  biometric_enabled?: boolean;
  biometric_required?: boolean;
}
