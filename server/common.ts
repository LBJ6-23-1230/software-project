import type { Request, RequestHandler, Response } from "express";
import type { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import type { User, Item, Claim } from "../shared/types.ts";
export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function fail(status: number, code: string, message: string): never {
  throw new ApiFailure(status, code, message);
}
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function body(req: Request, allowed: string[]) {
  const value = req.body;
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(400, "VALIDATION", "请提交有效的 JSON 对象");
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) fail(400, "VALIDATION", `不支持字段：${key}`);
  return value as Record<string, unknown>;
}
export function text(value: unknown, label: string, min: number, max: number) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    fail(400, "VALIDATION", `${label}需为 ${min}–${max} 字`);
  return value.trim();
}
export function choice<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T))
    fail(400, "VALIDATION", `${label}无效`);
  return value as T;
}
export function queryText(value: unknown, label: string, max = 100) {
  return value === undefined ? undefined : text(value, label, 1, max);
}
export function pageNumber(value: unknown, defaultValue: number, max: number) {
  if (value === undefined) return defaultValue;
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value) ||
    Number(value) > max
  )
    fail(400, "VALIDATION", "分页参数无效");
  return Number(value);
}
export function publicUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    studentId: row.studentId,
    role: row.role,
    verified: Boolean(row.verified),
    phone: row.phone,
    createdAt: row.createdAt,
  };
}
export const currentUser = (res: Response): User | undefined => res.locals.user;
export function requireUser(res: Response): User {
  const user = currentUser(res);
  if (!user) fail(401, "UNAUTHENTICATED", "请先登录");
  return user;
}
export function requireAdmin(res: Response): User {
  const user = requireUser(res);
  if (user.role !== "admin") fail(403, "FORBIDDEN", "仅管理员可操作");
  return user;
}
export function authMiddleware(db: DatabaseSync): RequestHandler {
  return (req, res, next) => {
    const authorization = req.headers.authorization;
    if (authorization) {
      const match = /^Bearer ([a-f0-9]{64})$/.exec(authorization);
      if (!match)
        return next(
          new ApiFailure(401, "UNAUTHENTICATED", "登录状态无效，请重新登录"),
        );
      const row = db
        .prepare(
          "SELECT u.* FROM sessions s JOIN users u ON u.id=s.userId WHERE s.tokenHash=? AND s.expiresAt>?",
        )
        .get(tokenHash(match[1]), now());
      if (!row)
        return next(
          new ApiFailure(401, "UNAUTHENTICATED", "登录已失效，请重新登录"),
        );
      res.locals.user = publicUser(row);
    }
    next();
  };
}
export const itemSelect =
  "SELECT i.id,i.type,i.title,i.category,i.location,i.campus,i.occurredAt,i.description,i.imageUrl,i.ownerId,u.name AS ownerName,i.status,i.reviewStatus,i.createdAt FROM items i JOIN users u ON u.id=i.ownerId";
export function getItem(db: DatabaseSync, itemId: string): Item {
  const item = db
    .prepare(`${itemSelect} WHERE i.id=?`)
    .get(itemId) as unknown as Item | undefined;
  if (!item) fail(404, "NOT_FOUND", "未找到这条信息");
  return item;
}
export function visibleItem(db: DatabaseSync, itemId: string, user?: User) {
  const item = getItem(db, itemId);
  if (
    user?.role !== "admin" &&
    user?.id !== item.ownerId &&
    (item.reviewStatus !== "approved" || item.status === "withdrawn")
  )
    fail(404, "NOT_FOUND", "未找到这条信息");
  return item;
}
export function hasActiveClaims(db: DatabaseSync, itemId: string) {
  return Boolean(
    db
      .prepare(
        "SELECT id FROM claims WHERE itemId=? AND status IN ('pending','approved') LIMIT 1",
      )
      .get(itemId),
  );
}
export const claimSelect =
  "SELECT c.id,c.itemId,i.title AS itemTitle,c.applicantId,c.ownerId,c.status,c.proof,c.createdAt,c.updatedAt FROM claims c JOIN items i ON i.id=c.itemId";
export function getClaim(db: DatabaseSync, claimId: string): Claim {
  const claim = db
    .prepare(`${claimSelect} WHERE c.id=?`)
    .get(claimId) as unknown as Claim | undefined;
  if (!claim) fail(404, "NOT_FOUND", "未找到认领申请");
  return claim;
}
export function participant(db: DatabaseSync, claimId: string, user: User) {
  const claim = getClaim(db, claimId);
  if (claim.ownerId !== user.id && claim.applicantId !== user.id)
    fail(403, "FORBIDDEN", "仅认领双方可以查看或操作");
  return claim;
}
