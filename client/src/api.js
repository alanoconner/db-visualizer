async function errorMessage(res, fallback) {
  const body = await res.json().catch(() => ({}));
  return body.error || fallback;
}

export async function fetchConnectionStatus() {
  const res = await fetch("/api/connection");
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to check connection"));
  return res.json();
}

export async function connectDatabase(databaseUrl) {
  const res = await fetch("/api/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ databaseUrl }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Could not connect to database"));
  return res.json();
}

export async function disconnectDatabase() {
  const res = await fetch("/api/connection", { method: "DELETE" });
  if (!res.ok) throw new Error(await errorMessage(res, "Could not disconnect"));
}

export async function fetchSchema() {
  const res = await fetch("/api/schema");
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load schema"));
  return res.json();
}

export async function fetchTableRows(table, limit = 25, offset = 0) {
  const res = await fetch(
    `/api/table/${encodeURIComponent(table)}/rows?limit=${limit}&offset=${offset}`
  );
  if (!res.ok) throw new Error((await res.json()).error || "Query failed");
  return res.json();
}

export async function runCustomQuery(table, sql) {
  const res = await fetch(`/api/table/${encodeURIComponent(table)}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Query failed");
  return res.json();
}

export async function fetchLinked(table, column, value, foreignKeys) {
  const res = await fetch("/api/linked", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, column, value, foreignKeys }),
  });
  if (!res.ok) throw new Error((await res.json()).error || "Query failed");
  return res.json();
}
