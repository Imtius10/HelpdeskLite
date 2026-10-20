import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: DatabaseSync;

  constructor() {
    const configuredPath = process.env.DATABASE_PATH ?? 'data/helpdesk.db';
    const databasePath =
      configuredPath === ':memory:' || isAbsolute(configuredPath)
        ? configuredPath
        : resolve(process.cwd(), configuredPath);

    if (databasePath !== ':memory:') {
      mkdirSync(dirname(databasePath), { recursive: true });
    }

    this.db = new DatabaseSync(databasePath);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA busy_timeout = 5000');
    if (databasePath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL');
    }
    this.migrate();
  }

  onModuleDestroy() {
    this.db.close();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CUSTOMER'
          CHECK (role IN ('CUSTOMER', 'AGENT', 'ADMIN')),
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL
          CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
        status TEXT NOT NULL DEFAULT 'OPEN'
          CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
        requester_id INTEGER NOT NULL
          REFERENCES users (id) ON DELETE CASCADE,
        assignee_id INTEGER
          REFERENCES users (id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL
          REFERENCES tickets (id) ON DELETE CASCADE,
        author_id INTEGER NOT NULL
          REFERENCES users (id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
      CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets (priority);
      CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets (requester_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets (assignee_id);
      CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments (ticket_id);
    `);
  }
}
