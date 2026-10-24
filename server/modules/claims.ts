import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  body,
  choice,
  claimSelect,
  fail,
  getClaim,
  getItem,
  id,
  now,
  participant,
  requireUser,
  text,
} from "../common.ts";
import { transaction } from "../db.ts";

export function registerClaimRoutes(app: Express, db: DatabaseSync) {
  app.get("/api/claims", (_req, res) => {
    const user = requireUser(res);
    res.json(
      db
        .prepare(
          `${claimSelect} WHERE c.ownerId=? OR c.applicantId=? ORDER BY c.createdAt DESC,c.id`,
        )
        .all(user.id, user.id),
    );
  });
  app.post("/api/claims", (req, res) => {
    const user = requireUser(res),
      input = body(req, ["itemId", "proof"]);
    const itemId = text(input.itemId, "物品标识", 1, 80),
      proof = text(input.proof, "认领证明", 5, 1000),
      claimId = id();
    transaction(db, () => {
      const item = getItem(db, itemId);
      if (
        item.type !== "found" ||
        item.status !== "active" ||
        item.reviewStatus !== "approved" ||
        item.ownerId === user.id
      )
        fail(
          409,
          "NOT_CLAIMABLE",
          "该物品当前不可认领，请选择他人的有效招领信息",
        );
      if (
        db
          .prepare(
            "SELECT id FROM claims WHERE itemId=? AND applicantId=? AND status IN ('pending','approved','completed')",
          )
          .get(itemId, user.id)
      )
        fail(409, "DUPLICATE_CLAIM", "你已提交过认领申请");
      const timestamp = now();
      db.prepare("INSERT INTO claims VALUES (?,?,?,?,?,?,?,?)").run(
        claimId,
        itemId,
        user.id,
        item.ownerId,
        "pending",
        proof,
        timestamp,
        timestamp,
      );
    });
    res.status(201).json(getClaim(db, claimId));
  });
  app.post("/api/claims/:id/action", (req, res) => {
    const user = requireUser(res),
      claimId = req.params.id as string;
    const input = body(req, ["action"]),
      action = choice(
        input.action,
        ["approve", "reject", "complete", "cancel"],
        "操作",
      );
    transaction(db, () => {
      const claim = participant(db, claimId, user),
        item = getItem(db, claim.itemId);
      if (
        (action === "approve" || action === "reject") &&
        claim.ownerId !== user.id
      )
        fail(403, "FORBIDDEN", "仅发布者可以核验认领");
      if (
        (action === "cancel" || action === "complete") &&
        claim.applicantId !== user.id
      )
        fail(403, "FORBIDDEN", "仅申请人可以撤销或确认领取");
      if (item.status !== "active" || item.reviewStatus !== "approved")
        fail(409, "INVALID_TRANSITION", "物品当前状态不允许此操作");
      let status: string;
      if (action === "complete") {
        if (claim.status !== "approved")
          fail(409, "INVALID_TRANSITION", "请在发布者同意后确认领取");
        status = "completed";
        db.prepare(
          "UPDATE claims SET status='rejected',updatedAt=? WHERE itemId=? AND id<>? AND status IN ('pending','approved')",
        ).run(now(), item.id, claimId);
        db.prepare("UPDATE items SET status='claimed' WHERE id=?").run(item.id);
      } else {
        if (claim.status !== "pending")
          fail(409, "INVALID_TRANSITION", "该申请已处理，不能重复操作");
        if (
          action === "approve" &&
          db
            .prepare(
              "SELECT id FROM claims WHERE itemId=? AND status IN ('approved','completed')",
            )
            .get(item.id)
        )
          fail(409, "ALREADY_APPROVED", "此物品已同意另一位同学领取");
        status =
          action === "approve"
            ? "approved"
            : action === "reject"
              ? "rejected"
              : "cancelled";
      }
      db.prepare("UPDATE claims SET status=?,updatedAt=? WHERE id=?").run(
        status,
        now(),
        claimId,
      );
    });
    res.json(getClaim(db, claimId));
  });
  app.get("/api/claims/:id/messages", (req, res) => {
    participant(db, req.params.id as string, requireUser(res));
    res.json(
      db
        .prepare("SELECT * FROM messages WHERE claimId=? ORDER BY createdAt,id")
        .all(req.params.id as string),
    );
  });
  app.post("/api/claims/:id/messages", (req, res) => {
    const user = requireUser(res),
      claimId = req.params.id as string;
    participant(db, claimId, user);
    const content = text(body(req, ["content"]).content, "消息", 1, 1000),
      messageId = id();
    db.prepare("INSERT INTO messages VALUES (?,?,?,?,?)").run(
      messageId,
      claimId,
      user.id,
      content,
      now(),
    );
    res
      .status(201)
      .json(db.prepare("SELECT * FROM messages WHERE id=?").get(messageId));
  });
  app.post("/api/disputes", (req, res) => {
    const user = requireUser(res),
      input = body(req, ["claimId", "reason"]);
    const claimId = text(input.claimId, "认领标识", 1, 80),
      reason = text(input.reason, "争议原因", 5, 1000);
    participant(db, claimId, user);
    if (
      db
        .prepare(
          "SELECT id FROM disputes WHERE claimId=? AND reporterId=? AND status='open'",
        )
        .get(claimId, user.id)
    )
      fail(409, "DUPLICATE_DISPUTE", "你已提交此申请的待处理争议");
    const disputeId = id();
    db.prepare("INSERT INTO disputes VALUES (?,?,?,?,?,?,?)").run(
      disputeId,
      claimId,
      user.id,
      reason,
      "open",
      "",
      now(),
    );
    res
      .status(201)
      .json(db.prepare("SELECT * FROM disputes WHERE id=?").get(disputeId));
  });
}
