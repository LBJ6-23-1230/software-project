import express from "express";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { createApp } from "./app.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const { app, close } = createApp({
  dbPath: resolve(root, "data", "campus.sqlite"),
});
const dist = join(root, "dist");
if (existsSync(join(dist, "index.html"))) {
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(join(dist, "index.html"));
  });
}
const server = app.listen(4318, "127.0.0.1", () => {
  console.log("拾光校园服务已启动：http://127.0.0.1:4318");
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => {
    close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
