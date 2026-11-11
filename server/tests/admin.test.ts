import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import { ApiFailure } from "../common.ts";
import { hashPassword, openDatabase } from "../db.ts";
import { registerAdminRoutes } from "../modules/admin.ts";

// Focused route-level tests: no Express server or real campus data is needed.
// Full HTTP integration is still covered separately in api.test.ts.
function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), "campus-gbl-"));
  const backupDir = join(dir, "backups");
  const db = openDatabase(join(dir, "test.sqlite"));
  const routes = new Map<string, (req: any, res: any) => void>();
  const app = {
    get: (path: string, handler: (req: any, res: any) => void) => {
      routes.set(`GET ${path}`, handler);
    },
    post: (path: string, handler: (req: any, res: any) => void) => {
      routes.set(`POST ${path}`, handler);
    },
  } as unknown as Express;
  registerAdminRoutes(app, db, backupDir);
  const admin = { id: "u-admin", role: "admin" };
  const student = { id: "u-lin", role: "user" };
  const call = (
    method: "GET" | "POST",
    path: string,
    options: { user?: typeof admin; body?: unknown; query?: Record<string, unknown> } = {},
  ) => {
    const matches = [...routes.entries()].find(([key]) => {
      const route = key.slice(key.indexOf(" ") + 1);
      return key.startsWith(`${method} `) &&
        new RegExp(`^${route.replace(/:[^/]+/g, "[^/]+")}$`).test(`/api${path}`);
    });
    assert.ok(matches, `Missing route ${method} ${path}`);
    const [key, handler] = matches;
    const route = key.slice(key.indexOf(" ") + 1);
    const names = [...route.matchAll(/:([^/]+)/g)].map((m) => m[1]);
    const groups = new RegExp(`^${route.replace(/:[^/]+/g, "([^/]+)")}$`).exec(`/api${path}`);
    assert.ok(groups);
    const params = Object.fromEntries(names.map((name, i) => [name, groups[i + 1]]));
    const req = { params, body: options.body, query: options.query ?? {} };
    const response: { status: number; data: any } = { status: 200, data: undefined };
    const res = {
      locals: { user: options.user },
      status(code: number) { response.status = code; return this; },
      json(value: any) { response.data = value; return this; },
    };
    try {
      handler(req, res);
    } catch (error) {
      if (!(error instanceof ApiFailure)) throw error;
      response.status = error.status;
      response.data = { error: { code: error.code, message: error.message } };
    }
    return response;
  };
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { call, db, admin, student, backupDir };
}

test("F10: administrator-only review and private moderation reason; lifecycle is unchanged", (t) => {
  const { call, db, admin, student } = fixture(t);
  const path = "/admin/items/i-pending-book/review";
  for (const user of [undefined, student]) {
    assert.equal(call("GET", "/admin/items", { user }).status, user ? 403 : 401);
    assert.equal(call("POST", path, { user, body: { action: "approve" } }).status, user ? 403 : 401);
  }
  const reject = call("POST", path, {
    user: admin, body: { action: "reject", reason: "内容尚未核实，需要补充拾获地点" },
  });
  assert.equal(reject.status, 200);
  assert.equal(reject.data.reviewStatus, "rejected");
  assert.equal(reject.data.reviewReason, "内容尚未核实，需要补充拾获地点");
  assert.equal(reject.data.status, "active");
  const rejected = call("GET", "/admin/items", { user: admin, query: { reviewStatus: "rejected" } });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.find((i: any) => i.id === "i-pending-book").reviewReason, reject.data.reviewReason);
  assert.equal(db.prepare("SELECT status FROM items WHERE id='i-pending-book'").get()?.status, "active");
  const reapprove = call("POST", path, { user: admin, body: { action: "approve" } });
  assert.equal(reapprove.status, 200);
  assert.equal(reapprove.data.reviewStatus, "approved");
  assert.equal(reapprove.data.reviewReason, "");
  assert.equal(call("POST", path, { user: student, body: { action: "reject", reason: "尝试越权下架" } }).status, 403);
});

