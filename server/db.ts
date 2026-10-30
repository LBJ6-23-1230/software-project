import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  const actual = scryptSync(password, salt, 64),
    expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const schema = `
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, studentId TEXT NOT NULL UNIQUE COLLATE NOCASE,
 passwordHash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','admin')),
 verified INTEGER NOT NULL CHECK(verified IN (0,1)), phone TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 tokenHash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expiresAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
 id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('lost','found')), title TEXT NOT NULL,
 category TEXT NOT NULL, location TEXT NOT NULL, campus TEXT NOT NULL, occurredAt TEXT NOT NULL,
 description TEXT NOT NULL, imageUrl TEXT NOT NULL, ownerId TEXT NOT NULL REFERENCES users(id),
 status TEXT NOT NULL CHECK(status IN ('active','claimed','withdrawn')),
 reviewStatus TEXT NOT NULL CHECK(reviewStatus IN ('approved','pending','rejected')),
 reviewReason TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS claims (
 id TEXT PRIMARY KEY, itemId TEXT NOT NULL REFERENCES items(id), applicantId TEXT NOT NULL REFERENCES users(id),
 ownerId TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL CHECK(status IN ('pending','approved','completed','rejected','cancelled')),
 proof TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, CHECK(applicantId <> ownerId)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_live_claim_per_applicant ON claims(itemId,applicantId) WHERE status IN ('pending','approved','completed');
CREATE UNIQUE INDEX IF NOT EXISTS one_approved_or_completed ON claims(itemId) WHERE status IN ('approved','completed');
CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY, claimId TEXT NOT NULL REFERENCES claims(id), senderId TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS disputes (
 id TEXT PRIMARY KEY, claimId TEXT NOT NULL REFERENCES claims(id), reporterId TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('open','resolved')), resolution TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_dispute ON disputes(claimId,reporterId) WHERE status='open';
CREATE INDEX IF NOT EXISTS item_search ON items(reviewStatus,status,type,createdAt);
PRAGMA user_version=1;
`;
export function transaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function openDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;",
  );
  db.exec(schema);
  if (!db.prepare("SELECT id FROM users LIMIT 1").get()) seed(db);
  return db;
}
function seed(db: DatabaseSync) {
  transaction(db, () => {
    const now = "2026-10-20T08:00:00.000Z";
    const user = db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?)");
    user.run(
      "u-lin",
      "林同学",
      "20260001",
      hashPassword("Campus123!"),
      "user",
      1,
      "",
      now,
    );
    user.run(
      "u-chen",
      "陈同学",
      "20260002",
      hashPassword("Campus123!"),
      "user",
      1,
      "",
      now,
    );
    user.run(
      "u-admin",
      "校园服务管理员",
      "admin",
      hashPassword("Campus123!"),
      "admin",
      1,
      "",
      now,
    );
    const records = [
      [
        "i-umbrella",
        "found",
        "南湖图书馆拾到一把蓝色雨伞",
        "生活用品",
        "南湖图书馆一楼自习区",
        "南湖校区",
        "一把深蓝色折叠伞，伞柄贴有一张小贴纸。已妥善保管，请认领时描述贴纸内容。",
        "umbrella",
        "u-chen",
        "active",
        "approved",
      ],
      [
        "i-card",
        "lost",
        "寻找遗落的校园卡套",
        "证件卡片",
        "鉴湖食堂至西院宿舍路上",
        "马房山校区",
        "浅绿色透明卡套，里面有校园卡和一张便利店积分卡。如有拾到，请通过站内联系。",
        "card",
        "u-lin",
        "active",
        "approved",
      ],
      [
        "i-headphones",
        "found",
        "博学广场拾到无线耳机",
        "数码产品",
        "博学广场长椅",
        "南湖校区",
        "白色无线耳机与充电盒，充电盒侧面有轻微划痕。请说明耳机型号和连接设备名称。",
        "headphones",
        "u-chen",
        "active",
        "approved",
      ],
      [
        "i-bottle",
        "found",
        "余家头操场的奶白色水杯",
        "生活用品",
        "余家头田径场看台",
        "余家头校区",
        "奶白色保温杯，杯盖挂着一条橙色挂绳。拾到后已交由本人保管，请核对杯底特征。",
        "bottle",
        "u-lin",
        "active",
        "approved",
      ],
      [
        "i-book",
        "lost",
        "求寻一本写满笔记的高等数学",
        "书籍文具",
        "新二教学楼 201 教室",
        "南湖校区",
        "蓝色封面的高等数学教材，书页间夹有手写错题纸，对我非常重要，谢谢大家。",
        "book",
        "u-chen",
        "active",
        "approved",
      ],
      [
        "i-keys",
        "found",
        "鉴湖教学楼门口拾到钥匙",
        "其他物品",
        "鉴湖教学楼东门",
        "马房山校区",
        "三把钥匙和一个黄色挂件。请描述挂件的图案，确认后可以约在教学楼门口交接。",
        "keys",
        "u-chen",
        "active",
        "approved",
      ],
      [
        "i-bag",
        "lost",
        "黑色帆布包落在校车上了",
        "衣物配饰",
        "南湖至余家头校车",
        "余家头校区",
        "黑色帆布单肩包，内有一本小说和折叠购物袋。可能放在后排靠窗的位置。",
        "bag",
        "u-lin",
        "active",
        "approved",
      ],
      [
        "i-watch",
        "found",
        "体育馆更衣区拾到运动手表",
        "数码产品",
        "南湖体育馆更衣区",
        "南湖校区",
        "黑色硅胶表带运动手表，仍有电。请提供表盘图案或其他可验证的信息。",
        "watch",
        "u-lin",
        "active",
        "approved",
      ],
      [
        "i-umbrella-lost",
        "lost",
        "蓝色折叠伞遗失在图书馆",
        "生活用品",
        "南湖图书馆二楼",
        "南湖校区",
        "昨晚自习后遗落蓝色折叠伞，伞柄有特别的贴纸，希望能找到它。",
        "umbrella-lost",
        "u-lin",
        "active",
        "approved",
      ],
      [
        "i-returned",
        "found",
        "已经归还的小熊钥匙扣",
        "其他物品",
        "西院快递站",
        "马房山校区",
        "一串带小熊挂件的钥匙，已通过特征核验并交还给失主。感谢大家的帮助。",
        "keys",
        "u-chen",
        "claimed",
        "approved",
      ],
      [
        "i-pending-book",
        "found",
        "东院教学楼拾到笔记本",
        "书籍文具",
        "东院教四楼",
        "马房山校区",
        "米色硬壳笔记本，首页写有课程表。希望失主可以通过站内认领。",
        "book",
        "u-lin",
        "active",
        "pending",
      ],
      [
        "i-pending-card",
        "lost",
        "寻找体育馆遗失的卡套",
        "证件卡片",
        "余家头体育馆",
        "余家头校区",
        "橙色织带卡套，可能落在体育馆附近，请拾到的同学站内联系。",
        "card",
        "u-chen",
        "active",
        "pending",
      ],
    ];
    const item = db.prepare(
      "INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    );
    records.forEach((r, index) => {
      const [
        id,
        type,
        title,
        category,
        location,
        campus,
        description,
        asset,
        ownerId,
        status,
        review,
      ] = r;
      item.run(
        id,
        type,
        title,
        category,
        location,
        campus,
        "2026-10-23",
        description,
        `/assets/${asset}.jpg`,
        ownerId,
        status,
        review,
        "",
        new Date(
          Date.parse("2026-10-24T04:00:00Z") - index * 3600000,
        ).toISOString(),
      );
    });
    db.prepare("INSERT INTO claims VALUES (?,?,?,?,?,?,?,?)").run(
      "c-returned",
      "i-returned",
      "u-lin",
      "u-chen",
      "completed",
      "小熊挂件背面有一个小小的星星图案，三把银色钥匙。",
      now,
      now,
    );
    db.prepare("INSERT INTO messages VALUES (?,?,?,?,?)").run(
      "m-returned",
      "c-returned",
      "u-chen",
      "已经核对完成，感谢你配合确认。",
      now,
    );
  });
}
