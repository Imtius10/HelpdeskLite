import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TICKET_PRIORITIES } from '../ticket.interface.js';
import type { TicketPriority } from '../ticket.interface.js';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsIn([...TICKET_PRIORITIES])
  priority: TicketPriority;
}
