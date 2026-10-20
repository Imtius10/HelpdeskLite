import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from './database/database.service.js';
import { CommentsRepository } from './tickets/comments.repository.js';
import { TicketsRepository } from './tickets/tickets.repository.js';
import { UserRole } from './users/user.interface.js';
import { UsersRepository } from './users/users.repository.js';

interface SeedUser {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

function readSeedPassword(variable: string, fallback: string): string {
  const value = process.env[variable];

  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${variable} is required when seeding in production`);
  }

  return value ?? fallback;
}

const database = new DatabaseService();
const usersRepository = new UsersRepository(database);
const ticketsRepository = new TicketsRepository(database);
const commentsRepository = new CommentsRepository(database);

const seedUsers: SeedUser[] = [
  {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@helpdesk.local',
    name: 'Helpdesk Admin',
    role: 'ADMIN',
    password: readSeedPassword('SEED_ADMIN_PASSWORD', 'Admin123!'),
  },
  {
    email: process.env.SEED_AGENT_EMAIL ?? 'agent@helpdesk.local',
    name: 'Support Agent',
    role: 'AGENT',
    password: readSeedPassword('SEED_AGENT_PASSWORD', 'Agent123!'),
  },
  {
    email: process.env.SEED_CUSTOMER_EMAIL ?? 'customer@helpdesk.local',
    name: 'Demo Customer',
    role: 'CUSTOMER',
    password: readSeedPassword('SEED_CUSTOMER_PASSWORD', 'Customer123!'),
  },
];

async function seed() {
  const users = new Map<string, { id: number }>();

  for (const seedUser of seedUsers) {
    const existingUser = usersRepository.findByEmail(seedUser.email);

    if (existingUser) {
      users.set(seedUser.role, existingUser);
      console.log(`Skipped existing user: ${seedUser.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    const user = usersRepository.create({
      email: seedUser.email,
      name: seedUser.name,
      passwordHash,
      role: seedUser.role,
    });

    users.set(seedUser.role, user);
    console.log(`Created ${seedUser.role.toLowerCase()}: ${seedUser.email}`);
  }

  if (ticketsRepository.getStats().total > 0) {
    console.log('Tickets already exist, skipping demo tickets');
    return;
  }

  const customer = users.get('CUSTOMER');
  const agent = users.get('AGENT');

  if (!customer || !agent) {
    throw new Error('Demo tickets require both a customer and an agent');
  }

  const loginTicket = ticketsRepository.create({
    subject: 'Cannot log in to the customer portal',
    description:
      'The customer receives an invalid credentials error even after resetting the password.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    requesterId: customer.id,
    assigneeId: agent.id,
  });

  const billingTicket = ticketsRepository.create({
    subject: 'Billing invoice shows the wrong amount',
    description:
      'The latest invoice includes a duplicate line item for the monthly subscription.',
    priority: 'MEDIUM',
    status: 'OPEN',
    requesterId: customer.id,
  });

  ticketsRepository.create({
    subject: 'Password reset email never arrives',
    description:
      'The reset email does not appear in the inbox or spam folder after multiple attempts.',
    priority: 'LOW',
    status: 'RESOLVED',
    requesterId: customer.id,
    assigneeId: agent.id,
  });

  commentsRepository.create(
    loginTicket.id,
    agent.id,
    'I reproduced the issue and escalated it to the identity team.',
  );
  commentsRepository.create(
    loginTicket.id,
    customer.id,
    'Thanks, I can still access the mobile app in the meantime.',
  );
  commentsRepository.create(
    billingTicket.id,
    customer.id,
    'This also happened on last month’s invoice.',
  );

  console.log('Created demo tickets and comments');
}

try {
  await seed();
  console.log('Seed completed successfully');
} finally {
  database.onModuleDestroy();
}
