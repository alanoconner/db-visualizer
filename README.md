# db-visualizer

Point it at a Postgres database and get:

1. **Whole-DB ER diagram** — every table, its columns, and FK relationships,
   as a draggable/zoomable graph. Click a table to browse its rows.
2. **Linked-data diagram** — pick a row in that table, and it draws a new
   graph showing that row plus every row in directly-linked tables (one hop
   out, both directions along foreign keys). Each linked table is paginated,
   and has a "custom query" button to scope it down to specific columns/rows.

## Run it

```bash
cp .env.example .env
# edit .env with your DATABASE_URL
docker-compose up --build
```

Then open http://localhost:4000

If your Postgres is also running in Docker on the same machine, use
`host.docker.internal` instead of `localhost` in `DATABASE_URL`.

## Notes / current scope

- **Postgres only** for now (uses `information_schema`).
- Everything runs in a `READ ONLY` transaction server-side — this tool
  never writes to your database, including the custom query feature
  (which is also restricted to a single `SELECT` statement).
- Linked-data traversal is currently **one hop** from the selected row
  (tables it references, and tables that reference it). Multi-hop
  traversal is a natural next step but isn't in yet — worth adding a
  depth control once one-hop feels solid, since row-level FK graphs can
  explode fast beyond that.
- For best safety, connect with a read-only Postgres role rather than a
  full-access one.

## Project structure

```
server/           Express API (schema introspection, row queries, linked lookup)
client/           React + React Flow frontend (Vite)
Dockerfile        Multi-stage build: client build -> server runtime, single image
docker-compose.yml
```
