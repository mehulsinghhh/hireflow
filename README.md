# HireFlow Backend

A recruitment platform backend built with **TypeScript, Node.js, Express, PostgreSQL, Prisma, Redis, BullMQ, and Socket.IO**. HireFlow supports candidate and recruiter workflows, secure authentication, job management, application tracking, asynchronous notification processing, and real-time updates.

## Features

- **Authentication & authorization:** JWT-based authentication, password hashing, role-based access control (RBAC), and resource ownership checks.
- **Job management:** Create, browse, update, and delete job listings with recruiter ownership restrictions.
- **Application management:** Apply for jobs, track application status, prevent duplicate applications, and enforce valid status transitions.
- **Redis caching:** Cache job listings and invalidate cached results when job data changes.
- **Background processing:** Use BullMQ workers to process application events asynchronously.
- **Notifications:** Retrieve notifications, filter unread notifications, track unread counts, and mark notifications as read.
- **Real-time updates:** Socket.IO delivers authenticated, user-specific notifications.
- **Database integrity:** PostgreSQL relational models, foreign keys, unique constraints, and indexes.
- **Input validation:** Zod-based request validation.
- **Integration testing:** Vitest and Supertest tests covering authentication, authorization, jobs, applications, and notifications.

## Tech Stack

| Category | Technologies |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| API | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT, bcrypt |
| Caching | Redis |
| Background jobs | BullMQ, ioredis |
| Real-time communication | Socket.IO |
| Validation | Zod |
| Testing | Vitest, Supertest |
| Local infrastructure | Docker |

## Architecture

```text
Client
  |
  v
Express REST API
  |
  +-- Authentication & RBAC
  |
  +-- Job Management
  |      |
  |      +-- Redis Cache
  |
  +-- Application Management
  |      |
  |      +-- PostgreSQL
  |      |
  |      +-- BullMQ Queue
  |              |
  |              v
  |        Application Worker
  |              |
  |              +-- Create Notifications
  |              +-- Emit Socket.IO Events
  |
  +-- Notification API
```

PostgreSQL stores persistent application data. Redis supports job-list caching and BullMQ's background-processing infrastructure.

## Prerequisites

Install the following before starting:

- [Node.js](https://nodejs.org/) — use a supported LTS release.
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine
- A PostgreSQL database and Redis instance, either locally installed or running through Docker.

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd hireflow
```

Replace the placeholder with the repository's actual clone URL.

## 2. Install dependencies

```bash
npm install
```

## 3. Start PostgreSQL and Redis

Make sure Docker is running.

Start PostgreSQL:

```bash
docker run -d \
  --name hireflow-postgres \
  -e POSTGRES_USER=hireflow \
  -e POSTGRES_PASSWORD=hireflow_dev_password \
  -e POSTGRES_DB=hireflow \
  -p 5432:5432 \
  -v hireflow-postgres-data:/var/lib/postgresql/data \
  postgres:16
```

Start Redis:

```bash
docker run -d \
  --name hireflow-redis \
  -p 6379:6379 \
  redis:7-alpine
```

Verify that both containers are running:

```bash
docker ps
```

If the containers already exist, restart them instead of creating duplicates:

```bash
docker start hireflow-postgres
docker start hireflow-redis
```

These commands create local development services. Do not expose these services publicly with default development credentials.

## 4. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://hireflow:hireflow_dev_password@localhost:5432/hireflow?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="replace_with_a_long_random_secret"
PORT=3000
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret used to sign and verify JWTs |
| `PORT` | HTTP server port; defaults to `3000` |

Generate a strong JWT secret and keep it private. Never commit `.env` files, database credentials, or production secrets to GitHub.

Ensure `.env` and `.env.test` are listed in `.gitignore`.

## 5. Generate the Prisma client and apply migrations

Generate the Prisma Client:

```bash
npx prisma generate
```

Apply development migrations:

```bash
npx prisma migrate dev
```

The repository contains migrations for the initial schema, recruiter ownership on jobs, and notifications.

For an existing deployment where migrations have already been created, use:

```bash
npx prisma migrate deploy
```

Use `migrate dev` for local schema development and `migrate deploy` to apply committed migrations in a deployment environment.

**Important:** Do not delete existing migrations or reset a database containing data you need to preserve.

## 6. Start the API

Run the development server:

```bash
npm run dev
```

The server initializes Redis, Socket.IO, and the BullMQ application worker before listening for HTTP requests.

The API runs at:

```text
http://localhost:3000
```

Check the health endpoint:

```http
GET http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "hireflow-api"
}
```

## 7. Run integration tests

Tests use a separate database to avoid modifying development data.

Create the test database:

```bash
docker exec -it hireflow-postgres psql -U hireflow -d postgres -c "CREATE DATABASE hireflow_test;"
```

Create a `.env.test` file:

```env
DATABASE_URL="postgresql://hireflow:hireflow_dev_password@localhost:5432/hireflow_test?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="replace_with_a_separate_test_secret"
```

Apply the schema migrations to the test database:

```bash
npx prisma migrate deploy
```

Ensure the test command loads `.env.test`, as configured in `vitest.config.ts`, before running the suite.

Run the tests:

```bash
npm test
```

The integration suite covers:

- Health endpoint
- Authentication
- Role-based access control
- Job operations
- Application workflows
- Notifications and pagination

**Warning:** The test setup clears test data before each test. Never point `.env.test` at a database containing data you want to keep.

## API Endpoints

All endpoints are relative to `http://localhost:3000`.

