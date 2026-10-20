import { IsIn } from 'class-validator';
import { USER_ROLES } from '../user.interface.js';
import type { UserRole } from '../user.interface.js';

export class UpdateUserRoleDto {
  @IsIn([...USER_ROLES])
  role: UserRole;
}
