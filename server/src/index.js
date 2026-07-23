import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import metaRoutes from "./routes/meta.js";
import attributesRoutes from "./routes/attributes.js";
import positionsRoutes from "./routes/positions.js";
import profileRoutes from "./routes/profile.js";
import cvsRoutes from "./routes/cvs.js";
import dashboardRoutes from "./routes/dashboard.js";
import adminUsersRoutes from "./routes/adminUsers.js";
import usersRoutes from "./routes/users.js";

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const clientDistCandidates = [
  path.resolve(__dirname, "../../client/dist"),
  path.resolve(process.cwd(), "../client/dist"),
  path.resolve(process.cwd(), "client/dist"),
];
const clientDist = clientDistCandidates.find((dir) =>
  fs.existsSync(path.join(dir, "index.html"))
);

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    message: "TalentDesk API is running",
    time: new Date().toISOString(),
    clientDist: Boolean(clientDist),
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("DB health check failed:", error.message);
    res.status(503).json({
      ok: false,
      database: "disconnected",
      error: isProd ? undefined : error.message,
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/positions", positionsRoutes);
app.use("/api/attributes", attributesRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/cvs", cvsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/users", usersRoutes);

if (clientDist) {
  app.use(express.static(clientDist, { index: false, fallthrough: true }));
  app.get(/^(?!\/api)(?!.*\.\w+$).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  console.warn(
    "client/dist не найден. Проверенные пути:",
    clientDistCandidates.join(" | ")
  );
}

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  if (clientDist) {
    console.log(`Static files: ${clientDist}`);
  }
});
