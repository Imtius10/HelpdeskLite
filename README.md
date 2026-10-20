# Helpdesk Lite

A production-style helpdesk ticketing REST API built with [NestJS](https://nestjs.com), SQLite, and JWT authentication.

![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.5-339933?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-built--in-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-lightgrey)

---

## Overview

Helpdesk Lite is a medium-sized backend for managing support tickets. It includes authentication, role-based authorization, persistent storage, ticket assignment, comments, filtering, pagination, search, and statistics.

The API is served under `/api`, validates every request with DTOs, and uses a layered architecture: controllers handle HTTP, services enforce business rules, repositories own SQL, and a small database service manages the SQLite connection and schema.

SQLite is accessed through Node's built-in `node:sqlite` module, so there is no database server or ORM to install. Data is stored in a local file and survives application restarts.

## Features

- **JWT authentication** with registration, login, and a current-user endpoint.
- **Role-based authorization** for `CUSTOMER`, `AGENT`, and `ADMIN` users.
- **Persistent SQLite storage** with automatic schema creation and foreign keys.
- **Ticket management** with create, list, retrieve, update, and delete operations.
- **Pagination, sorting, search, and filters** for status, priority, and assignee.
- **Ticket assignment** to agents and admins.
- **Comments** with author details and moderation rules.
- **Dashboard statistics** grouped by status, priority, and assignment.
- **Request validation** with `class-validator` and strict unknown-field rejection.
- **Seed script** for demo users, tickets, and comments.
- **Unit and end-to-end tests** with Vitest and Supertest.
- **Optional observability** through NestJS Observe.

## Tech Stack

| Category       | Technology                                    |
| -------------- | --------------------------------------------- |
| Runtime        | Node.js >= 22.5 (uses `node:sqlite`)          |
| Framework      | NestJS 12                                     |
| Language       | TypeScript 6 with ES modules                  |
| Database       | SQLite via the built-in `node:sqlite` module  |
| Authentication | `@nestjs/jwt`, bcryptjs                       |
| Validation     | class-validator, class-transformer            |
| Configuration  | dotenv                                        |
| Testing        | Vitest, Supertest                             |
| Linting        | oxlint (type-aware)                           |
| Formatting     | Prettier                                      |
| Observability  | NestJS Observe (optional)                     |

## Architecture

```
HTTP request
    |
Controller      route handling, auth decorators, validation
    |
Service         authorization, business rules, pagination metadata
    |
Repository      parameterized SQL, row-to-domain mapping
    |
SQLite          schema, indexes, foreign keys
```

## Project Structure

```
helpdesk-lite/
├── src/
│   ├── auth/
│   │   ├── dto/                     # Register and login payloads
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── common/
│   │   ├── decorators/              # @Public, @Roles, @CurrentUser
│   │   ├── guards/                  # JwtAuthGuard, RolesGuard
│   │   └── interfaces/              # Authenticated request types
│   ├── database/
│   │   ├── database.module.ts
│   │   └── database.service.ts      # Connection and schema migration
│   ├── tickets/
│   │   ├── dto/                     # Create, update, filter, comment DTOs
│   │   ├── comments.controller.ts
│   │   ├── comments.repository.ts
│   │   ├── comments.service.ts
│   │   ├── tickets.controller.ts
│   │   ├── tickets.repository.ts
│   │   ├── tickets.service.ts
│   │   └── tickets.service.spec.ts
│   ├── users/
│   │   ├── dto/                     # Role and filter DTOs
│   │   ├── users.controller.ts
│   │   ├── users.repository.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── app.controller.ts            # Public health check
│   ├── app.module.ts
│   ├── main.ts
│   └── seed.ts                      # Demo data seed script
├── test/
│   ├── app.e2e-spec.ts
│   └── tickets.e2e-spec.ts
├── postman/
│   └── helpdesk-lite.postman_collection.json
├── .env.example
├── vitest.config.ts
├── vitest.config.e2e.ts
└── package.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 22.5 or newer
- npm (bundled with Node.js)

### Installation

```bash
git clone <repository-url>
cd helpdesk-lite
npm install
```

### Environment

```bash
cp .env.example .env
```

Generate a strong JWT secret and set it in `.env`:

```bash
openssl rand -hex 32
```

`JWT_SECRET` falls back to a development-only value when missing. The application refuses to start in production without it.

### Seed Demo Data

```bash
npm run seed
```

The seed script creates one user per role plus sample tickets and comments. It is safe to run more than once: existing users and tickets are skipped.

| Role     | Email                   | Password      |
| -------- | ----------------------- | ------------- |
| Admin    | `admin@helpdesk.local`  | `Admin123!`   |
| Agent    | `agent@helpdesk.local`  | `Agent123!`   |
| Customer | `customer@helpdesk.local` | `Customer123!` |

These credentials are for local development only. Override them with the `SEED_*` environment variables, especially outside local environments.

### Run the Application

```bash
# Development
npm run start

# Watch mode (recommended during development)
npm run start:dev

# Debug mode
npm run start:debug

# Production (build first)
npm run build
npm run start:prod
```

The API is available at `http://localhost:3000/api`.

The SQLite database is created automatically at `data/helpdesk.db`. Delete that file to start from an empty database. The `data/` directory is gitignored.

## Configuration

| Variable                | Default                 | Description                                      |
| ----------------------- | ----------------------- | ------------------------------------------------ |
| `PORT`                  | `3000`                  | HTTP port                                        |
| `DATABASE_PATH`         | `data/helpdesk.db`      | SQLite file path, or `:memory:` for an ephemeral database |
| `JWT_SECRET`            | Development-only value  | JWT signing secret; required in production       |
| `JWT_EXPIRES_IN`        | `1h`                    | Access token lifetime                            |
| `SEED_ADMIN_EMAIL`      | `admin@helpdesk.local`  | Admin email used by the seed script              |
| `SEED_ADMIN_PASSWORD`   | `Admin123!`             | Admin password used by the seed script           |
| `SEED_AGENT_EMAIL`      | `agent@helpdesk.local`  | Agent email used by the seed script              |
| `SEED_AGENT_PASSWORD`   | `Agent123!`             | Agent password used by the seed script           |
| `SEED_CUSTOMER_EMAIL`   | `customer@helpdesk.local` | Customer email used by the seed script         |
| `SEED_CUSTOMER_PASSWORD`| `Customer123!`          | Customer password used by the seed script        |
| `OBSERVE_APP_KEY`       | empty                   | Enables NestJS Observe when set with the secret  |
| `OBSERVE_APP_SECRET`    | empty                   | NestJS Observe application secret                |
| `OBSERVE_SERVICE_ID`    | `helpdesk-lite`         | Service name reported to Observe                 |

Environment variables are loaded from `.env` by dotenv.

## Roles and Permissions

| Capability                          | Customer            | Agent         | Admin |
| ----------------------------------- | ------------------- | ------------- | ----- |
| Create tickets                      | Yes                 | Yes           | Yes   |
| List and read tickets               | Own tickets only    | All tickets   | All tickets |
| Edit ticket details                 | Own non-closed tickets | All tickets | All tickets |
| Change status or assignee           | No                  | Yes           | Yes   |
| Delete tickets                      | No                  | No            | Yes   |
| Add comments                        | Own tickets         | All tickets   | All tickets |
| Delete comments                     | Own comments        | Any comment   | Any comment |
| List users                          | No                  | Yes           | Yes   |
| Change user roles                   | No                  | No            | Yes   |

Customers receive `404 Not Found` when requesting resources they cannot access. Agents and admins receive `403 Forbidden` when their role is insufficient.

## API Reference

**Base URL:** `http://localhost:3000/api`

All endpoints require a bearer token except the health check, registration, and login.

```http
Authorization: Bearer <access-token>
```

### Authentication

| Method | Path             | Access | Description                    |
| ------ | ---------------- | ------ | ------------------------------ |
| `POST` | `/auth/register` | Public | Create a customer account      |
| `POST` | `/auth/login`    | Public | Obtain an access token         |
| `GET`  | `/auth/me`       | Auth   | Return the current user        |

Register:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "name": "Jane Doe",
    "password": "Password123!"
  }'
