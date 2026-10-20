export const USER_ROLES = ['CUSTOMER', 'AGENT', 'ADMIN'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
}
