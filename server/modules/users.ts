import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import {
  body,
  fail,
  id,
  now,
  publicUser,
  requireUser,
  text,
  tokenHash,
} from "../common.ts";
import { hashPassword, transaction, verifyPassword } from "../db.ts";

export function registerUserRoutes(app: Express, db: DatabaseSync) {
  function session(userId: string) {
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      tokenHash(token),
      userId,
      new Date(Date.now() + 7 * 86400000).toISOString(),
    );
    return {
      token,
      user: publicUser(
        db.prepare("SELECT * FROM users WHERE id=?").get(userId),
      ),
    };
  }
  app.post("/api/auth/register", (req, res) => {
    const input = body(req, ["name", "studentId", "password"]);
    const name = text(input.name, "姓名", 2, 30),
      studentId = text(input.studentId, "学号", 6, 20);
    if (!/^[a-zA-Z0-9]{6,20}$/.test(studentId))
      fail(400, "VALIDATION", "学号需为 6–20 位字母或数字");
    const password = text(input.password, "密码", 8, 128);
    if (db.prepare("SELECT id FROM users WHERE studentId=?").get(studentId))
      fail(409, "DUPLICATE_ACCOUNT", "这个学号已注册");
    const userId = id();
    const result = transaction(db, () => {
      db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?)").run(
        userId,
        name,
        studentId,
        hashPassword(password),
        "user",
        0,
        "",
        now(),
      );
      return session(userId);
    });
    res.status(201).json(result);
  });
  app.post("/api/auth/login", (req, res) => {
    const input = body(req, ["studentId", "password"]);
    const studentId = text(input.studentId, "学号", 1, 20),
      password = text(input.password, "密码", 1, 128);
    const user = db
      .prepare("SELECT * FROM users WHERE studentId=?")
      .get(studentId);
    if (!user || !verifyPassword(password, user.passwordHash as string))
      fail(401, "INVALID_CREDENTIALS", "学号或密码不正确");
    res.json(session(user.id as string));
  });
  app.get("/api/auth/me", (_req, res) => {
    res.json(requireUser(res));
  });
  app.post("/api/auth/logout", (req, res) => {
    requireUser(res);
    db.prepare("DELETE FROM sessions WHERE tokenHash=?").run(
      tokenHash(req.headers.authorization!.slice(7)),
    );
    res.json({ ok: true });
  });
  app.patch("/api/users/me", (req, res) => {
    const user = requireUser(res),
      input = body(req, ["name", "phone", "verified"]);
    if (!Object.keys(input).length)
      fail(400, "VALIDATION", "请填写需要更新的资料");
    const name =
      input.name === undefined ? user.name : text(input.name, "姓名", 2, 30);
    let phone = user.phone;
    if (input.phone !== undefined) {
      if (typeof input.phone !== "string" || !/^(?:\d{11})?$/.test(input.phone))
        fail(400, "VALIDATION", "手机号应为空或 11 位数字");
      phone = input.phone;
    }
    if (input.verified !== undefined && typeof input.verified !== "boolean")
      fail(400, "VALIDATION", "演示绑定状态无效");
    db.prepare("UPDATE users SET name=?,phone=?,verified=? WHERE id=?").run(
      name,
      phone,
      Number(input.verified ?? user.verified),
      user.id,
    );
    res.json(
      publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(user.id)),
    );
  });
}