```

Response `201 Created`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": "1h",
  "user": {
    "id": 4,
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "CUSTOMER",
    "createdAt": "2026-10-20T12:00:00.000Z"
  }
}
```

Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer@helpdesk.local", "password": "Customer123!"}'
```

### Tickets

| Method   | Path             | Access        | Description                     |
| -------- | ---------------- | ------------- | ------------------------------- |
| `GET`    | `/tickets`       | Auth          | List tickets with filters       |
| `GET`    | `/tickets/stats` | Auth          | Aggregated ticket statistics    |
| `GET`    | `/tickets/:id`   | Auth          | Retrieve a ticket               |
| `POST`   | `/tickets`       | Auth          | Create a ticket                 |
| `PATCH`  | `/tickets/:id`   | Auth          | Update a ticket                 |
| `DELETE` | `/tickets/:id`   | Admin         | Delete a ticket                 |

List query parameters:

| Parameter    | Allowed values                                    | Default     | Description                    |
| ------------ | ------------------------------------------------- | ----------- | ------------------------------ |
| `page`       | Integer >= 1                                      | `1`         | Page number                    |
| `limit`      | Integer 1-100                                     | `10`        | Items per page                 |
| `status`     | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`       | none        | Filter by status               |
| `priority`   | `LOW`, `MEDIUM`, `HIGH`                           | none        | Filter by priority             |
| `assigneeId` | User ID                                           | none        | Filter by assignee             |
| `search`     | Text up to 100 characters                         | none        | Search subject and description |
| `sortBy`     | `id`, `createdAt`, `updatedAt`, `priority`, `status` | `createdAt` | Sort field                  |
| `sortOrder`  | `asc`, `desc`                                     | `desc`      | Sort direction                 |

