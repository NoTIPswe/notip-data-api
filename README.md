# notip-data-api

NestJS microservice that exposes encrypted sensor measures stored in TimescaleDB (PostgreSQL) to authorised tenants. It also bridges live telemetry arriving from NATS JetStream to HTTP clients via Server-Sent Events, and responds to internal NATS request-reply calls for storage cost reporting.

## Table of contents

- [Architecture overview](#architecture-overview)
- [HTTP API](#http-api)
- [NATS contracts](#nats-contracts)
- [Authentication & authorisation](#authentication--authorisation)
- [Environment variables](#environment-variables)
- [Development environment](#development-environment)
- [Running locally](#running-locally)
- [Scripts](#scripts)
- [Testing](#testing)

---

## Architecture overview

```
IoT gateways
    │ NATS JetStream (mTLS)
    ▼
TelemetryStreamBridgeService   ←─ consumes telemetry.data.<tenantId>.<gatewayId>
    │
    ├─► TimescaleDB (TypeORM)   – persisted encrypted measures
    │
    └─► StreamListenerService   – fan-out to live SSE subscribers
            │
            ▼
HTTP clients  ──GET /measures/query──►  paginated encrypted measures
              ──GET /measures/stream──► SSE live stream
              ──GET /measures/export──► full time-window dump
              ──GET /sensor──────────►  recently-seen sensors

management-api  ──NATS internal.cost──►  storage usage reply
```

All measure payloads are **end-to-end encrypted** (AES-256-GCM). This service stores and returns the ciphertext as-is and never decrypts it.

---

## HTTP API

Full OpenAPI 3.0 spec: [`api-contracts/openapi/openapi.yaml`](api-contracts/openapi/openapi.yaml)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/measures/query` | Paginated encrypted measures for a time window |
| `GET` | `/measures/stream` | SSE live stream of encrypted measures |
| `GET` | `/measures/export` | Non-paginated full export for a time window |
| `GET` | `/sensor` | Sensors seen in the last ten minutes |
| `GET` | `/metrics` | Prometheus metrics (public) |
| `GET` | `/` | Root endpoint (public) |

### Common query parameters

- **`from` / `to`** – ISO 8601 time window (required for query & export).
- **`gatewayId`** – repeatable filter, e.g. `?gatewayId=gw-1&gatewayId=gw-2`.
- **`sensorId`** – repeatable sensor filter.
- **`sensorType`** – repeatable type filter (`temperature`, `humidity`, …).
- **`cursor`** / **`limit`** – cursor-based pagination for `/measures/query` (max 999).
- **`since`** – optional replay start for `/measures/stream`.

---

## NATS contracts

Full AsyncAPI 2.6 spec: [`api-contracts/asyncapi/nats-contracts.yaml`](api-contracts/asyncapi/nats-contracts.yaml)

This service is involved in two NATS channels:

| Channel | Role | Description |
|---------|------|-------------|
| `telemetry.data.{tenantId}.{gatewayId}` | Consumer | Ingests encrypted BLE telemetry from IoT gateways via JetStream |
| `internal.cost` | Responder | Returns per-tenant storage size (bytes) to management-api on request |

---

## Authentication & authorisation

Every request (except `GET /`, `GET /metrics`, and `OPTIONS`) must carry a `Bearer` token in the `Authorization` header.

The `TenantAccessGuard` forwards the token to the management API (`MGMT_API_URL/auth/tenant-status`) and resolves the tenant context. The resolved `tenantId` is then used to scope all database queries and NATS stream subscriptions.

Tenants in **read-only** (suspended) mode are blocked from any non-safe HTTP method.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATA_API_PORT` | No | `3000` | HTTP listening port |
| `MEASURES_DB_HOST` | Yes* | `localhost` | TimescaleDB host |
| `MEASURES_DB_PORT` | Yes* | `5432` | TimescaleDB port |
| `MEASURES_DB_USER` | Yes* | — | Database user |
| `MEASURES_DB_PASSWORD` | No | — | Database password |
| `MEASURES_DB_NAME` | Yes* | — | Database name |
| `DB_SSL` | No | `false` | Enable TLS for DB connection (`true`/`1`) |
| `NATS_URL` | No | — | Comma-separated NATS server URLs (alias for `NATS_SERVERS`) |
| `NATS_SERVERS` | No | — | Comma-separated NATS server URLs (takes precedence over `NATS_URL`) |
| `NATS_TOKEN` | No | — | NATS token authentication |
| `NATS_USER` | No | — | NATS username |
| `NATS_PASSWORD` | No | — | NATS password |
| `NATS_TLS_CA` | No | — | Path to CA certificate for mTLS |
| `NATS_TLS_CERT` | No | — | Path to client certificate for mTLS |
| `NATS_TLS_KEY` | No | — | Path to client private key for mTLS |
| `MGMT_API_URL` | No | `https://management-api:3000` | Management API base URL for tenant auth |

*Required outside of `NODE_ENV=test`.

---

## Development environment

A Dev Container is provided (`.devcontainer/devcontainer.json`) based on the shared `ghcr.io/notipswe/notip-nest-dev` image. Opening the repo in VS Code or GitHub Codespaces will automatically install dependencies and register pre-commit hooks.

Recommended VS Code extensions are declared in the devcontainer: ESLint, Prettier, Jest Runner, SonarLint, and the Docker extension.

### Pre-commit hooks

[pre-commit](https://pre-commit.com) runs the following checks on every commit:

| Hook | Command |
|------|---------|
| ESLint | `npm run lint:check` |
| Prettier | `npm run format:check` |
| TypeScript type check | `npm run typecheck` |
| OpenAPI spec regen | `npm run build:openapi-spec` |
| Secret scanning | [gitleaks](https://github.com/gitleaks/gitleaks) v8 |

To install hooks manually: `pre-commit install --install-hooks`

### Conventional commits & releases

Commits must follow the [Angular commit convention](https://www.conventionalcommits.org). [semantic-release](https://semantic-release.gitbook.io) runs on `main` and automatically:

- bumps the version in `package.json`
- updates `CHANGELOG.md`
- creates a GitHub release

Release rules: `feat` → minor, `fix` / `docs` / `perf` → patch, breaking change → major.

### Code quality

SonarCloud analysis is configured in `sonar-project.properties` (project key `NoTIPswe_notip-data-api`, organisation `notipswe`). It consumes the lcov coverage report (`coverage/lcov.info`), the ESLint JSON report (`eslint-report.json`), and the Jest SonarQube XML report (`coverage/test-reporter.xml`).

---

## Running locally

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Production build + start
npm run build
npm run start:prod
```

The service exposes port `3000` by default.

### Docker

```bash
docker build -t notip-data-api .
docker run -p 3000:3000 \
  -e MEASURES_DB_HOST=localhost \
  -e MEASURES_DB_PORT=5432 \
  -e MEASURES_DB_USER=postgres \
  -e MEASURES_DB_NAME=notip \
  -e MGMT_API_URL=http://management-api:3000 \
  notip-data-api
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Compile TypeScript |
| `npm run lint` | Lint and auto-fix |
| `npm run lint:check` | Lint without fixing (CI) |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | Type-check without emitting |
| `npm run migration:generate` | Generate a TypeORM migration |
| `npm run migration:run` | Apply pending migrations |
| `npm run migration:revert` | Revert the last migration |
| `npm run build:openapi-spec` | Regenerate `openapi.yaml` from decorators |
| `npm run fetch:openapi` | Download OpenAPI spec from a running instance |
| `npm run fetch:asyncapi` | Download filtered AsyncAPI spec |

---

## Testing

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# End-to-end tests
npm run test:e2e
```

Unit tests live alongside source files (`*.spec.ts`). E2E tests are in [`test/`](test/) and use an in-memory persistence mock so no database is required.

Coverage reports are written to `coverage/` (lcov + text). A SonarQube-compatible XML report is also produced at `coverage/test-reporter.xml`.
