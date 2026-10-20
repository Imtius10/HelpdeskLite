import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User, UserRole } from './user.interface.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll(role?: UserRole): User[] {
    return this.usersRepository.findAll(role);
  }

  findById(id: number): User {
    const user = this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  updateRole(id: number, role: UserRole, currentUser: User): User {
    if (id === currentUser.id) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = this.usersRepository.updateRole(id, role);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }
}
