import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { Comment } from './comment.interface.js';

interface CommentRow {
  id: number;
  ticket_id: number;
  body: string;
  created_at: string;
  author_id: number;
  author_name: string;
  author_email: string;
}

const COMMENT_SELECT = `
  SELECT
    c.id,
    c.ticket_id,
    c.body,
    c.created_at,
    u.id AS author_id,
    u.name AS author_name,
    u.email AS author_email
  FROM comments c
  JOIN users u ON u.id = c.author_id
`;

@Injectable()
export class CommentsRepository {
  constructor(private readonly database: DatabaseService) {}

  create(ticketId: number, authorId: number, body: string): Comment {
    const result = this.database.db
      .prepare(
        `INSERT INTO comments (ticket_id, author_id, body, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(ticketId, authorId, body, new Date().toISOString());

    const comment = this.findById(Number(result.lastInsertRowid));

    if (!comment) {
      throw new Error('Failed to load the created comment');
    }

    return comment;
  }

  findById(id: number): Comment | undefined {
    const row = this.database.db
      .prepare(`${COMMENT_SELECT} WHERE c.id = ?`)
      .get(id) as unknown as CommentRow | undefined;

    return row ? this.toComment(row) : undefined;
  }

  findByTicket(ticketId: number): Comment[] {
    const rows = this.database.db
      .prepare(
        `${COMMENT_SELECT}
         WHERE c.ticket_id = ?
         ORDER BY c.created_at ASC, c.id ASC`,
      )
      .all(ticketId) as unknown as CommentRow[];

    return rows.map((row) => this.toComment(row));
  }

  remove(id: number): boolean {
    const result = this.database.db
      .prepare('DELETE FROM comments WHERE id = ?')
      .run(id);

    return Number(result.changes) > 0;
  }

  private toComment(row: CommentRow): Comment {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      body: row.body,
      createdAt: row.created_at,
      author: {
        id: row.author_id,
        name: row.author_name,
        email: row.author_email,
      },
    };
  }
}
