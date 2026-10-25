import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { DatabaseSync } from "node:sqlite";
import { createApp } from "../app.ts";

async function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), "campus-api-"));
  const dbPath = join(dir, "test.sqlite");
  const instance = createApp({ dbPath, backupDir: join(dir, "backups") });
  const server = instance.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const call = async (
    path: string,
    options: {
      method?: string;
      body?: unknown;
      token?: string;
      raw?: string;
    } = {},
  ) => {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api${path}`,
      {
        method:
          options.method ??
          (options.body === undefined && options.raw === undefined
            ? "GET"
            : "POST"),
        headers: {
          "Content-Type": "application/json",
          ...(options.token
            ? { Authorization: `Bearer ${options.token}` }
            : {}),
        },
        body:
          options.raw ??
          (options.body === undefined
            ? undefined
            : JSON.stringify(options.body)),
      },
    );
    return { status: response.status, data: (await response.json()) as any };
  };
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    instance.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const login = async (studentId: string) => {
    const response = await call("/auth/login", {
      body: { studentId, password: "Campus123!" },
    });
    assert.equal(response.status, 200);
    return response.data;
  };
  return { call, login, dir, dbPath };
}
const draft = {
  type: "found",
  title: "南湖图书馆的蓝色格纹雨伞",
  category: "生活用品",
  location: "南湖图书馆二楼",
  campus: "南湖校区",
  occurredAt: "2026-10-23",
  description: "拾到一把蓝色折叠伞，请说明伞柄上的特征。",
  imageUrl: "/assets/umbrella.svg",
};

test("authentication rejects invalid credentials, protects profile, and revokes logout token", async (t) => {
  const { call, login } = await fixture(t);
  assert.equal((await call("/auth/me")).status, 401);
  assert.equal(
    (
      await call("/auth/login", {
        body: { studentId: "20260001", password: "wrong" },
      })
    ).status,
    401,
  );
  const user = await login("20260001");
  assert.equal(user.user.role, "user");
  assert.equal(user.user.password, undefined);
  assert.equal(
    (
      await call("/users/me", {
        method: "PATCH",
        token: user.token,
        body: { phone: "13800000000", verified: true },
      })
    ).data.verified,
    true,
  );
  assert.equal(
    (
      await call("/users/me", {
        method: "PATCH",
        token: user.token,
        body: { role: "admin" },
      })
    ).status,
    400,
  );
  assert.equal(
    (await call("/auth/logout", { body: {}, token: user.token })).status,
    200,
  );
  assert.equal((await call("/auth/me", { token: user.token })).status, 401);
});

test("registration validates fields and cannot select admin or duplicate an identity", async (t) => {
  const { call } = await fixture(t);
  assert.equal(
    (
      await call("/auth/register", {
        body: {
          name: "同学",
          studentId: "abc123",
          password: "Campus123!",
          role: "admin",
        },
      })
    ).status,
    400,
  );
  const account = {
    name: "新同学",
    studentId: "abc123",
    password: "Campus123!",
  };
  const registered = await call("/auth/register", { body: account });
  assert.equal(registered.status, 201);
  assert.equal(registered.data.user.role, "user");
  assert.equal((await call("/auth/register", { body: account })).status, 409);
  assert.equal(
    (await call("/auth/register", { body: { ...account, studentId: "x" } }))
      .status,
    400,
  );
});

test("malformed bodies, enums, dates, image URLs, pagination and phone are rejected", async (t) => {
  const { call, login } = await fixture(t);
  const { token } = await login("20260001");
  assert.equal((await call("/items", { token, raw: "{broken" })).status, 400);
  for (const change of [
    { type: "evil" },
    { category: "任意" },
    { campus: "任意" },
    { occurredAt: "2026-02-30" },
    { imageUrl: "javascript:alert(1)" },
    { imageUrl: "/assets/../db.sqlite" },
    { title: "" },
    { ownerId: "another" },
  ]) {
    assert.equal(
      (await call("/items", { token, body: { ...draft, ...change } })).status,
      400,
      JSON.stringify(change),
    );
  }
  for (const query of [
    "page=0",
    "pageSize=51",
    "page=abc",
    "type=oops",
    "mine=oops",
  ])
    assert.equal((await call(`/items?${query}`)).status, 400, query);
  assert.equal(
    (
      await call("/users/me", {
        method: "PATCH",
        token,
        body: { phone: "123" },
      })
    ).status,
    400,
  );
});

test("new campus choices are accepted for item creation", async (t) => {
  const { call, login } = await fixture(t);
  const { token } = await login("20260001");
  for (const campus of [
    "马房山校区（西院）",
    "马房山校区（东院）",
    "鉴湖校区",
    "军山校区",
  ]) {
    const response = await call("/items", {
      token,
      body: { ...draft, title: `${campus}招领物品`, campus },
    });
    assert.equal(response.status, 201, campus);
    assert.equal(response.data.campus, campus);
  }
});

test("new items are private until review; owners and admin see them and strangers cannot edit", async (t) => {
  const { call, login } = await fixture(t);
  const owner = await login("20260001"),
    stranger = await login("20260002"),
    admin = await login("admin");
  const created = await call("/items", { token: owner.token, body: draft });
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(created.data.reviewStatus, "pending");
  assert.equal((await call(`/items/${id}`)).status, 404);
  assert.equal(
    (await call(`/items/${id}`, { token: owner.token })).status,
    200,
  );
  assert.equal(
    (
      await call(`/items/${id}`, {
        method: "PATCH",
        token: stranger.token,
        body: draft,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(`/admin/items/${id}/review`, {
        token: owner.token,
        body: { action: "approve" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(`/admin/items/${id}/review`, {
        token: admin.token,
        body: { action: "approve" },
      })
    ).status,
    200,
  );
  const publicItem = await call(`/items/${id}`);
  assert.equal(publicItem.data.phone, undefined);
  assert.equal(publicItem.data.studentId, undefined);
  assert.equal(
    (await call(`/items?q=${encodeURIComponent("蓝色格纹雨伞")}&pageSize=1`))
      .data.total,
    1,
  );
  assert.equal(
    (
      await call(`/items/${id}`, {
        method: "PATCH",
        token: owner.token,
        body: { ...draft, title: "蓝色雨伞重新发布" },
      })
    ).data.reviewStatus,
    "pending",
  );
  assert.equal((await call(`/items/${id}`)).status, 404);
});

test("claim lifecycle protects participants, rejects duplicates, locks active claims and completes only once", async (t) => {
  const { call, login } = await fixture(t);
  const owner = await login("20260002"),
    applicant = await login("20260001"),
    admin = await login("admin");
  const third = (
    await call("/auth/register", {
      body: { name: "第三同学", studentId: "20260003", password: "Campus123!" },
    })
  ).data;
  const items = (await call("/items?type=found")).data.items;
  const item = items.find(
    (x: any) => x.ownerId === owner.user.id && x.status === "active",
  );
  assert.ok(item);
  const claim = await call("/claims", {
    token: applicant.token,
    body: { itemId: item.id, proof: "伞柄底部有一张白色贴纸" },
  });
  assert.equal(claim.status, 201);
  const rival = (
    await call("/claims", {
      token: third.token,
      body: { itemId: item.id, proof: "这是我在图书馆丢失的物品" },
    })
  ).data;
  assert.equal(
    (
      await call("/claims", {
        token: applicant.token,
        body: { itemId: item.id, proof: "重复提交相同申请" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call("/claims", {
        token: owner.token,
        body: { itemId: item.id, proof: "本人认领自己的物品" },
      })
    ).status,
    409,
  );
  assert.equal(
    (await call(`/items/${item.id}/withdraw`, { token: owner.token, body: {} }))
      .status,
    409,
  );
  assert.equal(
    (
      await call(`/items/${item.id}`, {
        method: "PATCH",
        token: owner.token,
        body: draft,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(`/admin/items/${item.id}/review`, {
        token: admin.token,
        body: { action: "reject", reason: "申请正在处理中" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(`/claims/${claim.data.id}/action`, {
        token: applicant.token,
        body: { action: "approve" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(`/claims/${claim.data.id}/action`, {
        token: owner.token,
        body: { action: "complete" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(`/claims/${claim.data.id}/action`, {
        token: applicant.token,
        body: { action: "complete" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(`/claims/${claim.data.id}/action`, {
        token: owner.token,
        body: { action: "approve" },
      })
    ).data.status,
    "approved",
  );
  assert.equal(
    (
      await call(`/claims/${rival.id}/action`, {
        token: owner.token,
        body: { action: "approve" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call(`/claims/${claim.data.id}/action`, {
        token: applicant.token,
        body: { action: "complete" },
      })
    ).data.status,
    "completed",
  );
  assert.equal((await call(`/items/${item.id}`)).data.status, "claimed");
  assert.equal(
    (await call("/claims", { token: third.token })).data.find(
      (x: any) => x.id === rival.id,
    ).status,
    "rejected",
  );
  assert.equal(
    (
      await call(`/claims/${claim.data.id}/action`, {
        token: applicant.token,
        body: { action: "complete" },
      })
    ).status,
    409,
  );
});

test("private messages and disputes are participant-only and admin resolution preserves claim terminal state", async (t) => {
  const { call, login } = await fixture(t);
  const owner = await login("20260002"),
    applicant = await login("20260001"),
    admin = await login("admin");
  const item = (await call("/items?type=found")).data.items.find(
    (x: any) => x.ownerId === owner.user.id && x.status === "active",
  );
  const claim = (
    await call("/claims", {
      token: applicant.token,
      body: { itemId: item.id, proof: "这件物品底部写有我的名字" },
    })
  ).data;
  const path = `/claims/${claim.id}/messages`;
  assert.equal(
    (
      await call(path, {
        token: applicant.token,
        body: { content: "您好，可以核对一下吗？" },
      })
    ).status,
    201,
  );
  assert.equal((await call(path, { token: owner.token })).data.length, 1);
  assert.equal((await call(path, { token: admin.token })).status, 403);
  assert.equal(
    (await call(path, { token: owner.token, body: { content: " " } })).status,
    400,
  );
  assert.equal(
    (await call("/claims", { token: admin.token })).data.some(
      (x: any) => x.id === claim.id,
    ),
    false,
  );
  assert.equal(
    (
      await call("/disputes", {
        token: admin.token,
        body: { claimId: claim.id, reason: "不是参与人发起的争议" },
      })
    ).status,
    403,
  );
  const dispute = await call("/disputes", {
    token: applicant.token,
    body: { claimId: claim.id, reason: "双方对物品特征描述存在分歧" },
  });
  assert.equal(dispute.status, 201);
  assert.equal(
    (await call("/admin/disputes", { token: owner.token })).status,
    403,
  );
  assert.equal(
    (
      await call(`/admin/disputes/${dispute.data.id}/resolve`, {
        token: admin.token,
        body: { resolution: "已联系双方重新核对，保留原认领状态。" },
      })
    ).data.status,
    "resolved",
  );
  assert.equal(
    (await call("/claims", { token: applicant.token })).data.find(
      (x: any) => x.id === claim.id,
    ).status,
    "pending",
  );
  const completedDispute = (
    await call("/disputes", {
      token: applicant.token,
      body: {
        claimId: "c-returned",
        reason: "对已经完成交接的记录提出补充说明",
      },
    })
  ).data;
  assert.equal(
    (
      await call(`/admin/disputes/${completedDispute.id}/resolve`, {
        token: admin.token,
        body: { resolution: "已核实交接完成，记录双方补充说明。" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("/claims", { token: applicant.token })).data.find(
      (x: any) => x.id === "c-returned",
    ).status,
    "completed",
  );
});

test("cancel and reject are constrained and withdrawn or lost items cannot be claimed", async (t) => {
  const { call, login } = await fixture(t);
  const owner = await login("20260002"),
    applicant = await login("20260001");
  const item = (await call("/items?type=found")).data.items.find(
    (x: any) => x.ownerId === owner.user.id && x.status === "active",
  );
  const claim = (
    await call("/claims", {
      token: applicant.token,
      body: { itemId: item.id, proof: "这件物品属于我本人" },
    })
  ).data;
  assert.equal(
    (
      await call(`/claims/${claim.id}/action`, {
        token: owner.token,
        body: { action: "cancel" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(`/claims/${claim.id}/action`, {
        token: applicant.token,
        body: { action: "cancel" },
      })
    ).data.status,
    "cancelled",
  );
  assert.equal(
    (await call(`/items/${item.id}/withdraw`, { token: owner.token, body: {} }))
      .data.status,
    "withdrawn",
  );
  assert.equal(
    (
      await call("/claims", {
        token: applicant.token,
        body: { itemId: item.id, proof: "撤回后再次尝试认领" },
      })
    ).status,
    409,
  );
  const lost = (await call("/items?type=lost")).data.items.find(
    (x: any) => x.ownerId !== applicant.user.id,
  );
  assert.equal(
    (
      await call("/claims", {
        token: applicant.token,
        body: { itemId: lost.id, proof: "尝试认领一条寻物信息" },
      })
    ).status,
    409,
  );
});

test("matching filters private and same-type items and returns explainable descending scores", async (t) => {
  const { call } = await fixture(t);
  const source = (await call("/items?type=lost")).data.items[0];
  const matches = await call(`/items/${source.id}/matches`);
  assert.equal(matches.status, 200);
  for (const match of matches.data) {
    assert.equal(match.item.type, "found");
    assert.equal(match.item.reviewStatus, "approved");
    assert.ok(match.score > 0);
    assert.ok(match.reasons.length > 0);
  }
  assert.ok(
    matches.data.every(
      (x: any, i: number) => i === 0 || matches.data[i - 1].score >= x.score,
    ),
  );
});

test("backup is admin-only, restores relational data atomically, and rejects traversal and corrupt snapshot", async (t) => {
  const { call, login, dir } = await fixture(t);
  const admin = await login("admin"),
    owner = await login("20260001");
  assert.equal(
    (await call("/admin/backups", { token: owner.token, body: {} })).status,
    403,
  );
  const original = (await call("/items?mine=true", { token: owner.token })).data
    .total;
  const backup = await call("/admin/backups", { token: admin.token, body: {} });
  assert.equal(backup.status, 201);
  assert.ok(backup.data.size > 0);
  assert.equal(
    (await call("/admin/backups", { token: admin.token })).data.length,
    1,
  );
  await call("/items", { token: owner.token, body: draft });
  const claim = (
    await call("/claims", {
      token: owner.token,
      body: { itemId: "i-umbrella", proof: "伞柄上贴着我本人的标记" },
    })
  ).data;
  await call(`/claims/${claim.id}/messages`, {
    token: owner.token,
    body: { content: "备份后新增的认领消息" },
  });
  await call("/disputes", {
    token: owner.token,
    body: { claimId: claim.id, reason: "备份后新增的争议处理记录" },
  });
  assert.equal(
    (
      await call(`/admin/backups/${backup.data.id}/restore`, {
        token: admin.token,
        body: { confirm: false },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(`/admin/backups/${backup.data.id}/restore`, {
        token: admin.token,
        body: { confirm: true },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("/items?mine=true", { token: owner.token })).data.total,
    original,
  );
  assert.equal(
    (await call("/claims", { token: owner.token })).data.some(
      (x: any) => x.id === claim.id,
    ),
    false,
  );
  assert.equal(
    (await call(`/claims/${claim.id}/messages`, { token: owner.token })).status,
    404,
  );
  assert.equal(
    (await call("/admin/disputes", { token: admin.token })).data.length,
    0,
  );
  assert.equal(
    (
      await call("/admin/backups/%2e%2e%2ftest.sqlite/restore", {
        token: admin.token,
        body: { confirm: true },
      })
    ).status,
    404,
  );
  writeFileSync(join(dir, "backups", `${backup.data.id}.sqlite`), "corrupt");
  assert.equal(
    (
      await call(`/admin/backups/${backup.data.id}/restore`, {
        token: admin.token,
        body: { confirm: true },
      })
    ).status,
    409,
  );
  assert.equal(
    (await call("/items?mine=true", { token: owner.token })).data.total,
    original,
  );
});

test("data survives application reopen", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "campus-persist-"));
  const dbPath = join(dir, "persist.sqlite");
  const first = createApp({ dbPath });
  const firstServer = first.app.listen(0, "127.0.0.1");
  await once(firstServer, "listening");
  const firstUrl = `http://127.0.0.1:${(firstServer.address() as { port: number }).port}/api`;
  const registration = await fetch(`${firstUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "持久化同学",
      studentId: "20268888",
      password: "Campus123!",
    }),
  });
  assert.equal(registration.status, 201);
  const auth = (await registration.json()) as any;
  const created = await fetch(`${firstUrl}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(draft),
  });
  assert.equal(created.status, 201);
  const item = (await created.json()) as any;
  await new Promise<void>((resolve) => firstServer.close(() => resolve()));
  first.close();
  const second = createApp({ dbPath });
  const server = second.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    second.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const response = await fetch(
    `http://127.0.0.1:${(server.address() as { port: number }).port}/api/stats`,
  );
  const stats = (await response.json()) as any;
  assert.ok(stats.total >= 8);
  assert.ok(stats.completed >= 1);
  const persisted = await fetch(
    `http://127.0.0.1:${(server.address() as { port: number }).port}/api/items/${item.id}`,
    { headers: { Authorization: `Bearer ${auth.token}` } },
  );
  assert.equal(persisted.status, 200);
  assert.equal(
    ((await persisted.json()) as any).title,
    "南湖图书馆的蓝色格纹雨伞",
  );
  const persistedDb = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const account = persistedDb
      .prepare("SELECT passwordHash FROM users WHERE studentId='20268888'")
      .get()!;
    assert.match(
      account.passwordHash as string,
      /^[a-f0-9]{32}:[a-f0-9]{128}$/,
    );
    assert.equal(
      persistedDb
        .prepare("SELECT tokenHash FROM sessions WHERE tokenHash=?")
        .get(auth.token),
      undefined,
    );
  } finally {
    persistedDb.close();
  }
});

