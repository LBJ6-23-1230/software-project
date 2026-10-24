import type { Express } from "express";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import {
  body,
  choice,
  fail,
  getItem,
  hasActiveClaims,
  id,
  itemSelect,
  requireAdmin,
  text,
} from "../common.ts";
import { schema, transaction } from "../db.ts";
import { validateItem } from "./items.ts";

const backupId =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const columns = {
  users: [
    "id",
    "name",
    "studentId",
    "passwordHash",
    "role",
    "verified",
    "phone",
    "createdAt",
  ],
  items: [
    "id",
    "type",
    "title",
    "category",
    "location",
    "campus",
    "occurredAt",
    "description",
    "imageUrl",
    "ownerId",
    "status",
    "reviewStatus",
    "reviewReason",
    "createdAt",
  ],
  claims: [
    "id",
    "itemId",
    "applicantId",
    "ownerId",
    "status",
    "proof",
    "createdAt",
    "updatedAt",
  ],
  messages: ["id", "claimId", "senderId", "content", "createdAt"],
  disputes: [
    "id",
    "claimId",
    "reporterId",
    "reason",
    "status",
    "resolution",
    "createdAt",
  ],
} as const;
type Table = keyof typeof columns;
type Snapshot = Record<Table, Record<string, SQLInputValue>[]>;
function insertSnapshot(db: DatabaseSync, snapshot: Snapshot) {
  for (const table of Object.keys(columns) as Table[]) {
    const names = columns[table];
    const insert = db.prepare(
      `INSERT INTO ${table} (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`,
    );
    for (const row of snapshot[table])
      insert.run(...names.map((name) => row[name]));
  }
}
function validatedSnapshot(path: string): Snapshot {
  let source: DatabaseSync | undefined, check: DatabaseSync | undefined;
  try {
    source = new DatabaseSync(path, { readOnly: true });
    if (
      source.prepare("PRAGMA integrity_check").get()?.integrity_check !==
        "ok" ||
      source.prepare("PRAGMA user_version").get()?.user_version !== 1 ||
      source.prepare("PRAGMA foreign_key_check").all().length
    )
      throw Error("Invalid database");
    const data = {} as Snapshot;
    for (const table of Object.keys(columns) as Table[]) {
      data[table] = source
        .prepare(`SELECT ${columns[table].join(",")} FROM ${table}`)
        .all() as Record<string, SQLInputValue>[];
    }
    for (const item of data.items) validateItem(item);
    for (const user of data.users) {
      text(user.name, "姓名", 2, 30);
      if (
        !/^[a-zA-Z0-9]{6,20}$/.test(String(user.studentId)) &&
        !(user.studentId === "admin" && user.role === "admin")
      )
        throw Error("Invalid identity");
      if (
        !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(String(user.passwordHash)) ||
        !/^(?:\d{11})?$/.test(String(user.phone))
      )
        throw Error("Invalid account");
    }
    for (const claim of data.claims) text(claim.proof, "认领证明", 5, 1000);
    for (const message of data.messages) text(message.content, "消息", 1, 1000);
    for (const dispute of data.disputes) {
      text(dispute.reason, "争议原因", 5, 1000);
      if (dispute.status === "resolved")
        text(dispute.resolution, "处理结果", 5, 2000);
    }
    check = new DatabaseSync(":memory:");
    check.exec("PRAGMA foreign_keys=ON");
    check.exec(schema);
    insertSnapshot(check, data);
    const inconsistent = check
      .prepare(
        `
      SELECT 1 FROM claims c JOIN items i ON c.itemId=i.id WHERE c.ownerId<>i.ownerId
        OR (c.status IN ('pending','approved','completed') AND i.type<>'found')
        OR (c.status IN ('pending','approved') AND (i.status<>'active' OR i.reviewStatus<>'approved'))
        OR (c.status='completed' AND i.status<>'claimed')
      UNION ALL SELECT 1 FROM items i WHERE i.status='claimed' AND (SELECT count(*) FROM claims c WHERE c.itemId=i.id AND c.status='completed')<>1
      UNION ALL SELECT 1 FROM messages m JOIN claims c ON m.claimId=c.id WHERE m.senderId NOT IN (c.ownerId,c.applicantId)
      UNION ALL SELECT 1 FROM disputes d JOIN claims c ON d.claimId=c.id WHERE d.reporterId NOT IN (c.ownerId,c.applicantId)
      LIMIT 1`,
      )
      .get();
    if (inconsistent || !data.users.some((user) => user.role === "admin"))
      throw Error("Inconsistent snapshot");
    return data;
  } catch {
    return fail(
      409,
      "INVALID_BACKUP",
      "备份损坏、版本不兼容或业务数据不一致，未更改当前数据",
    );
  } finally {
    source?.close();
    check?.close();
  }
}

