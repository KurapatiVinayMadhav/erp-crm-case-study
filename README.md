# Nirvana Ops — Mini ERP + CRM Operations Portal

A full-stack ERP/CRM for a wholesale & distribution company. Internal teams
(sales, warehouse, accounts, admin) use it to manage customers and follow-ups,
products and stock, stock movements, and the complete **sales challan** flow —
from draft, through confirmation (which deducts stock), to cancellation (which
restores it).

Built as a case-study assignment. Stack: **Node.js + TypeScript + Express +
Prisma + PostgreSQL** on the backend, **React + TypeScript + Vite** on the
frontend. JWT role-based auth, REST APIs with validation, pagination, search
and structured errors.

---

## Repository layout

```
.
├── backend/                 Express + TypeScript + Prisma REST API
│   ├── prisma/              schema, migrations, database seed
│   ├── src/modules/         auth, customers, products, stock, challans, dashboard
│   └── .env.example         environment template
├── frontend/                React + TypeScript + Vite SPA
│   └── src/pages/           login, dashboard, customers, products, stock, challans
├── postman/                 Postman collection for the whole API
└── docker-compose.yml       local PostgreSQL
```

## Demo credentials

All seeded users share the password **`demo@12345`**:

| Role      | Email                 |
| --------- | --------------------- |
| Admin     | admin@nirvana.in      |
| Sales     | sales@nirvana.in      |
| Warehouse | warehouse@nirvana.in  |
| Accounts  | accounts@nirvana.in   |

`npm run db:setup` reseeds the database every time, so state is predictable.

## Role policy

| Area            | Admin | Sales | Warehouse | Accounts |
| --------------- | :---: | :---: | :-------: | :------: |
| View (all areas)|  ✔    |  ✔    |    ✔      |    ✔     |
| Customers CRUD / follow-ups | ✔ | ✔ | — | — |
| Products create / edit | ✔ | — | ✔ | — |
| Record stock movements (IN/OUT) | ✔ | — | ✔ | — |
| Create challans | ✔ | ✔ | — | — |
| Confirm challans | ✔ | — | ✔ | — |
| Cancel challans | ✔ | — | — | — |

## Run locally (development)

Prerequisites: **Node 18+** and **Docker** (or any local PostgreSQL 14+).

```bash
# 1. Start the database
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env          # keep the defaults for local dev
npm install
npm run db:setup              # apply migrations + seed demo data
npm run dev                   # API on http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # app on http://localhost:5173
```

> Port note: this project maps the database to host port **5433** by default so
> it can run alongside other local Postgres tools/projects that already use 5432
> (the `docker compose up` will fail with "address already in use" if 5432 is
> taken). If 5432 is free on your machine, edit `docker-compose.yml` to
> `"5432:5432"` and update `DATABASE_URL` accordingly.

Open <http://localhost:5173> and sign in with any demo account.

### Without Docker

Install PostgreSQL locally, create a database, and point `DATABASE_URL` at it
(e.g. `postgresql://postgres:postgres@localhost:5432/erp_crm`), then run
`npm run db:setup` followed by `npm run dev`.

## Environment variables

Environment variables are read from `backend/.env` at boot (via `dotenv`).
The `.env` file is **git-ignored**; `.env.example` documents every variable.

| Variable        | Purpose                            | Local default                       |
| --------------- | ---------------------------------- | ----------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string       | `postgresql://erp:erp_password@localhost:5433/erp_crm` |
| `JWT_SECRET`    | JWT signing secret (long random in prod) | `change-me-to-a-long-random-string` |
| `JWT_EXPIRES_IN`| Token lifetime                     | `7d`                                |
| `PORT`          | API port                           | `4000`                              |
| `CORS_ORIGIN`   | Allowed frontend origins (comma separated) | `http://localhost:5173` |

The frontend reads `VITE_API_URL` (optional). In development the Vite dev
server proxies `/api` to the backend automatically, so no value is needed.

## API overview

Base path: `/api/v1`

| Method | Endpoint                     | Access              | Notes |
| ------ | ---------------------------- | ------------------- | ----- |
| POST   | `/auth/login`                | public              | returns `{ token, user }` |
| GET    | `/auth/me`                   | any authenticated   | current user |
| GET    | `/customers`                 | any                 | `?search=&status=&type=&page=&pageSize=` |
| GET    | `/customers/:id`             | any                 | includes follow-ups |
| POST   | `/customers`                 | sales, admin        | |
| PATCH  | `/customers/:id`             | sales, admin        | |
| DELETE | `/customers/:id`             | sales, admin        | blocked if challans exist |
| POST   | `/customers/:id/followups`   | sales, admin        | |
| GET    | `/products`                  | any                 | `?search=&category=&lowStock=true` |
| POST   | `/products`                  | warehouse, admin    | |
| PATCH  | `/products/:id`              | warehouse, admin    | `currentStock` not editable directly |
| GET    | `/stock-movements`           | any                 | `?type=&productId=&page=` |
| POST   | `/stock-movements`           | warehouse, admin    | adjusts stock, never negative |
| GET    | `/challans`                  | any                 | `?status=&customerId=&search=` |
| POST   | `/challans`                  | sales, admin        | `status: DRAFT` or `CONFIRMED` |
| GET    | `/challans/:id`              | any                 | snapshot line items |
| POST   | `/challans/:id/confirm`      | warehouse, admin    | deducts stock, records OUT |
| POST   | `/challans/:id/cancel`       | admin               | restores stock, records IN |
| GET    | `/dashboard/summary`         | any                 | KPI counts, low stock, recent activity |

