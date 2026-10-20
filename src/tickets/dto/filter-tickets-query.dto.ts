import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TICKET_PRIORITIES,
  TICKET_SORT_FIELDS,
  TICKET_STATUSES,
} from '../ticket.interface.js';
import type {
  SortOrder,
  TicketPriority,
  TicketSortField,
  TicketStatus,
} from '../ticket.interface.js';
import { PaginationQueryDto } from './pagination-query.dto.js';

export class FilterTicketsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn([...TICKET_STATUSES])
  status?: TicketStatus;

  @IsOptional()
  @IsIn([...TICKET_PRIORITIES])
  priority?: TicketPriority;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn([...TICKET_SORT_FIELDS])
  sortBy: TicketSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: SortOrder = 'desc';
}
