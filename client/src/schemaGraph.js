// Tables directly connected to `tableName` via a foreign key, either
// direction. Used to highlight a table's neighborhood on hover.
export function getNeighborTables(tableName, foreignKeys) {
  const neighbors = new Set();
  for (const fk of foreignKeys) {
    if (fk.sourceTable === tableName) neighbors.add(fk.targetTable);
    if (fk.targetTable === tableName) neighbors.add(fk.sourceTable);
  }
  return neighbors;
}

// Names of columns on `tableName` that are the source side of some FK.
export function getFkColumnNames(tableName, foreignKeys) {
  return new Set(
    foreignKeys
      .filter((fk) => fk.sourceTable === tableName)
      .map((fk) => fk.sourceColumn)
  );
}

const AUDIT_COLUMNS = new Set(["created_at", "updated_at", "deleted_at"]);

// A table counts as a "hub"/junction table if it's mostly foreign keys with
// little or no data of its own (e.g. a many-to-many bridge table). These add
// a lot of edges to the whole-DB diagram without adding much information, so
// they default to hidden with a toggle to bring them back.
export function isHubTable(table, foreignKeys) {
  const fkColumns = getFkColumnNames(table.name, foreignKeys);
  const otherColumns = table.columns.filter(
    (c) => !c.isPrimaryKey && !fkColumns.has(c.name) && !AUDIT_COLUMNS.has(c.name)
  );
  return fkColumns.size >= 2 && otherColumns.length <= 1;
}
