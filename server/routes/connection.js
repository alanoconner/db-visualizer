import { Router } from "express";
import {
  configureDatabase,
  disconnectDatabase,
  isDatabaseConfigured,
} from "../db.js";

export const connectionRouter = Router();

connectionRouter.get("/connection", (req, res) => {
  res.json({ connected: isDatabaseConfigured() });
});

connectionRouter.post("/connect", async (req, res) => {
  try {
    await configureDatabase(req.body.databaseUrl);
    res.json({ connected: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not connect to database" });
  }
});

connectionRouter.delete("/connection", async (req, res) => {
  try {
    await disconnectDatabase();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message || "Could not disconnect" });
  }
});
