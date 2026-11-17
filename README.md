# Doctor Tracker API

> Production-ready REST API for Doctor Tracker — a healthcare administration platform for managing doctors, patients and clinic analytics.

## 1. What this is

This is the standalone backend for Doctor Tracker. It is a separate Node.js/Express application that owns all authentication, persistence, validation and analytics. The [Next.js frontend](../doctor-tracker-frontend/README.md) talks to it exclusively over versioned REST endpoints; there are no Next.js API routes.

## 2. Features

- Secure admin authentication: bcrypt hashing, JWT in an HTTP-only cookie, rate-limited login, CORS with explicit origins, Helmet headers.
- Full CRUD for doctors and patients with Zod validation and consistent error responses.
- Safe doctor deletion: blocked with `409` while patients are assigned.
- Server-side pagination, search, filtering, date ranges and sorting on every list endpoint.
- MongoDB aggregation pipelines for KPIs, trends, distributions and relationship counts — no collection-wide fetches.
- Health check endpoint for container orchestrators.
- 35 automated tests running against a real in-memory MongoDB (not mocks).

## 3. Tech stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js 20+ |
| HTTP | Express 4 |
| Language | TypeScript (strict) |
| Database | MongoDB + Mongoose 8 |
| Validation | Zod |
| Auth | jsonwebtoken + bcryptjs |
| Security | helmet, cors, express-rate-limit, cookie-parser |
| Tests | Vitest + Supertest + mongodb-memory-server |

## 4. Architecture

```
Client (Next.js)
   │  HTTPS + credentials: 'include'
   ▼
Express app (app.ts)
   ├── helmet / cors / compression / json / cookieParser
   ├── /api/v1/health                (public)
   ├── /api/v1/auth/login            (public, rate limited)
   ├── /api/v1/auth/logout           (public)
   └── requireAuth ──────────────────────────────┐
        ├── /auth/me                             │
        ├── /doctors      → controller → service │
        ├── /patients     → controller → service │
        └── /dashboard    → controller → service │
                                   │             │
                                   ▼             │
                         Mongoose models ────────┘
                                   │
                                   ▼
                        MongoDB / MongoDB Atlas
```

**Data flow (example: GET /doctors?search=cardio&page=2)**

1. `validate` parses the query with Zod, coercing `page`/`limit` and rejecting invalid values.
2. `requireAuth` verifies the JWT and loads the admin from MongoDB.
3. `doctor.service.listDoctors` builds a MongoDB `$match` filter, `$lookup`s a patient count per doctor, `$project`s only the fields the UI needs, sorts, then uses `$facet` to return the page and total count in a single database round trip.
4. The controller sends `{ success: true, data: { data, currentPage, totalPages, totalItems, limit } }`.

## 5. Folder structure

```
src/
├── app.ts                 Express app factory
├── server.ts              Production entry point
├── config/                env parsing, CORS, cookie options
├── db/                    MongoDB connection (cached)
├── models/                User, Doctor, Patient schemas + indexes
├── validators/            Zod schemas (body, query, params)
├── middleware/            auth, validation, rate limit, errors
├── services/              business logic + aggregation pipelines
├── controllers/           thin HTTP adapters
├── routes/v1/             versioned route groups
├── scripts/               seed.ts, demo-server.ts
├── tests/                 Vitest suites + helpers
└── types/                 Express request augmentation
```

## 6. Local setup

```bash
cd doctor-tracker-backend
npm install
cp .env.example .env
# edit .env (set JWT_SECRET and MONGODB_URI)
npm run seed          # creates the initial admin
npm run dev           # http://localhost:4000
```

Requires a reachable MongoDB. You can use MongoDB Atlas (recommended) or a local `mongod` on port 27017. For a zero-config demo with realistic seed data, `npm run demo` starts an in-memory MongoDB and seeds 6 doctors and 42 patients (see below).

### Environment variables