test("concurrent approvals and completion produce exactly one returned item and completion", async (t) => {
  const { call, login } = await fixture(t);
  const owner = await login("20260002"),
    first = await login("20260001");
  const second = (
    await call("/auth/register", {
      body: { name: "另一同学", studentId: "20269999", password: "Campus123!" },
    })
  ).data;
  const item = (await call("/items?type=found")).data.items.find(
    (x: any) => x.ownerId === owner.user.id && x.status === "active",
  );
  const claims = await Promise.all(
    [first, second].map((user) =>
      call("/claims", {
        token: user.token,
        body: { itemId: item.id, proof: "这是我本人丢失的物品，有特征可核对" },
      }),
    ),
  );
  assert.deepEqual(
    claims.map((x) => x.status),
    [201, 201],
  );
  const approvals = await Promise.all(
    claims.map((claim) =>
      call(`/claims/${claim.data.id}/action`, {
        token: owner.token,
        body: { action: "approve" },
      }),
    ),
  );
  assert.deepEqual(approvals.map((x) => x.status).sort(), [200, 409]);
  const winnerIndex = approvals.findIndex((x) => x.status === 200),
    winner = [first, second][winnerIndex];
  const completed = await Promise.all(
    [1, 2].map(() =>
      call(`/claims/${claims[winnerIndex].data.id}/action`, {
        token: winner.token,
        body: { action: "complete" },
      }),
    ),
  );
  assert.deepEqual(completed.map((x) => x.status).sort(), [200, 409]);
  const records = (await call("/claims", { token: owner.token })).data.filter(
    (x: any) => x.itemId === item.id,
  );
  assert.deepEqual(records.map((x: any) => x.status).sort(), [
    "completed",
    "rejected",
  ]);
});

