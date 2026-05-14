# Warehouse Management System — Backend

A production-ready **NestJS** REST API for warehouse management.  
Covers **Auth**, **Products**, **Inventory**, **Orders**, and **Audit** with full unit, E2E, and k6 performance testing.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Installation & Build](#installation--build)
5. [Running the Server](#running-the-server)
6. [API Documentation](#api-documentation)
7. [Unit Tests](#unit-tests)
8. [E2E Tests](#e2e-tests)
9. [Performance Tests (k6)](#performance-tests-k6)
   - [Smoke Tests](#smoke-tests)
   - [Stress Tests](#stress-tests)
   - [Legacy Perf Tests](#legacy-perf-tests)
   - [Reading k6 Output](#reading-k6-output)
10. [Manual QA — Postman](#manual-qa--postman)
11. [Database GUI — DBeaver](#database-gui--dbeaver)
12. [Project Structure](#project-structure)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
src/
├── database/          # DatabaseModule — TypeORM/PostgreSQL setup
├── modules/
│   ├── auth/          # JWT auth, bcrypt, register/login
│   ├── products/      # Product CRUD, SKU management
│   ├── inventory/     # Stock-in, stock-out, atomic transactions
│   ├── orders/        # Order lifecycle state machine
│   └── audit/         # Audit log trail
└── main.ts            # Bootstrap, Swagger, global pipes
```

**Tech Stack:** NestJS · TypeORM · PostgreSQL · JWT · Swagger · Jest · k6

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20.x | https://nodejs.org |
| npm | ≥ 10.x | bundled with Node |
| PostgreSQL | ≥ 14 | https://www.postgresql.org |
| k6 | ≥ 0.50 | https://k6.io/docs/get-started/installation |

**Install k6 on macOS:**
```bash
brew install k6
```

**Install k6 on Linux:**
```bash
sudo gpg --no-default-keyring \
  --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] \
  https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

---

## Environment Setup

### 1. Create the PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE warehouse_db;"
psql -U postgres -c "CREATE USER warehouse_user WITH PASSWORD 'warehouse_pass';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE warehouse_db TO warehouse_user;"
```

### 2. Create the `.env` file

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Or create `.env` manually inside `warehouse-system/backend/`:

```env
# ── Server ──────────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ── Database ─────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=warehouse_user
DB_PASSWORD=warehouse_pass
DB_NAME=warehouse_db

# DEV ONLY — auto-creates/alters tables from entity definitions.
# Set to false in production and use migrations instead.
DB_SYNCHRONIZE=true

# Print all SQL queries to console (useful for debugging)
DB_LOGGING=false

# ── JWT ──────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

> ⚠️ **Never commit `.env` to git.** It is already listed in `.gitignore`.

---

## Installation & Build

```bash
# Navigate to the backend directory
cd warehouse-system/backend

# Install all dependencies (including devDependencies)
npm install

# Compile TypeScript to JavaScript (outputs to dist/)
npm run build
```

The compiled output in `dist/` is required for production starts.

---

## Running the Server

```bash
# Development mode — auto-reload on file change (recommended for local dev)
npm run start:dev

# Production mode — requires 'npm run build' first
npm run start:prod

# Debug mode — attaches a Node.js inspector on port 9229
npm run start:debug
```

The API will be available at: **`http://localhost:3000/api`**

---

## API Documentation

Swagger UI is automatically available when the server is running:

```
http://localhost:3000/api/docs
```

All endpoints are documented with request/response schemas and JWT Bearer auth support.

### Quick API Reference

| Module | Endpoint | Method | Auth Required |
|--------|----------|--------|:---:|
| Auth | `/api/auth/register` | POST | ❌ |
| Auth | `/api/auth/login` | POST | ❌ |
| Auth | `/api/auth/profile` | GET | ✅ |
| Products | `/api/products` | GET / POST | ✅ |
| Products | `/api/products/:id` | GET / PATCH / DELETE | ✅ |
| Inventory | `/api/inventory/stock-in` | POST | ✅ |
| Inventory | `/api/inventory/stock-out` | POST | ✅ |
| Inventory | `/api/inventory/stocks/:productId` | GET | ✅ |
| Inventory | `/api/inventory/stocks/low-stock` | GET | ✅ |
| Orders | `/api/orders` | GET / POST | ✅ |
| Orders | `/api/orders/:id` | GET | ✅ |
| Orders | `/api/orders/:id/confirm` | POST | ✅ |
| Orders | `/api/orders/:id/fulfill` | POST | ✅ |
| Orders | `/api/orders/:id/cancel` | POST | ✅ |
| Audit | `/api/audit/logs` | GET | ✅ |

### Order Lifecycle

```
PENDING ──► CONFIRMED ──► FULFILLED
   │              │
   └──────────────┴──────► CANCELLED
```

- `POST /api/orders` → creates order with status `pending`
- `POST /api/orders/:id/confirm` → transitions to `confirmed` (deducts stock for `sales` type)
- `POST /api/orders/:id/fulfill` → transitions to `fulfilled`
- `POST /api/orders/:id/cancel` → transitions to `cancelled` (restores stock if previously confirmed)

---

## Unit Tests

Unit tests use **Jest** with mocked repositories — **no database connection required**.

```bash
# Run all unit tests once
npm test

# Run in watch mode (re-runs on file save — best for local development)
npm run test:watch

# Run with coverage report
npm run test:cov

# Run a specific module's tests
npx jest src/modules/auth
npx jest src/modules/orders

# Run tests matching a name pattern
npx jest --testNamePattern="should login"

# Run in debug mode (attach debugger to breakpoints in tests)
npm run test:debug
```

### Coverage Report

After `npm run test:cov`, open the HTML report:

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html
```

### Test File Locations

```
src/
└── modules/
    ├── auth/tests/auth.service.spec.ts
    ├── products/tests/products.service.spec.ts
    └── inventory/tests/inventory.service.spec.ts
```

---

## E2E Tests

E2E tests use **Supertest** and spin up a real NestJS application against the actual database.

> ⚠️ **Requires a running PostgreSQL** with `.env` configured before running E2E tests.

```bash
# Run all E2E tests
npm run test:e2e
```

### E2E Test File Locations

```
test/
├── helpers/
│   └── test-app.helper.ts   # Shared NestJS app bootstrap for tests
└── e2e/
    ├── auth.e2e-spec.ts
    ├── products.e2e-spec.ts
    └── inventory.e2e-spec.ts
```

---

## Performance Tests (k6)

> ⚠️ **Start the NestJS server first** — k6 tests call the real running API.  
> ⚠️ **k6 must be installed** — see [Prerequisites](#prerequisites).

All k6 scripts live in the `k6/` directory:

```
k6/
├── setup/
│   ├── config.js        # BASE_URL and shared scenario config
│   ├── helpers.js       # Auth utilities, unique data generators, HTTP helpers
│   └── thresholds.js    # Per-module SLA threshold definitions
├── smoke/               # Post-deploy smoke scripts (1 VU, ~20–30s each)
│   ├── auth.smoke.js
│   ├── products.smoke.js
│   ├── inventory.smoke.js
│   └── orders.smoke.js
├── stress/              # Stress test scripts (up to 70 VUs, ~5min each)
│   ├── auth.stress.js
│   ├── products.stress.js
│   ├── inventory.stress.js
│   └── orders.stress.js
├── scenarios/           # Legacy TEST_TYPE-driven scripts
│   ├── auth.perf.js
│   ├── products.perf.js
│   ├── inventory.perf.js
│   └── orders.perf.js
├── reports/             # JSON/CSV output files (git-ignored)
├── smoke-all.js         # Runs all 4 module smoke tests concurrently
├── stress-all.js        # Runs all 4 module stress tests concurrently
└── run-all.js           # Legacy combined runner (TEST_TYPE driven)
```

---

### Smoke Tests

**Purpose:** Verify the API is alive and all critical endpoints return correct responses after a deploy.  
**When to run:** After every deployment, in CI/CD pipelines, before heavier tests.  
**Load:** 1 VU per module.  
**Expected duration:** ~35 seconds for the full suite.

```bash
# ── Full suite (all 4 modules concurrently, ~35s) ─────────────
npm run smoke

# ── Individual module smoke tests ─────────────────────────────
npm run smoke:auth
npm run smoke:products
npm run smoke:inventory
npm run smoke:orders

# ── Save results to a JSON report file ────────────────────────
npm run smoke:report
# → writes: k6/reports/smoke-all.json

# ── Run directly with k6 ──────────────────────────────────────
k6 run k6/smoke-all.js
k6 run k6/smoke/orders.smoke.js
```

**What each module's smoke test verifies:**

| Module | Checks |
|--------|--------|
| **Auth** | `POST /auth/register → 201`, `POST /auth/login → 200 + accessToken`, `bad creds → 401` |
| **Products** | `GET /products → 200 + data[]`, `POST /products → 201 + id`, `GET /products/:id → 200` |
| **Inventory** | `GET /inventory/stocks/:id → 200 + currentQuantity`, `stock-in → 201`, `insufficient stock → 400` |
| **Orders** | `GET /orders → 200 + data[]`, `POST /orders → 201 + pending`, `confirm → 200 + confirmed`, `fulfill → 200 + fulfilled` |

**Smoke thresholds (relaxed — just confirm no crashes):**

```
http_req_duration p(95) < 2000ms
http_req_failed rate < 5%
```

---

### Stress Tests

**Purpose:** Find the system's breaking point under sustained high concurrency.  
**When to run:** Before major releases, after infrastructure changes, for capacity planning.  
**Load:** Ramps from 0 to 70 VUs per module.  
**Expected duration:** ~5–6 minutes per run.

```bash
# ── Full suite (all 4 modules concurrently, peak ~280 VUs total) ──
npm run stress

# ── Individual module stress tests ────────────────────────────────
npm run stress:auth         # bcrypt CPU saturation test (70 VUs)
npm run stress:products     # Read flood + write storm (70 VUs)
npm run stress:inventory    # Race condition / DB lock contention (70 VUs)
npm run stress:orders       # Cross-table transaction flood (70 VUs)

# ── Save results to report files ──────────────────────────────────
npm run stress:report       # → k6/reports/stress-all.json
npm run stress:csv          # → k6/reports/stress-all.csv

# ── Run directly with k6 ──────────────────────────────────────────
k6 run k6/stress-all.js
k6 run k6/stress/inventory.stress.js
```

**Stress ramp profile (per module):**

| Time | VUs | Phase |
|------|-----|-------|
| 0s → 30s | 0 → 10 | Warm-up |
| 30s → 1m | 10 → 30 | Normal load baseline |
| 1m → 2m | 30 → 50 | Stress zone |
| 2m → 2m30s | 50 → 70 | Maximum stress |
| 2m30s → 3m30s | 70 (held) | Sustained stress — expose deadlocks/timeouts |
| 3m30s → 4m | 70 → 10 | Recovery ramp-down |
| 4m → 4m20s | 10 → 0 | Graceful shutdown |

**Stress thresholds:**

```
p(95) < 1500ms     p(99) < 3000ms
error rate < 5%    (inventory stress allows 15% — expected 400s from stock exhaustion)
```

**Key scenario — inventory atomicity under load:**  
When 70 VUs simultaneously call `POST /inventory/stock-out` on the same product, the stock must **never go negative**. As many requests as there is available stock should succeed (201); the rest must return 400 — never 500. This validates PostgreSQL transaction isolation.

---

### Legacy Perf Tests

The original scripts in `k6/scenarios/` support multiple scenario types via the `TEST_TYPE` environment variable:

```bash
# Using npm scripts
npm run perf:smoke       # 1 VU, 20s
npm run perf:load        # 20 VUs, 2 min
npm run perf:stress      # 40 VUs, 3 min
npm run perf:spike       # 100 VU burst

# Per-module (load profile)
npm run perf:auth
npm run perf:products
npm run perf:inventory
npm run perf:orders

# Save combined report
npm run perf:report      # → k6/reports/results.json

# Run directly with any TEST_TYPE
k6 run k6/run-all.js -e TEST_TYPE=smoke
k6 run k6/run-all.js -e TEST_TYPE=load
k6 run k6/run-all.js -e TEST_TYPE=stress
k6 run k6/scenarios/products.perf.js -e TEST_TYPE=spike
```

---

### Reading k6 Output

After any k6 run, you'll see a summary like:

```
checks_succeeded...: 99.80%  1498 out of 1500
http_req_duration..: avg=45ms  p(90)=90ms  p(95)=110ms  p(99)=220ms
http_req_failed....: 0.20%    3 out of 1500
http_reqs..........: 1500     25.00/s
```

**Key metrics to watch:**

| Metric | What it means |
|--------|---------------|
| `checks_succeeded` | % of your `check()` assertions that passed |
| `http_req_duration p(95)` | 95% of all requests completed in this time or less |
| `http_req_failed rate` | % of HTTP errors (non-2xx or connection errors) |
| `http_reqs rate` | Throughput in requests/second |
| `orders_create_duration` | Custom per-operation latency trend |

**Threshold results in the summary:**
- `✓` green → threshold passed (SLA met)
- `✗` red → threshold breached — investigate!

---

## Manual QA — Postman

Postman collection được chuẩn bị sẵn cho QA Manual testing, bao gồm tất cả API endpoints với test scripts tự động.

### Files

```
postman/
├── warehouse-api.postman_collection.json    # Import vào Postman
└── warehouse-api.postman_environment.json  # Import environment variables
```

### Quick Start

1. Mở Postman → **Import** → chọn file `postman/warehouse-api.postman_collection.json`
2. **Import** tiếp file `postman/warehouse-api.postman_environment.json`
3. Góc trên phải → chọn environment **"Warehouse API — Local"**
4. Chạy **Auth / Login** → token được lưu tự động vào `{{accessToken}}`
5. Tiếp tục chạy các request theo luồng

### Hướng dẫn đầy đủ

Xem chi tiết tại: **[postman/POSTMAN-GUIDE.md](postman/POSTMAN-GUIDE.md)**

---

## Database GUI — DBeaver

DBeaver là công cụ GUI miễn phí để xem, query và kiểm tra dữ liệu PostgreSQL trực tiếp.

### Thông tin kết nối

| Trường | Giá trị |
|--------|---------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `warehouse_db` |
| **Username** | `warehouse_user` |
| **Password** | `warehouse_pass` |

### Quick Start

1. Cài DBeaver: `brew install --cask dbeaver-community`
2. Mở DBeaver → **Database → New Database Connection** → chọn **PostgreSQL**
3. Điền thông tin kết nối bên trên → **Test Connection** → **Finish**
4. Expand `warehouse_db → Schemas → public → Tables` để xem dữ liệu

### Hướng dẫn đầy đủ và SQL queries cho QA

Xem chi tiết tại: **[docs/DBEAVER-GUIDE.md](docs/DBEAVER-GUIDE.md)**

---

## Project Structure

```
warehouse-system/backend/
├── src/
│   ├── database/
│   │   └── database.module.ts       # TypeORM global PostgreSQL config
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── decorators/          # @CurrentUser() decorator
│   │   │   ├── dto/                 # CreateUserDto, LoginDto
│   │   │   ├── entities/            # User entity
│   │   │   ├── guards/              # JwtAuthGuard, LocalAuthGuard
│   │   │   ├── strategies/          # JwtStrategy, LocalStrategy
│   │   │   ├── tests/               # Unit specs
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── products/                # Same structure as auth/
│   │   ├── inventory/               # Same structure as auth/
│   │   ├── orders/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   │   ├── order.entity.ts       # Order state machine + enums
│   │   │   │   └── order-item.entity.ts  # Line items (product + quantity + price)
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   └── orders.module.ts
│   │   └── audit/
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── helpers/
│   │   └── test-app.helper.ts
│   └── e2e/
│       ├── auth.e2e-spec.ts
│       ├── products.e2e-spec.ts
│       └── inventory.e2e-spec.ts
├── k6/
│   ├── setup/                       # config.js · helpers.js · thresholds.js
│   ├── smoke/                       # Smoke test scripts
│   ├── stress/                      # Stress test scripts
│   ├── scenarios/                   # Legacy TEST_TYPE scripts
│   ├── reports/                     # Output files (git-ignored)
│   ├── smoke-all.js
│   ├── stress-all.js
│   └── run-all.js
├── postman/
│   ├── warehouse-api.postman_collection.json   # Postman collection (all APIs)
│   ├── warehouse-api.postman_environment.json  # Postman environment variables
│   └── POSTMAN-GUIDE.md                        # Hướng dẫn sử dụng Postman
├── docs/
│   └── DBEAVER-GUIDE.md                        # Hướng dẫn kết nối DBeaver
├── dist/                            # Compiled JS output (git-ignored)
├── .env                             # Local env vars (git-ignored)
├── .env.example                     # Template to copy from
├── package.json
├── tsconfig.json
└── README.md
```

---

## Troubleshooting

### `Error: connect ECONNREFUSED 127.0.0.1:5432`
PostgreSQL is not running.
```bash
# macOS (Homebrew)
brew services start postgresql@14

# Linux
sudo systemctl start postgresql
```

### `Error: database "warehouse_db" does not exist`
```bash
psql -U postgres -c "CREATE DATABASE warehouse_db;"
```

### `k6: command not found`
k6 is not installed. Install it with `brew install k6` (macOS) or see [Prerequisites](#prerequisites).

### `ERRO[0000] connection refused` in k6 output
The NestJS server is not running. Start it before k6:
```bash
npm run start:dev
```

### `JWT_SECRET is not defined` error on startup
`.env` file is missing or `JWT_SECRET` is not set. See [Environment Setup](#environment-setup).

### `GET /orders` returns 500 (Internal Server Error)
Ensure you are on the latest code — a TypeORM query alias bug (`order.created_at` vs `order.createdAt`) was fixed in `orders.service.ts`.

### `POST /orders/:id/confirm` or `fulfill` returns 201 instead of 200
The endpoints were updated with `@HttpCode(HttpStatus.OK)` in `orders.controller.ts`. Ensure you are on the latest code.

### `DB_SYNCHRONIZE=true` in production
Set `DB_SYNCHRONIZE=false` and use TypeORM migrations for schema changes in production environments.

### Unit tests fail with `Cannot find module`
```bash
npm install   # reinstall all dependencies including devDependencies
```

### Port 3000 already in use
```bash
# Find and kill the process on port 3000
lsof -ti :3000 | xargs kill -9
```

### k6 `http_req_failed` rate is high unexpectedly
1. Confirm the server is running: `curl http://localhost:3000/api/products`
2. Check `.env` values are correct (especially `DB_*` settings)
3. Check the server console for errors
4. Run a single smoke script to isolate the issue: `npm run smoke:auth`