See [.env.example](./.env.example). Key values:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | no | HTTP port (default `4000`) |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Signing secret (≥16 chars, generate with `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | no | Token lifetime, e.g. `7d` |
| `CORS_ORIGINS` | yes | Comma-separated frontend origins |
| `COOKIE_SECURE` | no | `true` in production (HTTPS) |
| `COOKIE_SAME_SITE` | no | `lax` locally, `none` for cross-origin production |
| `COOKIE_DOMAIN` | no | Optional cookie domain |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed only | Initial admin credentials |

Never commit `.env`. Secrets are only read from the environment.

## 7. Admin seed

```bash
# .env contains ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
npm run seed
# → [seed] Admin ready: admin@example.com (admin)
```

The command is idempotent (upsert by email). It refuses to run in production unless `ALLOW_SEED_IN_PRODUCTION=true`, and it never logs the password or its hash.

### Demo server (verification / screenshots)

```bash
npx tsx src/scripts/demo-server.ts
# Starts an in-memory MongoDB, seeds realistic data and the API on :4000
# Demo login: admin@doctortracker.local / Admin12345!
```

## 8. API endpoints

All responses are JSON. Successful responses use `{ "success": true, "data": … }`; errors use `{ "success": false, "error": { "code", "message", "details? } }`.

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | no | Sign in; sets `dt_access_token` HTTP-only cookie |
| POST | `/api/v1/auth/logout` | no | Clears the cookie |
| GET | `/api/v1/auth/me` | yes | Current admin profile |

### Doctors

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/doctors` | Paginated list (supports `search`, `specialization`, `startDate`, `endDate`, `sortBy`, `sortOrder`, `page`, `limit`) |
| GET | `/api/v1/doctors/specializations` | Distinct specializations for filters |
| POST | `/api/v1/doctors` | Create doctor |
| GET | `/api/v1/doctors/:id` | Doctor detail including `patientCount` |
| PATCH | `/api/v1/doctors/:id` | Update doctor |
| DELETE | `/api/v1/doctors/:id` | Delete (409 if patients are assigned) |

### Patients

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/patients` | Paginated list (supports `search`, `condition`, `doctorId`, date range, sorting) |
| GET | `/api/v1/patients/conditions` | Distinct condition values for form suggestions |
| POST | `/api/v1/patients` | Create patient (validates doctor reference) |
| GET | `/api/v1/patients/:id` | Patient detail with populated doctor |
| PATCH | `/api/v1/patients/:id` | Update patient |
| DELETE | `/api/v1/patients/:id` | Delete patient |

### Dashboard (aggregation-backed)

| Path | Returns |
| --- | --- |
| `/api/v1/dashboard/stats` | totals and this-month counts |
| `/api/v1/dashboard/patient-trends?months=6` | zero-filled monthly registration buckets |
| `/api/v1/dashboard/patients-per-doctor` | top doctors by patient count |
| `/api/v1/dashboard/conditions` | condition distribution |
| `/api/v1/dashboard/specializations` | specialization distribution |
| `/api/v1/dashboard/recent-patients` | 5 most recent patients with doctor names |

### Health

`GET /api/v1/health` → `{ success, data: { status, database, uptimeSeconds, timestamp } }` (200 healthy, 503 otherwise). Public.

### Pagination example

```json
{
  "success": true,
  "data": {
    "data": [ /* records */ ],
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 42,
    "limit": 10
  }
}
```

### Status codes

`200` OK · `201` created · `400` validation/invalid id/date · `401` unauthenticated · `403` CORS/origin · `404` missing resource · `409` duplicate email or assigned patients · `429` rate limited · `500` unexpected.

## 9. Database schema and indexes

**users**: `name`, `email` (unique), `password` (`select: false`), `role`, timestamps.
**doctors**: `name`, `specialization`, `hospital`, `phone`, `email` (unique), timestamps.
**patients**: `name`, `age`, `gender`, `phone`, `email`, `condition`, `doctorId` (ref → doctors, required), `notes`, timestamps.

Indexes (defined in the schemas; Mongoose auto-creates them on startup):

| Collection | Index | Purpose |
| --- | --- | --- |
| users | `{ email: 1 }` unique | login lookup + uniqueness |
| doctors | `{ email: 1 }` unique | duplicate prevention |
| doctors | text on name/email/hospital/specialization (weighted) | free-text search |
| doctors | `{ specialization: 1, createdAt: -1 }`, `{ createdAt: -1 }` | filter + sort |
| patients | `{ doctorId: 1, createdAt: -1 }` | per-doctor lists |
| patients | `{ condition: 1, createdAt: -1 }`, `{ createdAt: -1 }` | filters + sorting |
| patients | `{ name: 1 }` | name lookups |

Dates are normalised to UTC calendar-day boundaries server-side; a `YYYY-MM-DD` value means `00:00:00.000Z` for `startDate` and `23:59:59.999Z` for `endDate`, so all clients get identical results.

## 10. Key technical decisions

1. **Cookie-based JWT with cross-origin configuration.** The access token lives in an HTTP-only cookie, so JavaScript cannot read it (XSS hardening). `SameSite=lax`/`Secure=false` is used locally; production uses `SameSite=none`/`Secure=true` with credentials-enabled CORS restricted to explicit origins. Bearer tokens are also accepted for API clients/tests.
2. **Aggregation-first read paths.** List endpoints combine `$lookup`/`$facet` and projections to compute patient counts, join doctor names, paginate and count in one database call. Analytics use `$group`/`$dateToString` rather than loading collections into Node, avoiding N+1 patterns and large memory use.
3. **Thin controllers, testable services.** All business rules live in `services/`, so HTTP tests exercise real code paths and the service layer can be reused.

## 11. Performance

- Database-level pagination and sorting; the front end never receives a whole collection.
- Lean queries for single-record reads; `$project` limits fields in aggregations.
- `$lookup` with a `$count` sub-pipeline instead of one query per doctor.
- Indexes aligned to the actual filter/sort combinations (see above).
- Rate limiting on login with `skipSuccessfulRequests`, compression middleware, bounded request body size.

## 12. Security

- Passwords hashed with bcrypt (cost 12 in seed, 10 in tests) and never selected by default; `toJSON` strips the hash.
- Dummy-hash comparison for unknown emails reduces timing-based enumeration.
- Helmet security headers; CORS allowlist with credentials; HTTP-only, Secure, SameSite cookies in production.
- Zod validates every body/query/param; invalid ObjectIds are rejected before hitting MongoDB.
- Secrets only from environment variables; seed refuses production by default and never echoes credentials.

## 13. Testing

```bash
npm test              # 36 tests against a real in-memory MongoDB
npm run test:watch
npm run typecheck
npm run build
```

Coverage: auth/login/logout/me, unauthorized + forged tokens, health, doctor CRUD, duplicate emails, invalid input/IDs, pagination, search, filters, sorting, relationship-protected deletion, patient CRUD (including missing optional contact fields), and all dashboard aggregations plus empty states.

## 14. Deployment (Render + MongoDB Atlas)

1. Create a MongoDB Atlas cluster, add a database user, allow Render egress (`0.0.0.0/0` or Render's IPs), copy the SRV connection string.
2. Create a Render **Web Service** from this repo/folder. `render.yaml` is included: build `npm install && npm run build`, start `npm start`, health check `/api/v1/health`.
3. Set environment variables in Render: `MONGODB_URI`, `JWT_SECRET` (generated), `CORS_ORIGINS=https://your-frontend.vercel.app`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, `NODE_ENV=production`.
4. Run `npm run seed` once against the production database using a one-off Render shell with `ADMIN_*` variables (or locally with the production URI). Set `ALLOW_SEED_IN_PRODUCTION=true` for that single command.
5. Verify `GET /api/v1/health` returns 200.

## 15. Known limitations

- No refresh-token rotation; the access token expires after `JWT_EXPIRES_IN` (default 7 days) and the admin must sign in again.
- There is no public registration by design; only seeded admins can sign in.
- Email/patient-contact fields are optional and not unique by design.
