// 浏览器级按钮走查：用系统 Edge 驱动真实页面，逐个点击关键按钮并记录结果与截图。
// 运行：node scripts/browser-check.mjs（dev server 需已在 5173 端口运行）
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:5173";
const SHOTS = fileURLToPath(
  new URL("../reports/browser-evidence/", import.meta.url),
);
mkdirSync(SHOTS, { recursive: true });

const results = [];
const errors = [];
function record(name, ok, note = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${note ? ` — ${note}` : ""}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${note ? ` — ${note}` : ""}`);
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

async function step(name, fn) {
  try {
    await fn();
    record(name, true);
  } catch (e) {
    record(name, false, String(e.message || e).slice(0, 200));
    await page.screenshot({ path: `${SHOTS}fail-${name.replace(/[^\w一-龥]+/g, "-")}.png` }).catch(() => {});
  }
}
async function login(studentId, label) {
  await page.locator('.topbar-actions button:has-text("登录 / 注册")').click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("校园账号").fill(studentId);
  await dialog.getByLabel("密码").fill("Campus123!");
  await dialog.locator('button:has-text("登录")').click();
  await page.locator(".account-button", { hasText: label }).waitFor({ timeout: 8000 });
}
async function logout() {
  await page.locator('button[aria-label="退出登录"]').click();
  await page.locator('.topbar-actions button:has-text("登录 / 注册")').waitFor({ timeout: 8000 });
}
async function goNav(name) {
  await page.locator(`.nav-item:has-text("${name}")`).click();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. 首页加载与统计条
await step("首页加载并显示统计条", async () => {
  await page.goto(BASE);
  await page.locator(".stat-strip").waitFor({ timeout: 10000 });
  await page.locator(".item-card").first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}01-home.png` });
});

// 2. 搜索按钮
await step("搜索按钮：按关键词过滤", async () => {
  await page.getByLabel("搜索物品名称、描述或地点").fill("雨伞");
  await page.locator('.search-bar button:has-text("搜索")').click();
  await sleep(800);
  const cards = await page.locator(".item-card").count();
  if (cards < 1) throw new Error("无结果");
  const titles = await page.locator(".item-card h3").allTextContents();
  if (!titles.some((t) => t.includes("雨伞"))) throw new Error("结果不含雨伞");
});
await step("清除搜索后恢复列表", async () => {
  await page.getByLabel("搜索物品名称、描述或地点").fill("");
  await page.locator('.search-bar button:has-text("搜索")').click();
  await sleep(800);
  if ((await page.locator(".item-card").count()) < 5) throw new Error("列表未恢复");
});

// 3. 类型与分类筛选按钮
await step("类型筛选：招领信息", async () => {
  await page.locator('.segmented button:has-text("招领信息")').click();
  await sleep(800);
  const badges = await page.locator(".item-card .item-type").allTextContents();
  if (badges.length === 0 || badges.some((b) => b !== "拾到物品")) throw new Error("存在非招领信息");
  await page.locator('.segmented button:has-text("全部信息")').click();
  await sleep(800);
});
await step("分类筛选按钮：数码产品", async () => {
  await page.locator('.category-filters button:has-text("数码产品")').click();
  await sleep(800);
  const cats = await page.locator(".item-card .item-meta span").allTextContents();
  if (cats.length === 0 || cats.some((c) => c !== "数码产品")) throw new Error("分类不符");
  await page.locator('.category-filters button:has-text("全部分类")').click();
  await sleep(800);
});

