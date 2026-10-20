import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../users/user.interface.js';
import { UsersRepository } from '../users/users.repository.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { FilterTicketsQueryDto } from './dto/filter-tickets-query.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { PaginatedResult, Ticket, TicketStats } from './ticket.interface.js';
import { TicketsRepository, UpdateTicketInput } from './tickets.repository.js';

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  findAll(query: FilterTicketsQueryDto, user: User): PaginatedResult<Ticket> {
    const result = this.ticketsRepository.findMany({
      status: query.status,
      priority: query.priority,
      assigneeId: query.assigneeId,
      search: query.search,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      requesterId: this.isStaff(user) ? undefined : user.id,
    });
    const totalPages = Math.ceil(result.total / query.limit);

    return {
      data: result.items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
        totalPages,
      },
    };
  }

  getStats(user: User): TicketStats {
    return this.ticketsRepository.getStats(
      this.isStaff(user) ? undefined : user.id,
    );
  }

  findOne(id: number, user: User): Ticket {
    return this.getAccessibleTicket(id, user);
  }

  create(dto: CreateTicketDto, user: User): Ticket {
    return this.ticketsRepository.create({
      subject: dto.subject,
      description: dto.description,
      priority: dto.priority,
      requesterId: user.id,
    });
  }

  update(id: number, dto: UpdateTicketDto, user: User): Ticket {
    const ticket = this.ticketsRepository.findById(id);

    if (!ticket) {
      throw new NotFoundException(`Ticket with id ${id} not found`);
    }

    if (!this.isStaff(user)) {
      if (ticket.requesterId !== user.id) {
        throw new NotFoundException(`Ticket with id ${id} not found`);
      }

      if (dto.status !== undefined || dto.assigneeId !== undefined) {
        throw new ForbiddenException(
          'Only agents and admins can change ticket status or assignee',
        );
      }

      if (ticket.status === 'CLOSED') {
        throw new BadRequestException(
          'Closed tickets cannot be edited by customers',
        );
      }
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      const assignee = this.usersRepository.findById(dto.assigneeId);

      if (!assignee) {
        throw new BadRequestException(
          `Assignee with id ${dto.assigneeId} not found`,
        );
      }

      if (assignee.role === 'CUSTOMER') {
        throw new BadRequestException(
          'Tickets can only be assigned to agents or admins',
        );
      }
    }

    const changes: UpdateTicketInput = {};

    if (dto.subject !== undefined) {
      changes.subject = dto.subject;
    }

    if (dto.description !== undefined) {
      changes.description = dto.description;
    }

    if (dto.priority !== undefined) {
      changes.priority = dto.priority;
    }

    if (dto.status !== undefined) {
      changes.status = dto.status;
    }

    if (dto.assigneeId !== undefined) {
      changes.assigneeId = dto.assigneeId;
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const updatedTicket = this.ticketsRepository.update(id, changes);

    if (!updatedTicket) {
      throw new NotFoundException(`Ticket with id ${id} not found`);
    }

    return updatedTicket;
  }

  remove(id: number): void {
    const removed = this.ticketsRepository.remove(id);

    if (!removed) {
      throw new NotFoundException(`Ticket with id ${id} not found`);
    }
  }

  getAccessibleTicket(id: number, user: User): Ticket {
    const ticket = this.ticketsRepository.findById(id);

    if (!ticket) {
      throw new NotFoundException(`Ticket with id ${id} not found`);
    }

    if (!this.isStaff(user) && ticket.requesterId !== user.id) {
      throw new NotFoundException(`Ticket with id ${id} not found`);
    }

    return ticket;
  }

  private isStaff(user: User): boolean {
    return user.role === 'AGENT' || user.role === 'ADMIN';
  }
}
