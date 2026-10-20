import { User } from '../../users/user.interface.js';

export interface AuthenticatedUser extends User {}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
}