// 4. 详情弹窗 + 规则匹配可点击（F09 修复点）
await step("打开物品详情弹窗", async () => {
  await page.locator(".item-card", { hasText: "蓝色雨伞" }).first().click();
  await page.getByRole("dialog").waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${SHOTS}02-detail.png` });
});
await step("规则匹配列表可点击并切换详情", async () => {
  const items = page.locator(".match-item");
  await items.first().waitFor({ timeout: 8000 });
  const firstTitle = await page.locator(".detail-copy h2").textContent();
  await items.first().click();
  await sleep(1000);
  const nextTitle = await page.locator(".detail-copy h2").textContent();
  if (!nextTitle || nextTitle === firstTitle) throw new Error("点击后详情未切换");
  await page.screenshot({ path: `${SHOTS}03-match-open.png` });
});
await step("匹配详情可返回原物品", async () => {
  const origin = await page.locator(".detail-copy h2").textContent();
  await page.locator('.detail-back:has-text("返回原物品")').click();
  await sleep(1000);
  const back = await page.locator(".detail-copy h2").textContent();
  if (back === origin) throw new Error("未返回原物品");
});
await step("关闭详情弹窗", async () => {
  await page.getByRole("dialog").locator('button[aria-label="关闭窗口"]').click();
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 8000 });
});

// 5. 登录（演示账号快捷填入）
await step("演示账号快捷填入并登录", async () => {
  await page.locator('.topbar-actions button:has-text("登录 / 注册")').click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('.demo-accounts button:has-text("林同学")').click();
  if ((await dialog.getByLabel("校园账号").inputValue()) !== "20260001") throw new Error("快捷填入失败");
  await dialog.getByLabel("密码").fill("Campus123!");
  await dialog.locator('button:has-text("登录")').click();
  await page.locator(".account-button", { hasText: "林同学" }).waitFor({ timeout: 8000 });
});

// 6. 申请认领按钮（F07 入口）
await step("从详情提交认领申请", async () => {
  await page.locator(".item-card", { hasText: "蓝色雨伞" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("认领证明").fill("伞柄底部贴有一张白色小狗贴纸，是我朋友送的。");
  await dialog.locator('button:has-text("这是我的，申请认领")').click();
  await page.locator('.claim-list-row:has-text("蓝色雨伞")').waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${SHOTS}04-claim-created.png` });
});

// 7. 认领页：状态、消息发送、刷新按钮
await step("认领列表显示等待核验", async () => {
  await page.locator(".claim-list-row", { hasText: "蓝色雨伞" }).click();
  await page.locator(".claim-detail .status", { hasText: "等待核验" }).waitFor({ timeout: 8000 });
});
await step("站内消息发送并显示（F08）", async () => {
  const input = page.getByLabel("站内消息");
  await input.fill("你好，请问能核对一下伞柄贴纸吗？");
  await page.locator('.message-compose button:has-text("发送")').click();
  await page.locator(".message", { hasText: "你好，请问能核对一下伞柄贴纸吗？" }).waitFor({ timeout: 8000 });
});
await step("刷新进度按钮无报错", async () => {
  await page.locator('.page-heading button:has-text("刷新进度")').click();
  await sleep(1000);
});

