import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import {
  CAMPUSES,
  CATEGORIES,
  type Item,
  type ItemInput,
} from "../../shared/types.ts";
import {
  body,
  choice,
  currentUser,
  fail,
  getItem,
  hasActiveClaims,
  id,
  itemSelect,
  now,
  pageNumber,
  queryText,
  requireUser,
  text,
  visibleItem,
} from "../common.ts";
import { transaction } from "../db.ts";

export function validateItem(
  input: Record<string, unknown>,
): Required<ItemInput> {
  const type = choice(input.type, ["lost", "found"], "信息类型");
  const title = text(input.title, "标题", 2, 80),
    category = choice(input.category, CATEGORIES, "物品类别");
  const location = text(input.location, "地点", 2, 80),
    campus = choice(input.campus, CAMPUSES, "校区");
  const occurredAt = text(input.occurredAt, "日期", 10, 30);
  const date = new Date(occurredAt);
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(
      occurredAt,
    ) ||
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== occurredAt.slice(0, 10)
  )
    fail(400, "VALIDATION", "请填写有效日期");
  const description = text(input.description, "描述", 5, 2000);
  let imageUrl =
    input.imageUrl === undefined || input.imageUrl === ""
      ? `/assets/${type === "found" ? "bag" : "keys"}.svg`
      : input.imageUrl;
  if (typeof imageUrl !== "string") fail(400, "VALIDATION", "图片格式无效");
  if (!/^\/assets\/[a-zA-Z0-9_-]+\.(svg|png|jpe?g|webp)$/.test(imageUrl)) {
    const match =
      /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        imageUrl,
      );
    if (!match || match[2].length % 4 !== 0)
      fail(400, "VALIDATION", "图片仅支持本地素材或 PNG、JPEG、WebP");
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 1024 * 1024 || buffer.length < 12)
      fail(400, "VALIDATION", "图片需小于 1MB");
    const valid =
      match[1] === "png"
        ? buffer
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : match[1] === "jpeg"
          ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255
          : buffer.toString("ascii", 0, 4) === "RIFF" &&
            buffer.toString("ascii", 8, 12) === "WEBP";
    if (!valid) fail(400, "VALIDATION", "图片内容与格式不符");
  }
  return {
    type,
    title,
    category,
    location,
    campus,
    occurredAt,
    description,
    imageUrl,
  };
}
const fields = [
  "type",
  "title",
  "category",
  "location",
  "campus",
  "occurredAt",
  "description",
  "imageUrl",
];
export function registerItemRoutes(app: Express, db: DatabaseSync) {
  app.get("/api/stats", (_req, res) => {
    const row = db
      .prepare(
        "SELECT count(*) AS total, sum(type='lost') AS lost, sum(type='found') AS found, sum(status='claimed') AS completed FROM items WHERE reviewStatus='approved' AND status<>'withdrawn'",
      )
      .get()!;
    const pending = db
      .prepare("SELECT count(*) AS n FROM items WHERE reviewStatus='pending'")
      .get()!;
    res.json({
      total: row.total,
      lost: row.lost ?? 0,
      found: row.found ?? 0,
      completed: row.completed ?? 0,
      pending: pending.n,
    });
  });
  app.get("/api/items", (req, res) => {
    const where: string[] = [],
      params: string[] = [];
    const mine = queryText(req.query.mine, "个人记录", 5);
    if (mine !== undefined && mine !== "true" && mine !== "false")
      fail(400, "VALIDATION", "个人记录参数无效");
    if (mine === "true") {
      where.push("i.ownerId=?");
      params.push(requireUser(res).id);
    } else where.push("i.reviewStatus='approved' AND i.status<>'withdrawn'");
    for (const [key, options] of [
      ["type", ["lost", "found"]],
      ["category", CATEGORIES],
      ["campus", CAMPUSES],
    ] as const) {
      if (req.query[key] !== undefined) {
        where.push(`i.${key}=?`);
        params.push(choice(req.query[key], options, key));
      }
    }
    const q = queryText(req.query.q, "搜索词");
    if (q) {
      where.push(
        "(instr(i.title,?)>0 OR instr(i.description,?)>0 OR instr(i.location,?)>0)",
      );
      params.push(q, q, q);
    }
    const page = pageNumber(req.query.page, 1, 1000000),
      pageSize = pageNumber(req.query.pageSize, 12, 50);
    const condition = where.join(" AND ");
    const total = db
      .prepare(`SELECT count(*) AS n FROM items i WHERE ${condition}`)
      .get(...params)!.n;
    const items = db
      .prepare(
        `${itemSelect} WHERE ${condition} ORDER BY i.createdAt DESC,i.id LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, (page - 1) * pageSize);
    res.json({ items, total, page, pageSize });
  });
  app.get("/api/items/:id", (req, res) => {
    res.json(visibleItem(db, req.params.id as string, currentUser(res)));
  });
  app.post("/api/items", (req, res) => {
    const user = requireUser(res),
      input = validateItem(body(req, fields)),
      itemId = id();
    db.prepare("INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
      itemId,
      input.type,
      input.title,
      input.category,
      input.location,
      input.campus,
      input.occurredAt,
      input.description,
      input.imageUrl,
      user.id,
      "active",
      "pending",
      "",
      now(),
    );
    res.status(201).json(getItem(db, itemId));
  });
  app.patch("/api/items/:id", (req, res) => {
    const user = requireUser(res),
      itemId = req.params.id as string;
    const item = getItem(db, itemId);
    if (item.ownerId !== user.id)
      fail(403, "FORBIDDEN", "只能修改本人发布的信息");
    const input = validateItem(body(req, fields));
    transaction(db, () => {
      if (item.status !== "active" || hasActiveClaims(db, itemId))
        fail(409, "ITEM_LOCKED", "已完成、已撤回或正在认领的信息不能编辑");
      db.prepare(
        "UPDATE items SET type=?,title=?,category=?,location=?,campus=?,occurredAt=?,description=?,imageUrl=?,reviewStatus='pending',reviewReason='' WHERE id=?",
      ).run(
        input.type,
        input.title,
        input.category,
        input.location,
        input.campus,
        input.occurredAt,
        input.description,
        input.imageUrl,
        itemId,
      );
    });
    res.json(getItem(db, itemId));
  });
  app.post("/api/items/:id/withdraw", (req, res) => {
    const user = requireUser(res),
      itemId = req.params.id as string,
      item = getItem(db, itemId);
    if (item.ownerId !== user.id)
      fail(403, "FORBIDDEN", "只能撤回本人发布的信息");
    transaction(db, () => {
      if (item.status !== "active" || hasActiveClaims(db, itemId))
        fail(409, "ITEM_LOCKED", "已完成、已撤回或正在认领的信息不能撤回");
      db.prepare("UPDATE items SET status='withdrawn' WHERE id=?").run(itemId);
    });
    res.json(getItem(db, itemId));
  });
  app.get("/api/items/:id/matches", (req, res) => {
    const source = visibleItem(db, req.params.id as string, currentUser(res));
    const candidates = db
      .prepare(
        `${itemSelect} WHERE i.type<>? AND i.status='active' AND i.reviewStatus='approved'`,
      )
      .all(source.type) as unknown as Item[];
    const matches = candidates
      .map((item) => {
        let score = 0;
        const reasons: string[] = [];
        if (item.category === source.category) {
          score += 45;
          reasons.push("物品类别相同");
        }
        if (item.campus === source.campus) {
          score += 20;
          reasons.push("同一校区");
        }
        const terms = [
          "雨伞",
          "卡套",
          "耳机",
          "钥匙",
          "手表",
          "水杯",
          "笔记本",
          "图书馆",
          "教学楼",
          "帆布包",
        ];
        const shared = terms.filter(
          (term) =>
            (source.title + source.description + source.location).includes(
              term,
            ) && (item.title + item.description + item.location).includes(term),
        );
        if (shared.length) {
          score += Math.min(25, shared.length * 10);
          reasons.push(`共同特征：${shared.join("、")}`);
        }
        const days =
          Math.abs(
            Date.parse(source.occurredAt) - Date.parse(item.occurredAt),
          ) / 86400000;
        if (days <= 3) {
          score += 10;
          reasons.push("发生时间接近");
        }
        return { item, score, reasons };
      })
      .filter((match) => match.score >= 30)
      .sort(
        (a, b) =>
          b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt),
      )
      .slice(0, 6);
    res.json(matches);
  });
}
