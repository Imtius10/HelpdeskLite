import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { User } from './user.interface.js';
import { UsersService } from './users.service.js';

@Controller('users')
@Roles('AGENT', 'ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query.role);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.updateRole(id, dto.role, currentUser);
  }
}
