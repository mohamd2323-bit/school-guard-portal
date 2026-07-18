# Docker local setup

The local setup uses:

- PostgreSQL 16 in Docker.
- Express API on port `3000`.
- Built Vite frontend served by Nginx on port `8080`.
- An on-demand import service for `backups/production-appdata-2026-07-18.json`.

This local PostgreSQL database is the official development database for this
workspace. Do not use or modify any Replit database unless explicitly requested.

## Optional environment file

Copy `.env.docker.example` to `.env` if you want to change ports, database name, user, or password.

## Build images

```sh
docker compose build
```

## Start the local stack

```sh
docker compose up -d postgres api web
```

Open the app at:

```text
http://localhost:8080
```

The API is also exposed at:

```text
http://localhost:3000/api/healthz
```

## Import production app data into the local PostgreSQL database

Run this after PostgreSQL is started:

```sh
docker compose --profile import run --rm import-appdata
```

The import command first runs `drizzle-kit push` to create/update the local schema, then imports:

```text
backups/production-appdata-2026-07-18.json
```

The import script refuses non-local database URLs. In Docker it connects through `host.docker.internal` to the PostgreSQL port published by Compose.

Expected counts after import:

```text
guards=5118
schools=1993
needs=21
tickets=9
operations=652
violations=0
```

## Stop the stack

```sh
docker compose down
```

To remove the local PostgreSQL data volume too:

```sh
docker compose down -v
```
