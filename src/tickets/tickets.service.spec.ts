import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '../users/user.interface.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { FilterTicketsQueryDto } from './dto/filter-tickets-query.dto.js';
import type { Ticket } from './ticket.interface.js';
import type { TicketsRepository } from './tickets.repository.js';
import { TicketsService } from './tickets.service.js';

const customer: User = {
  id: 1,
  email: 'customer@example.com',
  name: 'Customer',
  role: 'CUSTOMER',
  createdAt: '2026-10-01T10:00:00.000Z',
};

const otherCustomer: User = {
  ...customer,
  id: 2,
  email: 'other@example.com',
  name: 'Other Customer',
};

const agent: User = {
  id: 3,
  email: 'agent@example.com',
  name: 'Agent',
  role: 'AGENT',
  createdAt: '2026-10-01T10:00:00.000Z',
};

const admin: User = {
  ...agent,
  id: 4,
  email: 'admin@example.com',
  name: 'Admin',
  role: 'ADMIN',
};

const query: FilterTicketsQueryDto = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

function buildTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 10,
    subject: 'Cannot log in',
    description: 'The customer cannot access the portal',
    priority: 'HIGH',
    status: 'OPEN',
    requesterId: customer.id,
    assigneeId: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

function createService() {
  const ticketsRepository = {
    findMany: vi.fn(),
    getStats: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const usersRepository = {
    findById: vi.fn(),
  };
  const service = new TicketsService(
    ticketsRepository as unknown as TicketsRepository,
    usersRepository as unknown as UsersRepository,
  );

  return { service, ticketsRepository, usersRepository };
}

describe('TicketsService', () => {
  describe('findAll', () => {
    it('scopes results to the current customer', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.findMany.mockReturnValue({ items: [], total: 0 });

      service.findAll(query, customer);

      expect(ticketsRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ requesterId: customer.id }),
      );
    });

    it('does not scope results for staff', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.findMany.mockReturnValue({ items: [], total: 0 });

      service.findAll(query, agent);

      expect(ticketsRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ requesterId: undefined }),
      );
    });

    it('returns pagination metadata', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.findMany.mockReturnValue({
        items: [buildTicket()],
        total: 12,
      });

      const result = service.findAll(
        { page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' },
        agent,
      );

      expect(result.meta).toEqual({
        page: 1,
        limit: 5,
        total: 12,
        totalPages: 3,
      });
    });
  });

  describe('findOne', () => {
    it('throws not found when a customer requests another customer ticket', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.findById.mockReturnValue(
        buildTicket({ requesterId: otherCustomer.id }),
      );

      expect(() => service.findOne(10, customer)).toThrow(NotFoundException);
    });

    it('allows staff to read any ticket', () => {
      const { service, ticketsRepository } = createService();
      const ticket = buildTicket({ requesterId: otherCustomer.id });
      ticketsRepository.findById.mockReturnValue(ticket);

      expect(service.findOne(10, agent)).toEqual(ticket);
    });
  });

  describe('update', () => {
    it('prevents customers from changing status or assignee', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.findById.mockReturnValue(buildTicket());

      expect(() =>
        service.update(10, { status: 'IN_PROGRESS' }, customer),
      ).toThrow(ForbiddenException);
    });

    it('prevents customers from editing closed tickets', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.findById.mockReturnValue(
        buildTicket({ status: 'CLOSED' }),
      );

      expect(() =>
        service.update(10, { subject: 'Updated subject' }, customer),
      ).toThrow(BadRequestException);
    });

    it('rejects assigning a ticket to a customer', () => {
      const { service, ticketsRepository, usersRepository } = createService();
      ticketsRepository.findById.mockReturnValue(buildTicket());
      usersRepository.findById.mockReturnValue(otherCustomer);

      expect(() =>
        service.update(10, { assigneeId: otherCustomer.id }, agent),
      ).toThrow(BadRequestException);
    });

    it('allows agents to update status and assignee', () => {
      const { service, ticketsRepository, usersRepository } = createService();
      const updated = buildTicket({
        status: 'IN_PROGRESS',
        assigneeId: agent.id,
      });
      ticketsRepository.findById.mockReturnValue(buildTicket());
      usersRepository.findById.mockReturnValue(agent);
      ticketsRepository.update.mockReturnValue(updated);

      const result = service.update(
        10,
        { status: 'IN_PROGRESS', assigneeId: agent.id },
        agent,
      );

      expect(ticketsRepository.update).toHaveBeenCalledWith(10, {
        status: 'IN_PROGRESS',
        assigneeId: agent.id,
      });
      expect(result).toEqual(updated);
    });

    it('requires at least one field', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.findById.mockReturnValue(buildTicket());

      expect(() => service.update(10, {}, admin)).toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('throws not found when the ticket does not exist', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.remove.mockReturnValue(false);

      expect(() => service.remove(99)).toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('scopes statistics to the current customer', () => {
      const { service, ticketsRepository } = createService();
      ticketsRepository.getStats.mockReturnValue({
        total: 0,
        byStatus: { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
        byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 },
        unassigned: 0,
      });

      service.getStats(customer);

      expect(ticketsRepository.getStats).toHaveBeenCalledWith(customer.id);
    });
  });
});