test("F10: active claim prevents arbitrary administrative takedown", (t) => {
  const { call, db, admin } = fixture(t);
  db.prepare("INSERT INTO claims VALUES (?,?,?,?,?,?,?,?)").run(
    "c-gbl-test", "i-umbrella", "u-lin", "u-chen", "pending",
    "我能描述伞柄上贴纸的图案", "2026-10-24", "2026-10-24",
  );
  const result = call("POST", "/admin/items/i-umbrella/review", {
    user: admin, body: { action: "reject", reason: "不能绕过正在进行的认领" },
  });
  assert.equal(result.status, 409);
  assert.equal(db.prepare("SELECT reviewStatus FROM items WHERE id='i-umbrella'").get()?.reviewStatus, "approved");
});

test("F11: dispute is resolved exactly once without rewriting completed claims", (t) => {
  const { call, db, admin, student } = fixture(t);
  db.prepare("INSERT INTO disputes VALUES (?,?,?,?,?,?,?)").run(
    "d-gbl-test", "c-returned", "u-lin", "对已归还物品的记录提出异议", "open", "", "2026-10-24",
  );
  const path = "/admin/disputes/d-gbl-test/resolve";
  assert.equal(call("GET", "/admin/disputes", { user: student }).status, 403);
  assert.equal(call("POST", path, { user: student, body: { resolution: "不能越权处理争议" } }).status, 403);
  assert.equal(call("POST", path, { user: admin, body: { resolution: "短" } }).status, 400);
  const completed = call("POST", path, { user: admin, body: { resolution: "已核实双方说明，维持既有交接结论" } });
  assert.equal(completed.status, 200);
  assert.equal(completed.data.status, "resolved");
  assert.equal(completed.data.resolution, "已核实双方说明，维持既有交接结论");
  assert.equal(call("POST", path, { user: admin, body: { resolution: "试图修改既有结论" } }).status, 409);
  assert.equal(db.prepare("SELECT status FROM claims WHERE id='c-returned'").get()?.status, "completed");
});

test("F12: restore needs confirmation, restores business data and revokes changed credentials", (t) => {
  const { call, db, admin, student } = fixture(t);
  assert.equal(call("GET", "/admin/backups").status, 401);
  assert.equal(call("POST", "/admin/backups", { user: student }).status, 403);
  db.prepare("INSERT INTO sessions VALUES (?,?,?)").run("s-admin", "u-admin", "2099-01-01");
  db.prepare("INSERT INTO sessions VALUES (?,?,?)").run("s-student", "u-lin", "2099-01-01");
  const backup = call("POST", "/admin/backups", { user: admin });
  assert.equal(backup.status, 201);
  const restorePath = `/admin/backups/${backup.data.id}/restore`;
  assert.equal(call("POST", restorePath, { user: student, body: { confirm: true } }).status, 403);
  assert.equal(call("POST", restorePath, { user: admin, body: { confirm: false } }).status, 400);
  db.prepare("UPDATE users SET passwordHash=? WHERE id='u-lin'").run(hashPassword("different-password"));
  db.prepare("UPDATE items SET title='备份之后的修改' WHERE id='i-umbrella'").run();
  assert.equal(call("POST", restorePath, { user: admin, body: { confirm: true } }).status, 200);
  assert.notEqual(db.prepare("SELECT title FROM items WHERE id='i-umbrella'").get()?.title, "备份之后的修改");
  assert.equal(db.prepare("SELECT count(*) AS n FROM sessions WHERE userId='u-lin'").get()?.n, 0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM sessions WHERE userId='u-admin'").get()?.n, 1);
});

test("F12: inconsistent backup cannot partially replace the live database", (t) => {
  const { call, db, admin, backupDir } = fixture(t);
  const backup = call("POST", "/admin/backups", { user: admin });
  assert.equal(backup.status, 201);
  const backupDb = new DatabaseSync(join(backupDir, `${backup.data.id}.sqlite`));
  backupDb.prepare("UPDATE messages SET senderId='u-admin' WHERE id='m-returned'").run();
  backupDb.close();
  const before = db.prepare("SELECT content FROM messages WHERE id='m-returned'").get()?.content;
  db.prepare("UPDATE items SET title='恢复前正在编辑的标题' WHERE id='i-book'").run();
  const result = call("POST", `/admin/backups/${backup.data.id}/restore`, {
    user: admin, body: { confirm: true },
  });
  assert.equal(result.status, 409);
  assert.equal(result.data.error.code, "INVALID_BACKUP");
  assert.equal(db.prepare("SELECT title FROM items WHERE id='i-book'").get()?.title, "恢复前正在编辑的标题");
  assert.equal(db.prepare("SELECT content FROM messages WHERE id='m-returned'").get()?.content, before);
});