Example:

```bash
curl "http://localhost:3000/api/tickets?status=OPEN&priority=HIGH&page=1&limit=5&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer $TOKEN"
```

Paginated response:

```json
{
  "data": [
    {
      "id": 1,
      "subject": "Cannot log in to the customer portal",
      "description": "The customer receives an invalid credentials error.",
      "priority": "HIGH",
      "status": "IN_PROGRESS",
      "requesterId": 3,
      "assigneeId": 2,
      "createdAt": "2026-10-20T12:00:00.000Z",
      "updatedAt": "2026-10-20T12:05:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1
  }
}
```

Statistics:

```json
{
  "total": 3,
  "byStatus": {
    "OPEN": 1,
    "IN_PROGRESS": 1,
    "RESOLVED": 1,
    "CLOSED": 0
  },
  "byPriority": {
    "LOW": 1,
    "MEDIUM": 1,
    "HIGH": 1
  },
  "unassigned": 1
}
```

Create:

```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Printer is not responding",
    "description": "The printer on floor 3 is offline.",
    "priority": "MEDIUM"
  }'
```

Update:

```bash
curl -X PATCH http://localhost:3000/api/tickets/1 \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "assigneeId": 2
  }'
```

Set `assigneeId` to `null` to unassign a ticket. Agents and admins may update any field. Customers may update only `subject`, `description`, and `priority` on their own non-closed tickets. Only agents and admins can assign tickets, and the assignee must have the `AGENT` or `ADMIN` role.

Delete returns `204 No Content`:

```bash
curl -X DELETE http://localhost:3000/api/tickets/1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Comments

| Method   | Path                                  | Access                    | Description          |
| -------- | ------------------------------------- | ------------------------- | -------------------- |
| `GET`    | `/tickets/:ticketId/comments`         | Ticket participant/staff  | List comments        |
| `POST`   | `/tickets/:ticketId/comments`         | Ticket participant/staff  | Add a comment        |
| `DELETE` | `/tickets/:ticketId/comments/:commentId` | Author or staff        | Delete a comment     |

```bash
curl -X POST http://localhost:3000/api/tickets/1/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body": "The issue is still happening."}'
```

### Users

| Method  | Path                | Access      | Description                     |
| ------- | ------------------- | ----------- | ------------------------------- |
| `GET`   | `/users`            | Agent/Admin | List users, optionally by role  |
| `PATCH` | `/users/:id/role`   | Admin       | Change a user role              |

```bash
curl "http://localhost:3000/api/users?role=AGENT" \
  -H "Authorization: Bearer $AGENT_TOKEN"

