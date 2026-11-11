import pg from "pg";

const { Pool } = pg;

let pool = null;

function createPool(databaseUrl) {
  let dbUrl;
  try {
    dbUrl = new URL(databaseUrl);
  } catch {
    throw new Error("Enter a valid PostgreSQL connection URL");
  }

  if (dbUrl.protocol !== "postgres:" && dbUrl.protocol !== "postgresql:") {
    throw new Error("The connection URL must start with postgres:// or postgresql://");
  }

  // pg re-parses sslmode out of the connection string and that parsed value
  // wins over any explicit `ssl` option below, so we have to strip it here
  // and set ssl ourselves. sslmode=require normally means "encrypt with full
  // cert verification", which fails against the self-signed/managed certs
  // most remote Postgres hosts present — since this tool only ever reads
  // schema/rows, treat any non-disabled sslmode as "encrypt, don't verify".
  const sslMode = dbUrl.searchParams.get("sslmode");
  dbUrl.searchParams.delete("sslmode");
  const ssl =
    sslMode && sslMode !== "disable"
      ? { rejectUnauthorized: false }
      : undefined;

  return new Pool({
    connectionString: dbUrl.toString(),
    ssl,
    // Keep the pool small — this tool is for exploration, not app traffic.
    max: 5,
    connectionTimeoutMillis: 5000,
  });
}

export function isDatabaseConfigured() {
  return pool !== null;
}

// Tests a new connection before making it active. The connection URL is kept
// only in the server-side pg pool; it is never sent back to the browser.
export async function configureDatabase(databaseUrl) {
  if (typeof databaseUrl !== "string" || !databaseUrl.trim()) {
    throw new Error("Database URL is required");
  }

  const nextPool = createPool(databaseUrl.trim());
  let client;

  try {
    client = await nextPool.connect();
    await client.query("BEGIN TRANSACTION READ ONLY");
    await client.query("SET LOCAL statement_timeout = 5000");
    await client.query("SELECT current_database()");
    await client.query("ROLLBACK");
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      client = null;
    }
    await nextPool.end().catch(() => {});
    throw err;
  } finally {
    client?.release();
  }

  const previousPool = pool;
  pool = nextPool;
  if (previousPool) {
    previousPool.end().catch((err) => {
      console.error("Failed to close previous database pool", err);
    });
  }
}

export async function disconnectDatabase() {
  const previousPool = pool;
  pool = null;
  if (previousPool) {
    await previousPool.end();
  }
}

// Runs a query inside a READ ONLY transaction so nothing this tool does
// (including user-typed custom queries) can mutate data.
export async function readOnlyQuery(sql, params = []) {
  const activePool = pool;
  if (!activePool) {
    const err = new Error("Connect to a database first");
    err.code = "DATABASE_NOT_CONFIGURED";
    throw err;
  }

  const client = await activePool.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    // Cap runaway queries so a bad custom SELECT can't hang the tool.
    await client.query("SET LOCAL statement_timeout = 5000");
    const result = await client.query(sql, params);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