test("valid SQLite snapshots with inconsistent participant relationships cannot replace live data", async (t) => {
  const { call, login, dir } = await fixture(t);
  const admin = await login("admin");
  const backup = (
    await call("/admin/backups", { token: admin.token, body: {} })
  ).data;
  const snapshot = new DatabaseSync(
    join(dir, "backups", `${backup.id}.sqlite`),
  );
  snapshot
    .prepare("UPDATE messages SET senderId='u-admin' WHERE id='m-returned'")
    .run();
  snapshot.close();
  const response = await call(`/admin/backups/${backup.id}/restore`, {
    token: admin.token,
    body: { confirm: true },
  });
  assert.equal(response.status, 409);
  assert.equal(response.data.error.code, "INVALID_BACKUP");
  const user = await login("20260001");
  assert.equal(
    (await call("/claims/c-returned/messages", { token: user.token })).data[0]
      .senderId,
    "u-chen",
  );
});

test("a cancelled claim remains historical when its unlocked item is edited into a lost notice and backed up", async (t) => {
  const { call, login } = await fixture(t);
  const owner = await login("20260002"),
    applicant = await login("20260001"),
    admin = await login("admin");
  const item = (await call("/items?type=found")).data.items.find(
    (x: any) => x.ownerId === owner.user.id && x.status === "active",
  );
  const claim = (
    await call("/claims", {
      token: applicant.token,
      body: { itemId: item.id, proof: "这件物品有我本人的标记" },
    })
  ).data;
  await call(`/claims/${claim.id}/action`, {
    token: applicant.token,
    body: { action: "cancel" },
  });
  assert.equal(
    (
      await call(`/items/${item.id}`, {
        method: "PATCH",
        token: owner.token,
        body: { ...draft, type: "lost" },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("/admin/backups", { token: admin.token, body: {} })).status,
    201,
  );
});
