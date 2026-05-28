export type UserRole = 'FARMER' | 'ADMIN';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  district: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}
