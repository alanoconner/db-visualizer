export async function fetchSchema() {
  const res = await fetch("/api/schema");
  if (!res.ok) throw new Error("Failed to load schema");
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
