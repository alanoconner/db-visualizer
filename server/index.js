import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { schemaRouter } from "./routes/schema.js";
import { dataRouter } from "./routes/data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", schemaRouter);
app.use("/api", dataRouter);

// Serve the built React app (produced by `client` build step in the Dockerfile)
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`db-visualizer listening on http://localhost:${PORT}`);
});
