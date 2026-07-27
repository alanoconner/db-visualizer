import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Example:");
  console.error(
    "  postgres://user:password@host:5432/dbname"
  );
  process.exit(1);
}

// pg re-parses sslmode out of the connection string and that parsed value
// wins over any explicit `ssl` option below, so we have to strip it here
// and set ssl ourselves. sslmode=require normally means "encrypt with full
// cert verification", which fails against the self-signed/managed certs
// most remote Postgres hosts present — since this tool only ever reads
// schema/rows, treat any non-disabled sslmode as "encrypt, don't verify".
const dbUrl = new URL(process.env.DATABASE_URL);
const sslMode = dbUrl.searchParams.get("sslmode");
dbUrl.searchParams.delete("sslmode");
const ssl = sslMode && sslMode !== "disable" ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({
  connectionString: dbUrl.toString(),
  ssl,
  // keep the pool small — this tool is for exploration, not app traffic
  max: 5,
});

// Runs a query inside a READ ONLY transaction so nothing this tool does
// (including user-typed custom queries) can mutate data.
export async function readOnlyQuery(sql, params = []) {
  const client = await pool.connect();
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
