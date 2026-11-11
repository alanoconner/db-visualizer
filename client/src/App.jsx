import React, { useEffect, useState } from "react";
import SchemaDiagram from "./components/SchemaDiagram.jsx";
import DataDiagram from "./components/DataDiagram.jsx";
import DataGrid from "./components/DataGrid.jsx";
import {
  connectDatabase,
  disconnectDatabase,
  fetchConnectionStatus,
  fetchSchema,
} from "./api.js";

export default function App() {
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState("checking");

  // mode: "schema" | "pickRow" | "data" | "neighbors"
  const [mode, setMode] = useState("schema");
  const [activeTable, setActiveTable] = useState(null);
  const [activeRow, setActiveRow] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreConnection() {
      try {
        const { connected } = await fetchConnectionStatus();
        if (cancelled) return;
        if (!connected) {
          setConnectionState("disconnected");
          return;
        }

        const nextSchema = await fetchSchema();
        if (!cancelled) {
          setSchema(nextSchema);
          setConnectionState("connected");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setConnectionState("disconnected");
        }
      }
    }

    restoreConnection();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConnect(databaseUrl) {
    setConnectionState("connecting");
    setError(null);
    try {
      await connectDatabase(databaseUrl);
      const nextSchema = await fetchSchema();
      setSchema(nextSchema);
      setConnectionState("connected");
    } catch (e) {
      setError(e.message);
      setConnectionState("disconnected");
    }
  }

  async function handleChangeDatabase() {
    setError(null);
    try {
      await disconnectDatabase();
      setSchema(null);
      setActiveTable(null);
      setActiveRow(null);
      setMode("schema");
      setConnectionState("disconnected");
    } catch (e) {
      setError(e.message);
    }
  }

  function handleSelectTable(tableName) {
    setActiveTable(tableName);
    setActiveRow(null);
    setMode("pickRow");
  }

  function handleDrillInto(tableName, row) {
    setActiveTable(tableName);
    setActiveRow(row);
    setMode("data");
  }

  function handleShowNeighbors(tableName) {
    setActiveTable(tableName);
    setMode("neighbors");
  }

  if (connectionState === "checking") {
    return <div style={{ color: "#aaa", padding: 20 }}>Loading schema…</div>;
  }
  if (connectionState !== "connected" || !schema) {
    return (
      <ConnectionScreen
        error={error}
        connecting={connectionState === "connecting"}
        onConnect={handleConnect}
      />
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#141414", color: "#eee" }}>
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #333",
          display: "flex",
          gap: 12,
          alignItems: "center",
          fontFamily: "sans-serif",
        }}
      >
        <button style={navBtn} onClick={() => setMode("schema")}>
          ← Whole DB
        </button>
        {activeTable && (
          <span style={{ color: "#888" }}>
            {mode === "pickRow" && `Select a row in "${activeTable}" to see linked data`}
            {mode === "data" && `Linked data for "${activeTable}"`}
            {mode === "neighbors" && `Linked tables for "${activeTable}"`}
          </span>
        )}
        <button
          style={{ ...navBtn, marginLeft: "auto" }}
          onClick={handleChangeDatabase}
        >
          Change database
        </button>
      </div>

      <div style={{ height: "calc(100% - 40px)" }}>
        {mode === "schema" && (
          <SchemaDiagram
            schema={schema}
            onSelectTable={handleSelectTable}
            onShowNeighbors={handleShowNeighbors}
          />
        )}

        {mode === "pickRow" && activeTable && (
          <div style={{ padding: 16, height: "100%", boxSizing: "border-box" }}>
            <DataGrid
              table={activeTable}
              pageSize={10}
              onRowClick={(row) => handleDrillInto(activeTable, row)}
            />
          </div>
        )}

        {mode === "data" && activeTable && activeRow && (
          <DataDiagram
            schema={schema}
            rootTable={activeTable}
            rootRow={activeRow}
            onDrillInto={handleDrillInto}
          />
        )}

        {mode === "neighbors" && activeTable && (
          <SchemaDiagram
            schema={schema}
            focusTable={activeTable}
            onShowNeighbors={handleShowNeighbors}
          />
        )}
      </div>
    </div>
  );
}