### Health and authentication

| Method | Endpoint | Access |
|---|---|---|
| `GET` | `/health` | Public |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/me` | Authenticated |

### Companies

| Method | Endpoint | Access |
|---|---|---|
| `POST` | `/api/companies` | Recruiter/Admin |
| `GET` | `/api/companies` | As configured by the route |
| `GET` | `/api/companies/:id` | As configured by the route |
| `PATCH` | `/api/companies/:id` | As configured by the route |
| `DELETE` | `/api/companies/:id` | As configured by the route |

### Jobs

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/jobs` | Browse jobs |
| `GET` | `/api/jobs/:id` | Retrieve a job |
| `POST` | `/api/jobs` | Create a job |
| `PATCH` | `/api/jobs/:id` | Update a job |
| `DELETE` | `/api/jobs/:id` | Delete a job |

### Applications

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/applications` | Apply for a job |
| `GET` | `/api/applications/me` | Candidate's applications |
| `GET` | `/api/applications/my-jobs` | Applications for a recruiter's jobs |
| `GET` | `/api/applications` | List all applications (admin) |
| `GET` | `/api/applications/:id` | Retrieve an authorized application |
| `PATCH` | `/api/applications/:id/status` | Update application status |

### Notifications

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/notifications` | Retrieve notifications |
| `GET` | `/api/notifications/unread-count` | Get unread count |
| `PATCH` | `/api/notifications/:id/read` | Mark a notification as read |

Check the route definitions for exact request bodies, validation rules, query parameters, and permissions. Do not assume that every company endpoint is public or available to every role.

## Application Status Workflow

Application statuses follow controlled transitions:

```text
APPLIED
  ├── SCREENING
  │     ├── INTERVIEW
  │     │     ├── HIRED
  │     │     └── REJECTED
  │     └── REJECTED
  └── REJECTED
```

`HIRED` and `REJECTED` are terminal states. Invalid transitions are rejected by the API.

Candidates cannot change their own application status. Recruiters must own the relevant job, while administrators have broader access.

## Real-Time Notifications

HireFlow uses Socket.IO for authenticated, user-specific notifications.

The server associates connected users with private rooms based on their authenticated user IDs. Application events processed by the worker can emit:

- `notification:new` — a new notification is available.
- `APPLICATION_CREATED` — an application was submitted.
- `APPLICATION_STATUS_CHANGED` — an application's status changed.

Connect using a valid JWT through the authentication mechanism configured in `src/realtime/socketServer.ts`. A frontend can use the Socket.IO client to subscribe to `notification:new`.

## Project Structure

```text
src/
├── app.ts
├── server.ts
├── middleware/
├── routes/
├── services/
├── validators/
├── lib/
├── queues/
├── workers/
├── realtime/
└── generated/prisma/

prisma/
├── schema.prisma
└── migrations/

tests/
├── setup.ts
└── integration/

.env
.env.test
prisma.config.ts
vitest.config.ts
package.json
tsconfig.json
```

The Prisma Client is generated under `src/generated/prisma/`. Generated files should be regenerated using the Prisma command rather than edited manually.

## Security Notes

- Passwords are hashed; plaintext passwords must never be stored.
- Protected endpoints require valid authentication.
- Authorization checks enforce user roles and resource ownership.
- Duplicate applications are prevented by a database uniqueness constraint.
- Request validation rejects invalid input.
- Secrets and environment files must remain outside version control.
- Production deployments should use managed secrets, secure database credentials, TLS, and appropriate network restrictions.

## Roadmap

- [ ] Complete the frontend for candidates and recruiters.
- [ ] Integrate frontend authentication and protected routes.
- [ ] Connect frontend notifications to Socket.IO.
- [ ] Add deployment configuration and production monitoring.
- [ ] Expand automated tests and API documentation.

## License

Add a license file if you intend to distribute the project under an open-source license. Until then, no specific open-source license is implied.
