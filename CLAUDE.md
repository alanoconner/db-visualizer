# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tool that points at a Postgres database and visualizes it:

1. **Whole-DB ER diagram** — every table, its columns, and FK relationships, as a draggable/zoomable graph (React Flow). Click a table to browse its rows.
2. **Linked-data diagram** — pick a row, and it draws a graph of that row plus every row in directly-linked tables (one hop out, both directions along foreign keys). Each linked table is paginated and has a "custom query" button to scope it to specific columns/rows.

**Postgres only** (introspection is done via `information_schema`). Linked-data traversal is currently one hop only from the selected row — multi-hop is a known future direction, deliberately not implemented (row-level FK graphs explode fast beyond one hop).

## Running it

```bash
cp .env.example .env   # then edit DATABASE_URL
docker-compose up --build
```

Opens at http://localhost:4000. If Postgres also runs in Docker on the same machine, use `host.docker.internal` instead of `localhost` in `DATABASE_URL`.

### Local dev (without Docker)

```bash
npm start                        # server, from repo root — serves API on :4000
cd client && npm install && npm run dev   # Vite dev server on :5173, proxies /api -> :4000
```

The server also serves `client/dist` as static files and falls back to `index.html` for any non-`/api` route (SPA routing) — that build only exists after `npm run build` in `client/`, so it's absent in local dev unless you build it.

There is no lint or test setup in this repo currently.

## Architecture

Two independent npm packages: root (`server/`, Express) and `client/` (React + Vite). No shared build tooling — the Dockerfile is the only place that wires them together (multi-stage: build client, copy `client/dist` into the server image).

### Server (`server/`)

- `db.js` — the only place that touches Postgres. Every query runs inside `readOnlyQuery()`, which wraps it in a `BEGIN TRANSACTION READ ONLY` + a 5s `statement_timeout`. This is the core safety invariant of the whole app: **nothing this tool does can mutate the target database**, including user-typed custom queries. Any new route that queries the DB must go through this function, not a raw `pool.query`.
- `routes/schema.js` — `GET /api/schema`. Introspects `information_schema` (columns, primary keys, foreign keys) for the `public` schema and shapes it into `{ tables: [{ name, columns }], foreignKeys: [...] }`. This shape is the contract the entire frontend is built around.
- `routes/data.js` — table row fetching, custom queries, and linked-row lookup. Two defense layers guard against SQL injection since table/column names can't be parameterized:
  - `quoteIdent()` — whitelists identifiers to `^[a-zA-Z_][a-zA-Z0-9_]*$` before interpolating them into SQL, used for every table/column name that comes from the client (URL params or request body).
  - `assertSelectOnly()` — for the custom-query endpoint, coarsely restricts input to a single standalone `SELECT` (rejects anything not starting with `select`, rejects embedded `;`). This is explicitly *not* a full SQL parser — the real backstop against mutation is the `READ ONLY` transaction in `db.js`. Keep both layers if you touch this code; neither is sufficient alone.
  - `POST /api/linked` takes a row's `{ table, column, value }` plus the full `foreignKeys` list (as returned by `/api/schema`) and, for each FK touching that table/column, queries the other side (outgoing = "references", incoming = "referencedBy"), capped at 50 rows per linked table.

### Client (`client/src/`)

`App.jsx` is a simple three-mode state machine, no router: `"schema"` (whole-DB diagram) → `"pickRow"` (row picker for a clicked table) → `"data"` (linked-data diagram for the picked row). `activeTable`/`activeRow` carry state between modes.

- `api.js` — thin fetch wrappers, one per server endpoint. Any new server route needs a matching function here.
- `layout.js` — `layoutGraph(nodes, edges)` runs dagre (left-to-right) over React Flow nodes/edges based on each node's declared `width`/`height`. Both diagram components estimate node height up front (e.g. `40 + columns.length * 22`) since dagre needs real dimensions *before* layout, not measured post-render.
- `components/SchemaDiagram.jsx` + `TableNode.jsx` — the whole-DB ER graph; clicking a table calls `onSelectTable` up to `App`.
- `components/DataDiagram.jsx` + `LinkedTableNode.jsx` — the linked-row graph. Fetches `/api/linked` using the row's primary key (falls back to the first column if no PK is found), builds a root node for the selected row plus one node per linked table/direction, and lays them out. Clicking a row in any linked table calls `onDrillInto`, which re-roots the whole diagram at that row.
- `components/DataGrid.jsx` — shared paginated table view used both standalone (row picker in `"pickRow"` mode) and embedded inside `LinkedTableNode`. Can be seeded with `initialRows` (e.g. from `/api/linked`, already fetched) or fetch its own first page when used standalone. Owns the custom-query textarea UI, which posts to `/api/table/:table/query`.

There's no CSS framework — styling is inline `style={}` objects throughout, dark theme hardcoded (`#141414` background, `#1e1e1e` panels, monospace for data-facing text). Match this style rather than introducing a CSS solution.

## Security model

Read-only by construction, not by convention — see `db.js` above. When extending routes or the custom-query feature, preserve all three layers: read-only transaction, identifier whitelisting, and single-SELECT enforcement. The README also recommends connecting with a read-only Postgres role as defense in depth; don't suggest removing that guidance.
