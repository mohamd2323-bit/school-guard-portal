# School Guard Portal

Local-first school guard management portal.

This repository is now maintained against the local Docker environment. The
official development database is the local PostgreSQL service from
`docker-compose.yml`.

## Local Stack

- PostgreSQL: `localhost:5432`
- API: `http://localhost:3000`
- Web app: `http://localhost:8080`

## Requirements

- Docker Desktop
- pnpm, only for direct local development outside Docker

## Run Locally

```sh
docker compose build
docker compose up -d postgres api web
```

Check the running services:

```sh
docker compose ps
```

Health checks:

```sh
curl http://localhost:3000/api/healthz
curl http://localhost:8080
```

## Database

The local PostgreSQL database is the official development database. Do not use
or modify any Replit database unless explicitly requested.

The production snapshot used for local seeding is:

```text
backups/production-appdata-2026-07-18.json
```

Import it into the local PostgreSQL database only:

```sh
docker compose --profile import run --rm import-appdata
```

Expected local app data counts after import:

```text
guards=5118
schools=1993
needs=21
tickets=9
operations=652
violations=0
```

## Useful Checks

```sh
docker compose build
docker compose ps
```

The frontend build may warn about the large bundled `xlsx` chunk. This is a
build-size warning, not a runtime failure.

## Project Layout

- `artifacts/api-server`: Express API.
- `artifacts/school-guards`: Vite React application.
- `lib/db`: Drizzle PostgreSQL schema and connection.
- `scripts`: local maintenance scripts, including app data import.
- `docker`: Nginx configuration for the web container.
- `backups`: local seed snapshot used by the import service.
