import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../ticket.interface.js';
import type { TicketPriority, TicketStatus } from '../ticket.interface.js';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsIn([...TICKET_PRIORITIES])
  priority?: TicketPriority;

  @IsOptional()
  @IsIn([...TICKET_STATUSES])
  status?: TicketStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  assigneeId?: number | null;
}
