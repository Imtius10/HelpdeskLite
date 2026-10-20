export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const;
export const TICKET_SORT_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'priority',
  'status',
] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];
export type SortOrder = 'asc' | 'desc';

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: number;
  assigneeId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: number;
  requesterId?: number;
  search?: string;
  page: number;
  limit: number;
  sortBy: TicketSortField;
  sortOrder: SortOrder;
}

export interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
  unassigned: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
