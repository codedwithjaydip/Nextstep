import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import situationRoutes from "./routes/situationRoutes.js";
import * as situationController from "./controllers/situationController.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "nextstep-server" });
});

app.use("/api/v1", situationRoutes);
// Also support the delete route without the version prefix, matching
// the DELETE /api/situations/{id} contract from the spec.
app.delete("/api/situations/:id", situationController.deleteSituation);

app.use((req, res) => {
  res.status(404).json({ error: "not_found", message: "Route not found." });
});

// Final safety net so a raw stack trace never reaches the client.
app.use((err, req, res, next) => {
  console.error("[app] unhandled error:", err);
  res
    .status(500)
    .json({ error: "unknown_error", message: "Something went wrong on our end." });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[app] NextStep server listening on port ${PORT}`);
  });
});
