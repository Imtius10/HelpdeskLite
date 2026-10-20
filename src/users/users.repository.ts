import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { User, UserRole, UserWithPassword } from './user.interface.js';

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  create(input: CreateUserInput): User {
    const row = this.database.db
      .prepare(
        `INSERT INTO users (email, name, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *`,
      )
      .get(
        input.email,
        input.name,
        input.passwordHash,
        input.role,
        new Date().toISOString(),
      ) as unknown as UserRow;

    return this.toUser(row);
  }

  findByEmail(email: string): UserWithPassword | undefined {
    const row = this.database.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as unknown as UserRow | undefined;

    return row
      ? { ...this.toUser(row), passwordHash: row.password_hash }
      : undefined;
  }

  findById(id: number): User | undefined {
    const row = this.database.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as unknown as UserRow | undefined;

    return row ? this.toUser(row) : undefined;
  }

  findAll(role?: UserRole): User[] {
    const rows = role
      ? (this.database.db
          .prepare('SELECT * FROM users WHERE role = ? ORDER BY name ASC')
          .all(role) as unknown as UserRow[])
      : (this.database.db
          .prepare('SELECT * FROM users ORDER BY name ASC')
          .all() as unknown as UserRow[]);

    return rows.map((row) => this.toUser(row));
  }

  updateRole(id: number, role: UserRole): User | undefined {
    const row = this.database.db
      .prepare('UPDATE users SET role = ? WHERE id = ? RETURNING *')
      .get(role, id) as unknown as UserRow | undefined;

    return row ? this.toUser(row) : undefined;
  }

  private toUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
    };
  }
}
