import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Example:");
  console.error(
    "  postgres://user:password@host:5432/dbname"
  );
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