export function registerAdminRoutes(
  app: Express,
  db: DatabaseSync,
  backupDir: string,
) {
  mkdirSync(backupDir, { recursive: true });
  const metadata = (backup: string) => {
    const stat = statSync(join(backupDir, `${backup}.sqlite`));
    return { id: backup, createdAt: stat.mtime.toISOString(), size: stat.size };
  };
  app.get("/api/admin/items", (req, res) => {
    requireAdmin(res);
    const review =
      req.query.reviewStatus === undefined
        ? undefined
        : choice(
            req.query.reviewStatus,
            ["approved", "pending", "rejected"],
            "审核状态",
          );
    res.json(
      db
        .prepare(
          `${itemSelect}${review ? " WHERE i.reviewStatus=?" : ""} ORDER BY i.createdAt DESC,i.id`,
        )
        .all(...(review ? [review] : [])),
    );
  });
  app.post("/api/admin/items/:id/review", (req, res) => {
    requireAdmin(res);
    const itemId = req.params.id as string;
    const input = body(req, ["action", "reason"]),
      action = choice(input.action, ["approve", "reject"], "审核操作");
    const reason =
      input.reason === undefined || input.reason === ""
        ? ""
        : text(input.reason, "审核原因", 2, 1000);
    transaction(db, () => {
      const item = getItem(db, itemId);
      if (item.status !== "active")
        fail(409, "ITEM_LOCKED", "已完成或已撤回的信息不能重新审核");
      if (action === "reject" && hasActiveClaims(db, itemId))
        fail(409, "ITEM_LOCKED", "正在认领的信息不能下架，请先协调认领双方");
      db.prepare(
        "UPDATE items SET reviewStatus=?,reviewReason=? WHERE id=?",
      ).run(action === "approve" ? "approved" : "rejected", reason, itemId);
    });
    res.json(getItem(db, itemId));
  });
  app.get("/api/admin/disputes", (_req, res) => {
    requireAdmin(res);
    res.json(
      db.prepare("SELECT * FROM disputes ORDER BY createdAt DESC,id").all(),
    );
  });
  app.post("/api/admin/disputes/:id/resolve", (req, res) => {
    requireAdmin(res);
    const resolution = text(
        body(req, ["resolution"]).resolution,
        "处理结果",
        5,
        2000,
      ),
      disputeId = req.params.id as string;
    const dispute = db
      .prepare("SELECT * FROM disputes WHERE id=?")
      .get(disputeId);
    if (!dispute) fail(404, "NOT_FOUND", "未找到此争议");
    if (dispute.status !== "open")
      fail(409, "INVALID_TRANSITION", "此争议已经处理");
    // A resolution records mediation; claim state still changes only through its participant state machine.
    db.prepare(
      "UPDATE disputes SET status='resolved',resolution=? WHERE id=?",
    ).run(resolution, disputeId);
    res.json(db.prepare("SELECT * FROM disputes WHERE id=?").get(disputeId));
  });
  app.get("/api/admin/backups", (_req, res) => {
    requireAdmin(res);
    const backups = readdirSync(backupDir)
      .filter(
        (name) => name.endsWith(".sqlite") && backupId.test(name.slice(0, -7)),
      )
      .map((name) => metadata(name.slice(0, -7)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(backups);
  });
  app.post("/api/admin/backups", (_req, res) => {
    requireAdmin(res);
    const snapshotId = id(),
      path = join(backupDir, `${snapshotId}.sqlite`);
    try {
      db.prepare("VACUUM INTO ?").run(path);
      validatedSnapshot(path);
    } catch (error) {
      if (existsSync(path)) unlinkSync(path);
      throw error;
    }
    res.status(201).json(metadata(snapshotId));
  });
  app.post("/api/admin/backups/:id/restore", (req, res) => {
    const admin = requireAdmin(res),
      snapshotId = req.params.id as string;
    if (body(req, ["confirm"]).confirm !== true)
      fail(400, "CONFIRM_REQUIRED", "恢复会覆盖当前业务数据，请明确确认");
    if (!backupId.test(snapshotId)) fail(404, "NOT_FOUND", "未找到此备份");
    const path = join(backupDir, `${snapshotId}.sqlite`);
    if (!existsSync(path)) fail(404, "NOT_FOUND", "未找到此备份");
    const snapshot = validatedSnapshot(path);
    if (
      !snapshot.users.some(
        (user) => user.id === admin.id && user.role === "admin",
      )
    )
      fail(409, "INVALID_BACKUP", "备份中缺少当前管理员，不能恢复");
    transaction(db, () => {
      const sessions = db.prepare("SELECT * FROM sessions").all();
      db.exec(
        "DELETE FROM disputes; DELETE FROM messages; DELETE FROM claims; DELETE FROM items; DELETE FROM sessions; DELETE FROM users;",
      );
      insertSnapshot(db, snapshot);
      const insert = db.prepare("INSERT INTO sessions VALUES (?,?,?)");
      for (const session of sessions)
        if (snapshot.users.some((user) => user.id === session.userId))
          insert.run(session.tokenHash, session.userId, session.expiresAt);
    });
    res.json({ ok: true });
  });
}
