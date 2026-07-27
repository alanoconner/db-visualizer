# db-visualizer

Point it at a Postgres database and get an interactive, read-only visual
explorer for it — no setup beyond a connection string.

1. **Whole-DB ER diagram** — every table, its columns, and foreign-key
   relationships, as a draggable/zoomable graph. Switch between collapsed,
   keys-only, and all-columns views. Click a table to browse its rows.
2. **Linked-data diagram** — pick a row, and it draws a graph of that row
   plus every row in directly-linked tables (one hop out, both directions
   along foreign keys). Each linked table is paginated and has a
   "custom query" button to scope it to specific columns/rows.

Node positions you drag are remembered (via `localStorage`) so the layout
stays put across reloads.

## Screenshots

<!--
  Add screenshots here, e.g.:
  ![Whole-DB ER diagram](docs/screenshots/schema-diagram.png)
  ![Linked-data diagram](docs/screenshots/data-diagram.png)
-->

## Requirements

- A Postgres database you want to explore (only Postgres is supported —
  introspection is done via `information_schema`).
- Docker, **or** Node.js 20+ for local dev without Docker.

## Run it

```bash
cp .env.example .env   # then edit DATABASE_URL
docker-compose up --build
```

Open http://localhost:4000.

If your Postgres is also running in Docker on the same machine, use
`host.docker.internal` instead of `localhost` in `DATABASE_URL`.

### Local dev (without Docker)

```bash
npm install
npm start                                  # API server on :4000

# in a second terminal
cd client && npm install && npm run dev    # Vite dev server on :5173, proxies /api -> :4000
```

There is no lint or test setup in this repo currently.

## How it works

- **Server** (`server/`) — a small Express API. `db.js` is the only place
  that touches Postgres; every query runs inside a `BEGIN TRANSACTION READ
  ONLY` with a 5s statement timeout. `routes/schema.js` introspects
  `information_schema` for tables/columns/foreign keys. `routes/data.js`
  handles row fetching, the custom-query endpoint, and one-hop linked-row
  lookups.
- **Client** (`client/`) — React + Vite, laid out with
  [React Flow](https://reactflow.dev/) and either
  [dagre](https://github.com/dagrejs/dagre) or
  [elkjs](https://github.com/kieler/elkjs) for auto-layout. No router — a
  simple three-mode state machine (`schema` → `pickRow` → `data`) in
  `App.jsx`.

```
server/           Express API (schema introspection, row queries, linked lookup)
client/           React + React Flow frontend (Vite)
Dockerfile        Multi-stage build: client build -> server runtime, single image
docker-compose.yml
```

## Security model

This tool is **read-only by construction, not by convention**:

- Every query, including user-typed custom queries, runs inside a
  `READ ONLY` Postgres transaction — nothing this tool does can mutate the
  target database.
- Table/column names from the client are whitelisted against
  `^[a-zA-Z_][a-zA-Z0-9_]*$` before being interpolated into SQL (they can't
  be parameterized like values can).
- The custom-query endpoint additionally restricts input to a single
  standalone `SELECT` statement (no semicolons, must start with `select`).

As defense in depth, **connect with a read-only Postgres role** rather than
a full-access one whenever possible.

## Current scope / known limitations

- **Postgres only.** Other databases aren't supported.
- **Linked-data traversal is one hop only** from the selected row (tables
  it references, and tables that reference it). Multi-hop traversal is a
  natural next step but isn't implemented — row-level FK graphs explode
  fast beyond one hop, so it needs a deliberate depth control.
- No authentication — this is a local/trusted-environment tool, not
  designed to be exposed publicly.

## Contributing

Issues and PRs are welcome. This is a small, single-purpose tool — please
keep additions in the spirit of "read-only exploration," and preserve all
three layers of the security model above if you touch query-building code.

## License

[MIT](LICENSE)
