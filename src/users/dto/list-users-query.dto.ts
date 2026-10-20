import { IsIn, IsOptional } from 'class-validator';
import { USER_ROLES } from '../user.interface.js';
import type { UserRole } from '../user.interface.js';

export class ListUsersQueryDto {
  @IsOptional()
  @IsIn([...USER_ROLES])
  role?: UserRole;
}
