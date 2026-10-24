import express from "express";
import type { ErrorRequestHandler } from "express";
import { dirname, join } from "node:path";
import { openDatabase } from "./db.ts";
import { ApiFailure, authMiddleware } from "./common.ts";
import { registerUserRoutes } from "./modules/users.ts";
import { registerItemRoutes } from "./modules/items.ts";
import { registerClaimRoutes } from "./modules/claims.ts";
import { registerAdminRoutes } from "./modules/admin.ts";

export function createApp(options: { dbPath: string; backupDir?: string }) {
  const db = openDatabase(options.dbPath);
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1500kb", strict: true }));
  app.use("/api", authMiddleware(db));
  registerUserRoutes(app, db);
  registerItemRoutes(app, db);
  registerClaimRoutes(app, db);
  registerAdminRoutes(
    app,
    db,
    options.backupDir ?? join(dirname(options.dbPath), "backups"),
  );
  app.use("/api", (_req, res) => {
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "接口不存在" } });
  });
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApiFailure) {
      res
        .status(error.status)
        .json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (
      error?.type === "entity.parse.failed" ||
      error?.type === "entity.too.large"
    ) {
      res
        .status(400)
        .json({
          error: { code: "VALIDATION", message: "请求内容无效或超过大小限制" },
        });
      return;
    }
    console.error(error);
    res
      .status(500)
      .json({ error: { code: "INTERNAL", message: "操作失败，请稍后重试" } });
  };
  app.use(handleError);
  return {
    app,
    close() {
      db.close();
    },
  };
}
