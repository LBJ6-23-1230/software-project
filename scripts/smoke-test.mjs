/**
 * 端到端冒烟测试：验证无障碍改造后原有业务仍可完整走通。
 * 覆盖：登录 → 发布 → 管理员审核 → 公开搜索 → 认领申请 → 站内消息 → 发布者核验。
 * 只写入本机 data/ 演示数据库，不会修改源码；运行前先 npm run build && npm start。
 *
 *   npm run test:smoke
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4318";
const candidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const executablePath = candidates.find((candidate) => existsSync(candidate));
const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
const title = `无障碍适配验收${stamp}`;
const proof = "伞柄内侧有一张蓝色小熊贴纸，伞骨第二根有划痕。";

function log(step) {
  console.log(`✔ ${step}`);
}

async function login(page, account, password = "Campus123!") {
  await page.getByRole("button", { name: "登录 / 注册" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("校园账号").fill(account);
  await dialog.getByLabel("密码", { exact: true }).fill(password);
  await dialog
    .locator("form")
    .getByRole("button", { name: "登录", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
}

async function logout(page) {
  await page.getByRole("button", { name: "退出登录" }).click();
  await page.getByRole("button", { name: "登录 / 注册" }).waitFor();
}

async function toast(page, text) {
  await page.getByRole("status").filter({ hasText: text }).waitFor();
}

async function main() {
  if (!executablePath) throw new Error("未找到 Chrome/Edge，请设置 CHROME_PATH");
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 },
    forcedColors: process.env.SMOKE_FORCED_COLORS === "active" ? "active" : "none" });
  page.setDefaultTimeout(12000);
  try {
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page.locator(".item-card").first().waitFor();

    // 1. 发布者登录并发布一条真实可认领的招领信息
    await login(page, "20260002");
    await page.getByRole("button", { name: "发布信息", exact: true }).click();
    await page.getByLabel("物品名称").fill(title);
    await page.getByLabel("物品分类").selectOption("生活用品");
    await page.getByLabel(/拾取日期|遗失日期/).fill("2026-11-02");
    await page.getByLabel("所在校区").selectOption("南湖校区");
    await page.getByLabel("具体地点").fill("南湖图书馆一楼大厅");
    await page.getByLabel("物品描述").fill(proof);
    await page.getByRole("button", { name: "提交发布" }).click();
    await page.getByRole("heading", { level: 1, name: "我的校园足迹" }).waitFor();
    await toast(page, "信息已提交");
    await page.getByRole("article").filter({ hasText: title }).first().waitFor();
    log("发布信息并进入待审核列表");

    // 2. 管理员审核通过
    await logout(page);
    await login(page, "admin");
    await page.getByRole("button", { name: "管理工作台", exact: true }).click();
    const row = page.locator("table tbody tr").filter({ hasText: title });
    await row.waitFor();
    await row.getByRole("button", { name: new RegExp(`审核通过：${title}`) }).click();
    await toast(page, "信息审核通过");
    log("管理员审核通过");

    // 3. 退出后在广场搜索到新信息并打开详情
    await logout(page);
    await page.getByRole("searchbox", { name: "搜索物品名称、描述或地点" }).fill(title);
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    const card = page.locator(".item-card").filter({ hasText: title }).first();
    await card.waitFor();
    await card.getByRole("button", { name: /查看详情/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /南湖图书馆一楼大厅/);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    log("公开搜索与详情打开正常");

    // 4. 另一名学生提交认领申请
    await login(page, "20260001");
    await page.getByRole("searchbox", { name: "搜索物品名称、描述或地点" }).fill(title);
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await card.waitFor();
    await card.getByRole("button", { name: /查看详情/ }).click();
    await dialog.waitFor();
    await dialog.getByLabel("认领证明").fill(proof);
    await dialog
      .getByRole("button", { name: "这是我的，申请认领" })
      .click();
    await page.getByRole("heading", { level: 1, name: "每一步，都离重逢更近" }).waitFor();
    await toast(page, "认领申请已提交");
    log("提交认领申请");

    // 5. 申请人与发布者站内沟通
    const claimRow = page.locator(".claim-list-row").filter({ hasText: title }).first();
    await claimRow.waitFor();
    await claimRow.click();
    const message = "你好，我描述的是伞柄贴纸和伞骨划痕，请核对。";
    await page
      .getByRole("textbox", { name: "站内消息" })
      .fill(message);
    await page.getByRole("button", { name: "发送", exact: true }).click();
    await page.getByRole("log").getByText(message).waitFor();
    log("申请人发送站内消息");

    // 6. 发布者核验通过
    await logout(page);
    await login(page, "20260002");
    await page.getByRole("button", { name: "我的认领", exact: true }).click();
    const ownerRow = page.locator(".claim-list-row").filter({ hasText: title }).first();
    await ownerRow.waitFor();
    await ownerRow.click();
    await page.getByRole("button", { name: "核验通过", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "确认更新认领状态" });
    await confirm.waitFor();
    await confirm.getByRole("button", { name: "确认", exact: true }).click();
    await toast(page, "认领状态已更新");
    await page.locator(".claim-detail").getByText("等待交接", { exact: true }).waitFor();
    assert.match(await page.locator(".claim-detail").innerText(), /等待交接/);
    log("发布者核验通过，认领进入等待交接");

    console.log(`\n冒烟测试通过：${title}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