curl -X PATCH http://localhost:3000/api/users/4/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "AGENT"}'
```

Admins cannot change their own role.

### Health Check

```http
GET /api
```

```json
"Hello World!"
```

## Data Model

```ts
type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN';

interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface Ticket {
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

interface Comment {
  id: number;
  ticketId: number;
  body: string;
  author: { id: number; name: string; email: string };
  createdAt: string;
}
```

Relationships:

- A ticket belongs to one requesting user.
- A ticket may be assigned to one agent or admin.
- A ticket has many comments.
- Deleting a ticket removes its comments. Deleting a user removes their tickets and comments.

## Error Handling

Validation failures return `400 Bad Request` with field details:

```json
{
  "message": [
    "priority must be one of the following values: LOW, MEDIUM, HIGH"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

Unknown fields are rejected. Missing resources return `404 Not Found`, missing or invalid tokens return `401 Unauthorized`, and insufficient roles return `403 Forbidden`.

```json
{
  "message": "Ticket with id 99 not found",
  "error": "Not Found",
  "statusCode": 404
}
```

## Testing

```bash
# Unit tests
npm test

# Unit tests in watch mode
npm run test:watch

# End-to-end tests (uses an in-memory SQLite database)
npm run test:e2e

# Coverage report
npm run test:cov
```

The end-to-end suite covers authentication, role scoping, pagination, filtering, search, ticket updates, assignment rules, comments, statistics, user management, and deletion.

### Postman

Import `postman/helpdesk-lite.postman_collection.json` into Postman. Start the API, run `npm run seed`, then execute the collection with the Collection Runner. It captures tokens and resource IDs automatically and checks responses as it goes.

The collection contains 37 requests and 71 assertions covering the full API. Change the `baseUrl` collection variable if the API is not running at `http://localhost:3000/api`.

You can also run it from the command line with Newman:

```bash
npx newman run postman/helpdesk-lite.postman_collection.json \
  --env-var baseUrl=http://localhost:3000/api
```

## Available Scripts

| Script                | Description                                 |
| --------------------- | ------------------------------------------- |
| `npm run start`       | Start the application                       |
| `npm run start:dev`   | Start in watch mode                         |
| `npm run start:debug` | Start in debug watch mode                   |
| `npm run start:prod`  | Run the compiled build from `dist/`         |
| `npm run build`       | Compile the application                     |
| `npm run seed`        | Build and seed demo users, tickets, and comments |
| `npm run typecheck`   | Run TypeScript without emitting files       |
| `npm run format`      | Format source and test files with Prettier  |
| `npm run lint`        | Run type-aware oxlint checks                |
| `npm test`            | Run unit tests                              |
| `npm run test:watch`  | Run unit tests in watch mode                |
| `npm run test:cov`    | Run unit tests with coverage                |
| `npm run test:e2e`    | Run end-to-end tests                        |

## Observability

Observability is optional. Set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` to enable [NestJS Observe](https://observe.nestjs.com), which adds distributed tracing, correlated logs, request metrics, error tracking, and alerts. When the credentials are empty, the instrumentation is not registered.

## Roadmap

- [ ] Add OpenAPI/Swagger documentation
- [ ] Add refresh tokens, logout, and password reset
- [ ] Add ticket attachments
- [ ] Add rate limiting and audit logs
- [ ] Move to PostgreSQL for multi-instance deployments
- [ ] Add a CI pipeline for lint, typecheck, test, and build

## License

This project is private and proprietary. All rights reserved.
