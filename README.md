# Expense Tracker API

A RESTful API for tracking personal income and expenses, built with Node.js, Express, and MongoDB. Users can sign up, log in, record transactions, view spending summaries, and admins can manage users and view spending analytics.

## Features

- **Authentication** — JWT-based signup/login with hashed passwords (bcrypt)
- **Transactions** — create, read, update, and delete income/expense records, with filtering by category and date range
- **Summary** — total income, total expenses, and running balance for the logged-in user
- **Admin** — list users, ban/unban users, and view spending analytics grouped by category
- **Tests** — Jest + Supertest suite running against an in-memory MongoDB instance, with coverage reporting

## Tech Stack

| Layer          | Technology                          |
|----------------|--------------------------------------|
| Runtime        | Node.js (ES Modules)                 |
| Framework      | Express 4                            |
| Database       | MongoDB via Mongoose 7               |
| Auth           | JSON Web Tokens (`jsonwebtoken`) + `bcrypt` |
| Testing        | Jest, Supertest, `mongodb-memory-server` |
| Dev tooling    | nodemon, dotenv                      |

## Project Structure

```
expense_tracker/
├── src/
│   ├── app.js                       # Express app setup & route mounting
│   ├── config/
│   │   └── db.js                    # MongoDB connection helpers
│   ├── controllers/
│   │   ├── auth.controller.js       # signup, login
│   │   ├── transaction.controller.js# CRUD for transactions
│   │   ├── summary.controller.js    # income/expense/balance summary
│   │   └── admin.controller.js      # user management & analytics
│   ├── middleware/
│   │   ├── auth.middleware.js       # JWT auth + admin gate
│   │   └── error.middleware.js      # 404 & generic error handlers
│   ├── models/
│   │   ├── User.model.js            # User schema (with password hashing)
│   │   └── Transaction.model.js     # Transaction schema
│   ├── routes/v1/
│   │   ├── auth.routes.js
│   │   ├── transaction.routes.js
│   │   ├── summary.routes.js
│   │   └── admin.routes.js
│   └── utils/
│       └── response.util.js         # Standardized success/error responses
├── tests/                           # Jest test suites (unit + integration)
├── coverage/                        # Generated coverage reports (git-ignored in practice)
├── .env.example                     # Sample environment variables
├── jest.config.js                   # Jest configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended, since the project uses native ES Modules)
- A MongoDB instance (local or hosted, e.g. MongoDB Atlas) — not required just to run the test suite, which uses an in-memory database

### Installation

```bash
git clone <repository-url>
cd expense_tracker
npm install
```

### Environment Variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

| Variable         | Description                                             | Example                                   |
|------------------|-----------------------------------------------------------|--------------------------------------------|
| `PORT`           | Port the server listens on                               | `4000`                                    |
| `MONGODB_URI`    | MongoDB connection string                                | `mongodb://localhost:27017/expense_tracker` |
| `JWT_SECRET`     | Secret used to sign JWTs                                 | `7fc1a7ab473bacafd2ce645f7178cd37`        |
| `JWT_EXPIRY`     | Token expiry (defaults to `1d` if unset)                 | `1d`                                       |
| `ADMIN_EMAIL`    | Email address treated as the admin account               | `admin@example.com`                       |
| `ADMIN_PASSWORD` | Reference password for the admin account (not enforced by code — see note below) | `AdminPass123!`     |

> **Note:** Admin access is currently determined solely by matching `req.user.email` against `ADMIN_EMAIL` (see `src/middleware/auth.middleware.js`). There is no separate `role` field on the `User` model, so the "admin" is just a regular user whose email matches this environment variable. `ADMIN_PASSWORD` is not read anywhere in the code — you must sign up that user through the normal `/auth/signup` endpoint with whatever password you choose.

### Running the Server

```bash
npm start        # production
npm run dev       # development, with nodemon auto-reload
```

The server listens on `PORT` (default `4000`) and connects to MongoDB on startup (skipped automatically when `NODE_ENV=test`).

### Running Tests

```bash
npm test              # run the full Jest suite (in-band) with coverage
npm run coverage       # same, explicit coverage run
npm run check-coverage # enforce the 85% coverage threshold (branches/functions/lines/statements)
```