// 8. 换陈同学核验
await step("陈同学登录", async () => {
  await logout();
  await login("20260002", "陈同学");
});
await step("发布者核验通过按钮（确认弹窗）", async () => {
  await goNav("我的认领");
  await page.locator(".claim-list-row", { hasText: "蓝色雨伞" }).click();
  await page.locator('.claim-action-bar button:has-text("核验通过")').click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('button:has-text("确认")').click();
  await page.locator(".claim-detail .status", { hasText: "等待交接" }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${SHOTS}05-approved.png` });
});
await step("对方回复消息可见", async () => {
  await page.getByLabel("站内消息").fill("好的，明天中午在图书馆一楼见面交接。");
  await page.locator('.message-compose button:has-text("发送")').click();
  await page.locator(".message", { hasText: "明天中午在图书馆一楼见面交接" }).waitFor({ timeout: 8000 });
});

// 9. 管理员工作台按钮
await step("管理员登录", async () => {
  await logout();
  await login("admin", "校园服务管理员");
});
await step("管理导航进入工作台", async () => {
  await page.locator('.nav-item:has-text("管理工作台")').click();
  await page.locator(".admin-panel").waitFor({ timeout: 8000 });
  await page.locator('.tabs button:has-text("信息审核")').click();
});
await step("审核通过按钮：待审信息变为已通过", async () => {
  const row = page.locator("tr", { hasText: "东院教学楼拾到笔记本" });
  await row.locator('button:has-text("通过")').click();
  await page.locator(".toast", { hasText: "信息审核通过" }).waitFor({ timeout: 8000 });
  await row.waitFor({ state: "detached", timeout: 8000 }); // 通过后离开待审列表
  await page.locator('.admin-toolbar select[aria-label="审核状态"]').selectOption("approved");
  await sleep(800);
  await page.locator("tr", { hasText: "东院教学楼拾到笔记本" }).locator(".status", { hasText: "已通过" }).waitFor({ timeout: 8000 });
  await page.locator('.admin-toolbar select[aria-label="审核状态"]').selectOption("pending");
  await sleep(500);
  await page.screenshot({ path: `${SHOTS}06-admin-review.png` });
});
await step("驳回弹窗提交：记录审核原因", async () => {
  const row = page.locator("tr", { hasText: "寻找体育馆遗失的卡套" });
  await row.locator('button:has-text("驳回")').click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("原因").fill("信息描述不够具体，请补充后重新提交。");
  await dialog.locator('button:has-text("确认驳回 / 下架")').click();
  await page.locator(".toast", { hasText: "信息已驳回 / 下架" }).waitFor({ timeout: 8000 });
  await page.locator('.admin-toolbar select[aria-label="审核状态"]').selectOption("rejected");
  await sleep(800);
  await page.locator("tr", { hasText: "寻找体育馆遗失的卡套" }).locator(".status", { hasText: "未通过" }).waitFor({ timeout: 8000 });
  await page.locator('.admin-toolbar select[aria-label="审核状态"]').selectOption("pending");
  await sleep(500);
});
await step("数据备份：创建备份按钮", async () => {
  await page.locator('.tabs button:has-text("数据备份")').click();
  const before = await page.locator(".backup-list article").count();
  await page.locator('.admin-toolbar button:has-text("创建备份")').click();
  await sleep(1200);
  const after = await page.locator(".backup-list article").count();
  if (after <= before) throw new Error("备份列表未增加");
  await page.screenshot({ path: `${SHOTS}07-backup.png` });
});
await step("争议处理页签可打开", async () => {
  await page.locator('.tabs button:has-text("争议处理")').click();
  await sleep(800);
});

// 10. 申请人确认归还 → 终态聊天只读
await step("林同学确认归还按钮（确认弹窗）", async () => {
  await logout();
  await login("20260001", "林同学");
  await goNav("我的认领");
  await page.locator(".claim-list-row", { hasText: "蓝色雨伞" }).click();
  await page.locator('.claim-action-bar button:has-text("我已收到物品，确认归还")').click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('button:has-text("确认")').click();
  await page.locator(".claim-detail .status", { hasText: "已归还" }).waitFor({ timeout: 8000 });
});
await step("终态会话只读：输入框禁用并提示仅供查阅", async () => {
  await page.locator('p.chat-readonly:has-text("此会话仅供查阅")').waitFor({ timeout: 8000 });
  if (!(await page.getByLabel("站内消息").isDisabled())) throw new Error("输入框未禁用");
  await page.screenshot({ path: `${SHOTS}08-completed-readonly.png` });
});
await step("广场卡片显示已找回标记", async () => {
  await goNav("拾光广场");
  await page.getByLabel("搜索物品名称、描述或地点").fill("蓝色雨伞");
  await page.locator('.search-bar button:has-text("搜索")').click();
  await sleep(800);
  await page.locator(".item-card .image-status", { hasText: "已找回" }).first().waitFor({ timeout: 8000 });
});

// 11. 个人中心按钮
await step("个人中心：资料保存按钮", async () => {
  await goNav("个人中心");
  await page.locator('.tabs button:has-text("资料与隐私")').click();
  await page.getByLabel("联系电话（选填）").fill("13900139000");
  await page.locator('.settings-form button:has-text("保存资料")').click();
  await page.locator(".toast", { hasText: "个人资料已保存" }).waitFor({ timeout: 8000 });
});
await step("个人中心：我的发布列表加载", async () => {
  await page.locator('.tabs button:has-text("我的发布")').click();
  await page.locator(".my-items").waitFor({ timeout: 8000 });
});

await page.screenshot({ path: `${SHOTS}09-final.png` });
await browser.close();

console.log("\n===== 浏览器走查汇总 =====");
console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
const consoleErrors = errors.filter((e) => !e.includes("Failed to load resource"));
console.log(`\n控制台错误 ${consoleErrors.length} 条`);
consoleErrors.slice(0, 10).forEach((e) => console.log("  " + e));
console.log(`\nTOTAL: ${results.length}  PASS: ${results.length - fails}  FAIL: ${fails}`);
process.exit(fails > 0 ? 1 : 0);
