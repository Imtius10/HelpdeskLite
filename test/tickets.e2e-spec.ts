import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { UsersRepository } from '../src/users/users.repository.js';

describe('Helpdesk API (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: UsersRepository;

  let agentToken: string;
  let adminToken: string;
  let customerToken: string;
  let secondCustomerToken: string;
  let agentId: number;
  let customerId: number;
  let secondCustomerId: number;
  let ticketId: number;
  let resolvedTicketId: number;
  let secondCustomerTicketId: number;
  let commentId: number;

  const password = 'Password123!';

  const auth = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();

    usersRepository = app.get(UsersRepository);
    const passwordHash = await bcrypt.hash(password, 4);

    const agent = usersRepository.create({
      email: 'agent@e2e.test',
      name: 'E2E Agent',
      passwordHash,
      role: 'AGENT',
    });
    usersRepository.create({
      email: 'admin@e2e.test',
      name: 'E2E Admin',
      passwordHash,
      role: 'ADMIN',
    });
    agentId = agent.id;

    const customer = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'customer@e2e.test',
        name: 'E2E Customer',
        password,
      })
      .expect(201);
    customerToken = customer.body.accessToken;
    customerId = customer.body.user.id;

    const secondCustomer = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'customer-two@e2e.test',
        name: 'Second Customer',
        password,
      })
      .expect(201);
    secondCustomerToken = secondCustomer.body.accessToken;
    secondCustomerId = secondCustomer.body.user.id;

    const agentLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'agent@e2e.test', password })
      .expect(200);
    agentToken = agentLogin.body.accessToken;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@e2e.test', password })
      .expect(200);
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authentication', () => {
    it('rejects protected routes without a token', async () => {
      await request(app.getHttpServer()).get('/api/tickets').expect(401);
    });

    it('rejects invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'customer@e2e.test', password: 'wrong-password' })
        .expect(401);
    });

    it('rejects duplicate registrations', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'customer@e2e.test',
          name: 'Duplicate',
          password,
        })
        .expect(409);
    });

    it('returns the current user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(customerToken))
        .expect(200);

      expect(response.body).toMatchObject({
        id: customerId,
        email: 'customer@e2e.test',
        role: 'CUSTOMER',
      });
      expect(response.body.passwordHash).toBeUndefined();
    });
  });

  describe('tickets', () => {
    it('creates tickets for the authenticated customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(customerToken))
        .send({
          subject: 'Cannot log in to the portal',
          description: 'The customer cannot access the dashboard.',
          priority: 'HIGH',
        })
        .expect(201);

      ticketId = response.body.id;
      expect(response.body).toMatchObject({
        status: 'OPEN',
        priority: 'HIGH',
        requesterId: customerId,
        assigneeId: null,
      });
    });

    it('creates a second ticket for filtering', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(customerToken))
        .send({
          subject: 'Invoice shows the wrong amount',
          description: 'A duplicate line item appears on the invoice.',
          priority: 'LOW',
        })
        .expect(201);

      resolvedTicketId = response.body.id;
    });

    it('creates a ticket for another customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(secondCustomerToken))
        .send({
          subject: 'Feature request',
          description: 'Please add a dark mode to the portal.',
          priority: 'MEDIUM',
        })
        .expect(201);

      secondCustomerTicketId = response.body.id;
    });

    it('scopes ticket lists by role', async () => {
      const customerList = await request(app.getHttpServer())
        .get('/api/tickets')
        .set(auth(customerToken))
        .expect(200);
      const customerIds = customerList.body.data.map(
        (ticket: { id: number }) => ticket.id,
      );

      expect(customerIds).toContain(ticketId);
      expect(customerIds).not.toContain(secondCustomerTicketId);

      const agentList = await request(app.getHttpServer())
        .get('/api/tickets')
        .set(auth(agentToken))
        .expect(200);
      const agentIds = agentList.body.data.map(
        (ticket: { id: number }) => ticket.id,
      );

      expect(agentIds).toContain(secondCustomerTicketId);
      expect(agentList.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('supports pagination, sorting, filtering, and search', async () => {
      const paginated = await request(app.getHttpServer())
        .get('/api/tickets?page=1&limit=2&sortBy=id&sortOrder=asc')
        .set(auth(agentToken))
        .expect(200);

      expect(paginated.body.data).toHaveLength(2);
      expect(paginated.body.meta).toMatchObject({
        page: 1,
        limit: 2,
      });
      expect(paginated.body.data[0].id).toBeLessThan(paginated.body.data[1].id);

      const filtered = await request(app.getHttpServer())
        .get('/api/tickets?status=OPEN&priority=HIGH')
        .set(auth(agentToken))
        .expect(200);

      expect(filtered.body.data.length).toBeGreaterThan(0);
      for (const ticket of filtered.body.data) {
        expect(ticket).toMatchObject({ status: 'OPEN', priority: 'HIGH' });
      }

      const searched = await request(app.getHttpServer())
        .get('/api/tickets?search=Invoice')
        .set(auth(agentToken))
        .expect(200);

      expect(searched.body.data.length).toBeGreaterThan(0);
      for (const ticket of searched.body.data) {
        expect(ticket.subject).toContain('Invoice');
      }
    });

    it('rejects invalid query parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/tickets?sortBy=password')
        .set(auth(agentToken))
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/tickets?limit=500')
        .set(auth(agentToken))
        .expect(400);
    });

    it('hides other customers tickets', async () => {
      await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set(auth(secondCustomerToken))
        .expect(404);

      const response = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set(auth(agentToken))
        .expect(200);

      expect(response.body.id).toBe(ticketId);
    });

    it('allows customers to edit their own open tickets', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/tickets/${ticketId}`)
        .set(auth(customerToken))
        .send({ subject: 'Updated login issue' })
        .expect(200);

      expect(response.body.subject).toBe('Updated login issue');
    });

    it('prevents customers from changing status or assignee', async () => {
      await request(app.getHttpServer())
        .patch(`/api/tickets/${ticketId}`)
        .set(auth(customerToken))
        .send({ status: 'IN_PROGRESS' })
        .expect(403);
    });

    it('allows agents to change status and assignee', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/tickets/${ticketId}`)
        .set(auth(agentToken))
        .send({ status: 'IN_PROGRESS', assigneeId: agentId })
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'IN_PROGRESS',
        assigneeId: agentId,
      });
    });

    it('rejects assigning tickets to customers', async () => {
      await request(app.getHttpServer())
        .patch(`/api/tickets/${ticketId}`)
        .set(auth(agentToken))
        .send({ assigneeId: customerId })
        .expect(400);
    });

    it('validates ticket payloads', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(customerToken))
        .send({ subject: 'Missing fields' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/tickets')
        .set(auth(customerToken))
        .send({
          subject: 'Unknown field',
          description: 'This payload contains an unknown field.',
          priority: 'HIGH',
          status: 'CLOSED',
        })
        .expect(400);
    });
  });

  describe('comments', () => {
    it('adds comments to accessible tickets', async () => {
      const customerComment = await request(app.getHttpServer())
        .post(`/api/tickets/${ticketId}/comments`)
        .set(auth(customerToken))
        .send({ body: 'The issue is still happening.' })
        .expect(201);

      expect(customerComment.body.author.id).toBe(customerId);

      const agentComment = await request(app.getHttpServer())
        .post(`/api/tickets/${ticketId}/comments`)
        .set(auth(agentToken))
        .send({ body: 'I am investigating this now.' })
        .expect(201);

      commentId = agentComment.body.id;
    });

    it('lists comments for accessible tickets', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}/comments`)
        .set(auth(customerToken))
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].author).toHaveProperty('name');
    });

    it('hides comments on other customers tickets', async () => {
      await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}/comments`)
        .set(auth(secondCustomerToken))
        .expect(404);
    });

    it('prevents deleting comments from other authors', async () => {
      await request(app.getHttpServer())
        .delete(`/api/tickets/${ticketId}/comments/${commentId}`)
        .set(auth(customerToken))
        .expect(403);
    });

    it('allows agents to moderate comments', async () => {
      await request(app.getHttpServer())
        .delete(`/api/tickets/${ticketId}/comments/${commentId}`)
        .set(auth(agentToken))
        .expect(204);
    });
  });

  describe('statistics and users', () => {
    it('returns ticket statistics scoped by role', async () => {
      const agentStats = await request(app.getHttpServer())
        .get('/api/tickets/stats')
        .set(auth(agentToken))
        .expect(200);

      expect(agentStats.body.total).toBeGreaterThanOrEqual(3);
      expect(agentStats.body.byStatus).toHaveProperty('OPEN');
      expect(agentStats.body.byPriority).toHaveProperty('HIGH');

      const customerStats = await request(app.getHttpServer())
        .get('/api/tickets/stats')
        .set(auth(customerToken))
        .expect(200);

      expect(customerStats.body.total).toBeGreaterThanOrEqual(2);
      expect(customerStats.body.total).toBeLessThan(agentStats.body.total);
    });

    it('restricts user management to staff and admins', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set(auth(customerToken))
        .expect(403);

      const agentList = await request(app.getHttpServer())
        .get('/api/users?role=AGENT')
        .set(auth(agentToken))
        .expect(200);

      expect(agentList.body).toHaveLength(1);
      expect(agentList.body[0].email).toBe('agent@e2e.test');

      await request(app.getHttpServer())
        .patch(`/api/users/${secondCustomerId}/role`)
        .set(auth(agentToken))
        .send({ role: 'AGENT' })
        .expect(403);
    });

    it('allows admins to promote users', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${secondCustomerId}/role`)
        .set(auth(adminToken))
        .send({ role: 'AGENT' })
        .expect(200);

      expect(response.body.role).toBe('AGENT');
    });

    it('prevents admins from changing their own role', async () => {
      const currentUser = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(auth(adminToken))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/users/${currentUser.body.id}/role`)
        .set(auth(adminToken))
        .send({ role: 'AGENT' })
        .expect(400);
    });
  });

  describe('deletion', () => {
    it('restricts ticket deletion to admins', async () => {
      await request(app.getHttpServer())
        .delete(`/api/tickets/${resolvedTicketId}`)
        .set(auth(agentToken))
        .expect(403);
    });

    it('allows admins to delete tickets', async () => {
      await request(app.getHttpServer())
        .delete(`/api/tickets/${resolvedTicketId}`)
        .set(auth(adminToken))
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/tickets/${resolvedTicketId}`)
        .set(auth(adminToken))
        .expect(404);
    });
  });
});
