import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Example:");
  console.error(
    "  postgres://user:password@host:5432/dbname"
  );
  process.exit(1);
}

// pg only enables SSL for sslmode values it recognizes as requiring full
// certificate verification, which fails against the self-signed/managed
// certs most remote Postgres hosts present. Since this tool only ever reads
// schema/rows, treat any non-disabled sslmode as "encrypt, don't verify".
const sslMode = new URL(process.env.DATABASE_URL).searchParams.get("sslmode");
const ssl = sslMode && sslMode !== "disable" ? { rejectUnauthorized: false } : undefined;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