function ConnectionScreen({ error, connecting, onConnect }) {
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    if (!databaseUrl.trim() || connecting) return;
    onConnect(databaseUrl);
  }

  return (
    <div style={connectionPage}>
      <form style={connectionCard} onSubmit={handleSubmit}>
        <div style={logo}>DB</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>Connect a database</h1>
        <p style={{ color: "#999", margin: "0 0 24px", lineHeight: 1.5 }}>
          Enter a PostgreSQL connection URL to load its schema. It is not saved
          to disk and is kept only for the active server session.
        </p>

        <label
          htmlFor="database-url"
          style={{ display: "block", fontSize: 13, color: "#bbb", marginBottom: 8 }}
        >
          Database URL
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="database-url"
            type={showUrl ? "text" : "password"}
            value={databaseUrl}
            onChange={(event) => setDatabaseUrl(event.target.value)}
            placeholder="postgres://user:password@host:5432/database"
            autoComplete="off"
            autoFocus
            disabled={connecting}
            style={connectionInput}
          />
          <button
            type="button"
            style={secondaryBtn}
            onClick={() => setShowUrl((visible) => !visible)}
            aria-label={showUrl ? "Hide database URL" : "Show database URL"}
          >
            {showUrl ? "Hide" : "Show"}
          </button>
        </div>

        {error && <div style={connectionError}>{error}</div>}

        <button
          type="submit"
          disabled={connecting || !databaseUrl.trim()}
          style={{
            ...connectBtn,
            opacity: connecting || !databaseUrl.trim() ? 0.55 : 1,
            cursor: connecting || !databaseUrl.trim() ? "not-allowed" : "pointer",
          }}
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>

        <p style={{ color: "#777", fontSize: 12, margin: "16px 0 0", lineHeight: 1.5 }}>
          Use a read-only database role when possible. Add ?sslmode=require for
          managed databases that require SSL.
        </p>
      </form>
    </div>
  );
}

const navBtn = {
  background: "#333",
  color: "#eee",
  border: "1px solid #555",
  borderRadius: 4,
  padding: "4px 10px",
  cursor: "pointer",
};

const connectionPage = {
  width: "100vw",
  height: "100vh",
  background: "#141414",
  color: "#eee",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "sans-serif",
  padding: 20,
  boxSizing: "border-box",
};

const connectionCard = {
  width: "100%",
  maxWidth: 520,
  background: "#1e1e1e",
  border: "1px solid #333",
  borderRadius: 10,
  padding: 28,
  boxSizing: "border-box",
  boxShadow: "0 16px 48px rgba(0, 0, 0, 0.3)",
};

const logo = {
  width: 42,
  height: 42,
  borderRadius: 8,
  background: "#315f8c",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "monospace",
  fontWeight: 700,
  marginBottom: 18,
};

const connectionInput = {
  flex: 1,
  minWidth: 0,
  background: "#141414",
  color: "#eee",
  border: "1px solid #555",
  borderRadius: 5,
  padding: "11px 12px",
  fontFamily: "monospace",
  fontSize: 13,
  outline: "none",
};

const secondaryBtn = {
  ...navBtn,
  padding: "8px 12px",
};

const connectBtn = {
  width: "100%",
  marginTop: 18,
  padding: "11px 16px",
  color: "#fff",
  background: "#315f8c",
  border: "1px solid #477aa9",
  borderRadius: 5,
  fontSize: 14,
};

const connectionError = {
  color: "#f08a8a",
  background: "#321d1d",
  border: "1px solid #633",
  borderRadius: 5,
  padding: "9px 11px",
  marginTop: 12,
  fontSize: 13,
  lineHeight: 1.4,
};