A ready-made **Postman collection** (with an auto-login pre-request script)
lives in [`postman/erp-crm.postman_collection.json`](postman/erp-crm.postman_collection.json).

## Key business rules

- **Challan numbering** is automatic: `CHL-<YYYY>-<sequence>`, allocated inside
  a database transaction to avoid duplicates.
- **Line items snapshot** the product name, SKU and unit price at creation time,
  so an edited product does not silently change a historic challan.
- **Stock never goes negative.** Confirming a challan pre-checks every line
  against current stock and returns HTTP 400 with a per-item shortage message —
  the whole confirmation is one transaction, so nothing is partially applied.
- **Draft → Confirmed → Cancelled.** A draft touches no stock. Confirmation
  deducts stock and writes stock-OUT movements. Cancellation (admin) restores
  stock and writes stock-IN movements.
- **Create-as-confirmed** is supported: passing `status: "CONFIRMED"` on
  `POST /challans` runs the same deduction path in the creating transaction.

## Architecture notes

- **Layered modules**: each module has Zod validation schemas → service (the
  only layer touching Prisma) → Express routes with auth/role middleware.
- **Error handling** is centralised in `src/middleware/error.ts`: Zod errors →
  `400` with a per-field `errors` map, explicit `HttpError` → its own status,
  unique-constraint violations → `409`, everything else → `500`.
- **Role policy** is a single table in `src/middleware/auth.ts` (`can.*`) shared
  by every route guard.
- **Frontend** is plain React + CSS (no UI framework) with the same role rules
  mirrored in `src/lib/roles.ts`. The Vite dev server proxies `/api` so the
  browser talks to one origin.

## Deployment

No money was spent; any free tier satisfies the stack. A suggested setup:

| Piece     | Host            | How                                                                 |
| --------- | --------------- | ------------------------------------------------------------------- |
| Database  | **Neon** or **Supabase** | create a project, copy the connection string |
| Backend   | **Render**      | new Web Service → repo `backend/` dir, build `npm install && npm run build`, start `npm run start`. Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (your frontend URL) in the dashboard's environment tab. Run `npm run db:setup` once via a shell session or start command. |
| Frontend  | **Vercel** or **Netlify** | root `frontend/`, build command `npm run build`, output `dist`. Optional env `VITE_API_URL` if you don't use a reverse proxy. |

### Live instances

| Piece           | URL                                                             |
| --------------- | --------------------------------------------------------------- |
| Frontend (app)  | <https://erp-crm-case-study.vercel.app>                           |
| Backend API     | <https://erp-crm-case-study-prsn.onrender.com>                    |
| Health check    | <https://erp-crm-case-study-prsn.onrender.com/health>             |

Log in at the frontend with any demo account (`demo@12345`). The hosted
database is a free-tier Neon PostgreSQL; the API runs on Render's free tier,
which sleeps after ~15 minutes idle — open `/health` and wait a few seconds if
the first request is slow.

### Docker

`docker-compose.yml` runs the local database. A full-containerised run (API +
web) is possible and follows the same two build stages; see the `Dockerfile`s
in each folder if you prefer. *(Bonus item — the README deployment on GitLab
also documents a GitHub Actions workflow in `.github/workflows`.)*

## Assumptions & limitations

Assumptions:
- Single inventory location per product (`location` is free text); no bins or
  sub-locations.
- Prices are inclusive of tax; no tax lines on challans.
- Follow-up notes are chronological and append-only (no edit/delete).
- Only one owner (`createdBy`) is tracked per customer; no team assignments.
- Products are never hard-deleted; stock movements reference them forever.
- GST number enforced as 15-char ISIN format when supplied.

Known limitations / next steps:
- No invoice/PDF export yet (print stylesheet is the current workaround); a
  real PDF export can be added on the challan endpoint.
- No image upload for products (S3 integration left for the bonus pass).
- No pagination on follow-up history (bounded per customer, acceptable).
- Password reset / user management UI not built (seed + DB only).
- Rate limiting is basic (global, per IP).
- The frontend print view is basic; a purpose-built challan document is TODO.

## Verification checklist

```bash
cd backend
npm run typecheck   # no type errors
npm run build       # compiles to dist/
```

Then hit the API: login → customers → products → stock → challan draft →
confirm → cancel and watch the ledger reconcile itself in real time.