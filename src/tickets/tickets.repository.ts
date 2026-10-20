import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  SortOrder,
  Ticket,
  TicketFilter,
  TicketPriority,
  TicketSortField,
  TicketStats,
  TicketStatus,
} from './ticket.interface.js';

interface TicketRow {
  id: number;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  requester_id: number;
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  priority: TicketPriority;
  requesterId: number;
  assigneeId?: number | null;
  status?: TicketStatus;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assigneeId?: number | null;
}

const SORT_COLUMNS: Record<TicketSortField, string> = {
  id: 'id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  priority: 'priority',
  status: 'status',
};

@Injectable()
export class TicketsRepository {
  constructor(private readonly database: DatabaseService) {}

  create(input: CreateTicketInput): Ticket {
    const now = new Date().toISOString();
    const row = this.database.db
      .prepare(
        `INSERT INTO tickets (
           subject, description, priority, status, requester_id, assignee_id,
           created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
      )
      .get(
        input.subject,
        input.description,
        input.priority,
        input.status ?? 'OPEN',
        input.requesterId,
        input.assigneeId ?? null,
        now,
        now,
      ) as unknown as TicketRow;

    return this.toTicket(row);
  }

  findById(id: number): Ticket | undefined {
    const row = this.database.db
      .prepare('SELECT * FROM tickets WHERE id = ?')
      .get(id) as unknown as TicketRow | undefined;

    return row ? this.toTicket(row) : undefined;
  }

  findMany(filter: TicketFilter): { items: Ticket[]; total: number } {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    if (filter.priority) {
      conditions.push('priority = ?');
      params.push(filter.priority);
    }

    if (filter.assigneeId !== undefined) {
      conditions.push('assignee_id = ?');
      params.push(filter.assigneeId);
    }

    if (filter.requesterId !== undefined) {
      conditions.push('requester_id = ?');
      params.push(filter.requesterId);
    }

    if (filter.search) {
      const term = `%${this.escapeLike(filter.search)}%`;
      conditions.push(
        "(subject LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')",
      );
      params.push(term, term);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const totalRow = this.database.db
      .prepare(`SELECT COUNT(*) AS total FROM tickets ${where}`)
      .get(...params) as unknown as { total: number };
    const offset = (filter.page - 1) * filter.limit;
    const order = this.normalizeSortOrder(filter.sortOrder);
    const column = SORT_COLUMNS[filter.sortBy];
    const rows = this.database.db
      .prepare(
        `SELECT * FROM tickets ${where}
         ORDER BY ${column} ${order}, id ${order}
         LIMIT ? OFFSET ?`,
      )
      .all(...params, filter.limit, offset) as unknown as TicketRow[];

    return {
      items: rows.map((row) => this.toTicket(row)),
      total: totalRow.total,
    };
  }

  update(id: number, input: UpdateTicketInput): Ticket | undefined {
    const assignments: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.subject !== undefined) {
      assignments.push('subject = ?');
      params.push(input.subject);
    }

    if (input.description !== undefined) {
      assignments.push('description = ?');
      params.push(input.description);
    }

    if (input.priority !== undefined) {
      assignments.push('priority = ?');
      params.push(input.priority);
    }

    if (input.status !== undefined) {
      assignments.push('status = ?');
      params.push(input.status);
    }

    if (input.assigneeId !== undefined) {
      assignments.push('assignee_id = ?');
      params.push(input.assigneeId);
    }

    assignments.push('updated_at = ?');
    params.push(new Date().toISOString());

    const row = this.database.db
      .prepare(
        `UPDATE tickets
         SET ${assignments.join(', ')}
         WHERE id = ?
         RETURNING *`,
      )
      .get(...params, id) as unknown as TicketRow | undefined;

    return row ? this.toTicket(row) : undefined;
  }

  remove(id: number): boolean {
    const result = this.database.db
      .prepare('DELETE FROM tickets WHERE id = ?')
      .run(id);

    return Number(result.changes) > 0;
  }

  getStats(requesterId?: number): TicketStats {
    const where = requesterId !== undefined ? 'WHERE requester_id = ?' : '';
    const params = requesterId !== undefined ? [requesterId] : [];
    const row = this.database.db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END), 0) AS open_count,
           COALESCE(SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS in_progress_count,
           COALESCE(SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END), 0) AS resolved_count,
           COALESCE(SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END), 0) AS closed_count,
           COALESCE(SUM(CASE WHEN priority = 'LOW' THEN 1 ELSE 0 END), 0) AS low_count,
           COALESCE(SUM(CASE WHEN priority = 'MEDIUM' THEN 1 ELSE 0 END), 0) AS medium_count,
           COALESCE(SUM(CASE WHEN priority = 'HIGH' THEN 1 ELSE 0 END), 0) AS high_count,
           COALESCE(SUM(CASE WHEN assignee_id IS NULL THEN 1 ELSE 0 END), 0) AS unassigned
         FROM tickets ${where}`,
      )
      .get(...params) as unknown as {
      total: number;
      open_count: number;
      in_progress_count: number;
      resolved_count: number;
      closed_count: number;
      low_count: number;
      medium_count: number;
      high_count: number;
      unassigned: number;
    };

    return {
      total: Number(row.total),
      byStatus: {
        OPEN: Number(row.open_count),
        IN_PROGRESS: Number(row.in_progress_count),
        RESOLVED: Number(row.resolved_count),
        CLOSED: Number(row.closed_count),
      },
      byPriority: {
        LOW: Number(row.low_count),
        MEDIUM: Number(row.medium_count),
        HIGH: Number(row.high_count),
      },
      unassigned: Number(row.unassigned),
    };
  }

  private normalizeSortOrder(order: SortOrder): 'ASC' | 'DESC' {
    return order === 'asc' ? 'ASC' : 'DESC';
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
  }

  private toTicket(row: TicketRow): Ticket {
    return {
      id: row.id,
      subject: row.subject,
      description: row.description,
      priority: row.priority,
      status: row.status,
      requesterId: row.requester_id,
      assigneeId: row.assignee_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