Tests spin up an in-memory MongoDB instance via `mongodb-memory-server`, so no external database is needed to run them. An HTML coverage report is generated in `coverage/lcov-report/index.html`.

## API Reference

All endpoints are prefixed with `/api/v1`. All responses follow a consistent envelope:

```json
// success
{ "status": "success", "data": { ... } }

// error
{ "status": "error", "error": "message" }
```

Authenticated routes require an `Authorization: Bearer <token>` header, using the token returned from signup/login.

### Auth — `/api/v1/auth`

| Method | Endpoint    | Auth | Description                          |
|--------|-------------|------|---------------------------------------|
| POST   | `/signup`   | No   | Create a new user account            |
| POST   | `/login`    | No   | Log in and receive a JWT             |

**POST `/signup`**

Body:
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "password": "SecurePass123",
  "phone_number": "+250700000000"
}
```
All fields are required. Returns `201` with the created user (minus password) and a `token`. Returns `409` if the email is already registered.

**POST `/login`**

Body:
```json
{ "email": "jane@example.com", "password": "SecurePass123" }
```
Returns `200` with user info and a `token`. Returns `401` for invalid credentials, `403` if the account is banned.

### Transactions — `/api/v1/transactions` (all routes require auth)

| Method | Endpoint             | Description                                      |
|--------|-----------------------|---------------------------------------------------|
| POST   | `/`                   | Create a new transaction                          |
| GET    | `/`                   | List the current user's transactions              |
| GET    | `/:transactionId`     | Get a single transaction by ID                    |
| PATCH  | `/:transactionId`     | Update a transaction                              |
| DELETE | `/:transactionId`     | Delete a transaction                              |

**POST `/`**

Body:
```json
{
  "type": "expense",
  "category": "Groceries",
  "amount": 42.50,
  "date": "2026-08-01",
  "description": "Weekly shop"
}
```
`type` must be `income` or `expense`; `category`, `amount`, and `date` are required. Returns `201` with the created transaction.

**GET `/`**

Optional query parameters:
- `category` — filter by exact category match
- `start_date` / `end_date` — filter by date range (ISO date strings)

Returns transactions sorted by date, newest first. Only returns transactions belonging to the authenticated user.

**GET / PATCH / DELETE `/:transactionId`**

Scoped to the authenticated user's own transactions; returns `404` if the transaction doesn't exist or belongs to someone else.

### Summary — `/api/v1/summary` (requires auth)

| Method | Endpoint | Description                                   |
|--------|----------|-------------------------------------------------|
| GET    | `/`      | Total income, total expenses, and balance      |

Response:
```json
{
  "status": "success",
  "data": { "total_income": 1200, "total_expenses": 430.5, "balance": 769.5 }
}
```

### Admin — `/api/v1/admin` (requires auth + admin email match)

| Method | Endpoint                     | Description                                            |
|--------|-------------------------------|----------------------------------------------------------|
| GET    | `/users`                      | List all users                                          |
| PATCH  | `/users/:id/status`           | Set a user's status to `active` or `banned`              |
| GET    | `/analytics/transactions`     | Spending/income totals grouped by category               |

**PATCH `/users/:id/status`**

Body: `{ "status": "banned" }` (must be `"active"` or `"banned"`)

**GET `/analytics/transactions`**

Returns totals per category across **all users' transactions** (not just the admin's own), shaped as:
```json
[
  { "category": "Groceries", "total_income": 0, "total_expense": 342.10 },
  { "category": "Salary", "total_income": 5000, "total_expense": 0 }
]
```

## Known Limitations / Notes for Contributors

- **Admin model:** Admin status is inferred by email comparison rather than a dedicated role field — worth revisiting if you need more than one admin or finer-grained permissions.
- **Validation:** Input validation is minimal (presence checks only); consider adding a schema validator (e.g. `zod`/`joi`) for stricter request validation.
- **`updateOne` on transactions:** Accepts the raw request body as the update payload without whitelisting fields — a client could technically attempt to overwrite `user_id`. Mongoose's `runValidators` helps, but field-level whitelisting would be safer.
- **`db.js`:** Has a redundant self-referential re-export (`export {connectDB as default} from './db.js'`) — likely a copy-paste artifact worth cleaning up.
- **Line endings:** Source files currently use CRLF line endings; consider normalizing to LF via `.gitattributes` if the team develops cross-platform.


