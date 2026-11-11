/** Self-hosted browser regression: isolated SQLite + ephemeral local API/Vite. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { createRequire } from "node:module";
import { chromium, type Page } from "playwright-core";
import { createServer } from "vite";
import { createApp } from "../server/app.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const appRoot = resolve(root, process.env.A11Y_APP_ROOT || ".");
const out = resolve(root, process.env.A11Y_REGRESSION_OUT || "reports/a11y-regression-latest");
const scratch = resolve(root, "output", `a11y-regression-${Date.now()}`);
mkdirSync(out, { recursive: true });
mkdirSync(scratch, { recursive: true });
const chrome = [process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => p && existsSync(p));
assert.ok(chrome, "未找到 Chrome/Edge；请设置 CHROME_PATH");
const app = createApp({ dbPath: resolve(scratch, "campus.sqlite") });
const api = app.app.listen(0, "127.0.0.1");
await once(api, "listening");
const address = api.address();
assert.ok(address && typeof address !== "string");
const vite = await createServer({ root: appRoot, logLevel: "error", server: {
  host: "127.0.0.1", port: 0, strictPort: false,
  proxy: { "/api": `http://127.0.0.1:${address.port}` },
} });
await vite.listen();
const base = vite.resolvedUrls!.local[0];
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const report = { generatedAt: new Date().toISOString(), node: process.version,
  browser: browser.version(), platform: process.platform,
  scope: "Browser automation; not NVDA/Narrator listening or actual Windows contrast themes",
  errorScans: [] as { name: string; violations: string[] }[],
  checks: [] as { name: string; passed: boolean; error?: string }[] };
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: "zh-CN" });
page.setDefaultTimeout(5000);
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); report.checks.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (e) { report.checks.push({ name, passed: false, error: String(e) }); console.log(`FAIL ${name}: ${e}`); }
}
async function login(target: Page, account = "20260001") {
  await target.getByRole("button", { name: "登录 / 注册" }).click();
  const dialog = target.getByRole("dialog");
  await dialog.getByLabel("校园账号").fill(account);
  await dialog.getByLabel("密码", { exact: true }).fill("Campus123!");
  await dialog.getByRole("button", { name: "登录", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
}
async function fieldHasError(target: Page, label: string) {
  const field = target.getByLabel(label).and(target.locator("input, select, textarea"));
  assert.equal(await field.getAttribute("aria-invalid"), "true");
  const ids = (await field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
  assert.ok(ids.length > 0);
  assert.ok(await field.evaluate((el, ids) => ids.some((id) => {
    const text = document.getElementById(id);
    return text?.closest(".form-errors") && Boolean(text.textContent?.trim());
  }), ids));
}
async function exposedRoles(role: string) {
  // Unlike Playwright's DOM-derived ARIA snapshot, this is Chromium's actual AX tree.
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send("Accessibility.getFullAXTree");
    return nodes.filter(node => !node.ignored && node.role?.value === role);
  } finally { await session.detach(); }
}
async function scanErrors(name: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () =>
    (window as typeof window & { axe: import("axe-core").AxeStatic }).axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    }));
  report.errorScans.push({ name, violations: result.violations.map(v => v.id) });
  assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), []);
}
try {
  await page.goto(base);
  await page.getByRole("button", { name: "登录 / 注册" }).click();
  const dialog = page.getByRole("dialog");
  await check("F01 必填错误汇总聚焦、字段关联及键盘定位", async () => {
    await dialog.getByRole("button", { name: "登录", exact: true }).click();
    assert.equal(await dialog.locator(".form-errors").count(), 1);
    await fieldHasError(page, "校园账号");
    await fieldHasError(page, "密码");
    await page.waitForFunction(() => document.activeElement?.classList.contains("form-errors"));
    await scanErrors("login-errors");
    await page.screenshot({ path: resolve(out, "01-login-errors.png") });
    await dialog.locator(".form-errors a").first().focus();
    await page.keyboard.press("Enter");
    assert.ok(await dialog.getByLabel("校园账号").evaluate(el => document.activeElement === el));
  });
  await check("F01 修正字段清除旧错误，重复提交仍可定位", async () => {
    await dialog.getByLabel("校园账号").fill("20260001");
    assert.notEqual(await dialog.getByLabel("校园账号").getAttribute("aria-invalid"), "true");
    await dialog.getByLabel("密码", { exact: true }).fill("Campus123!");
    assert.equal(await dialog.locator(".form-errors").count(), 0);
    await dialog.getByLabel("密码", { exact: true }).fill("");
    await dialog.getByRole("button", { name: "登录", exact: true }).click();
    await fieldHasError(page, "密码");
  });
  await check("F01 登录注册切换错误 ID 唯一，移除字段不留旧错误", async () => {
    await dialog.getByRole("button", { name: "创建账号" }).click();
    await dialog.getByRole("button", { name: "注册并登录", exact: true }).click();
    const ids = await dialog.locator("[id]").evaluateAll(elements => elements.map(el => el.id));
    assert.equal(new Set(ids).size, ids.length, "表单切换不得产生重复 ID");
    await dialog.getByRole("button", { name: "去登录", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector(".form-errors")?.textContent?.includes("昵称"));
    assert.ok(!(await dialog.locator(".form-errors").innerText()).includes("昵称"));
  });
  await check("F01 快捷填入受控值后清除过期错误", async () => {
    if (await dialog.getByRole("button", { name: "去登录", exact: true }).count())
      await dialog.getByRole("button", { name: "去登录", exact: true }).click();
    await dialog.getByRole("button", { name: "填入林同学演示账号" }).click();
    await page.waitForFunction(() => !document.querySelector(".form-errors"));
    assert.notEqual(await dialog.getByLabel("校园账号").getAttribute("aria-invalid"), "true");
    assert.notEqual(await dialog.getByLabel("密码", { exact: true }).getAttribute("aria-invalid"), "true");
  });
  await dialog.getByLabel("校园账号").fill("20260001");
  await dialog.getByLabel("密码", { exact: true }).fill("wrong-password");
  await dialog.getByRole("button", { name: "登录", exact: true }).click();
  await check("F01 服务端拒绝仍播报请求错误，不误标具体字段", async () => {
    await dialog.getByRole("alert").filter({ hasText: "学号或密码不正确" }).waitFor();
    assert.ok(await dialog.getByRole("alert").evaluate(el => document.activeElement === el));
    assert.notEqual(await dialog.getByLabel("校园账号").getAttribute("aria-invalid"), "true");
  });
  await page.keyboard.press("Escape");
  await login(page);
  await page.getByRole("button", { name: "发布信息", exact: true }).click();
  await check("F04 发布表单错误不清空草稿，关联保留原提示", async () => {
    await page.getByRole("button", { name: "提交发布" }).click();
    await fieldHasError(page, "物品名称");
    await fieldHasError(page, "具体地点");
    await fieldHasError(page, "物品描述");
    const ids = (await page.getByLabel("物品描述").getAttribute("aria-describedby"))!.split(" ");
    assert.ok(ids.length >= 2, "错误关联不应覆盖字数提示");
    await scanErrors("publish-errors");
    await page.getByLabel("物品名称").fill("未提交的演示草稿");
    assert.equal(await page.getByLabel("物品名称").inputValue(), "未提交的演示草稿");
    assert.notEqual(await page.getByLabel("物品名称").getAttribute("aria-invalid"), "true");
  });
  await check("F04 选择图片后格式说明依然可访问，上传有焦点环", async () => {
    const upload = page.getByLabel("选择物品图片");
    await upload.setInputFiles({ name: "sample.png", mimeType: "image/png", buffer:
      Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=", "base64") });
    await page.getByAltText("待发布物品预览").waitFor();
    const hint = await upload.getAttribute("aria-describedby");
    assert.ok(hint);
    assert.ok(await upload.evaluate((el, id) => Boolean(document.getElementById(id)?.textContent?.includes("700")), hint));
    await upload.focus();
    assert.ok(await upload.evaluate(el => getComputedStyle(el.closest(".upload-zone")!).outlineStyle !== "none"));
  });
  await page.getByRole("button", { name: "个人中心", exact: true }).click();
  await page.getByRole("button", { name: "资料与隐私", exact: true }).click();
  await check("F02 手机号格式错误可定位和恢复", async () => {
    await page.getByLabel("联系电话（选填）").fill("123");
    await page.getByRole("button", { name: "保存资料" }).click();
    await fieldHasError(page, "联系电话（选填）");
    await page.getByLabel("联系电话（选填）").fill("");
    assert.notEqual(await page.getByLabel("联系电话（选填）").getAttribute("aria-invalid"), "true");
  });
  await page.getByRole("navigation", { name: "主导航" }).getByRole("button", { name: "我的认领", exact: true }).click();
  await page.getByRole("button", { name: "提交争议", exact: true }).click();
  await check("F11 认领争议必填错误在弹窗内定位", async () => {
    await page.getByRole("button", { name: "提交管理员处理" }).click();
    await fieldHasError(page, "争议说明");
    await page.waitForFunction(() => document.activeElement?.classList.contains("form-errors"));
    await scanErrors("dispute-errors");
    await page.getByLabel("争议说明").fill("用于验证的争议草稿，不提交");
    assert.equal(await page.locator(".form-errors").count(), 0);
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "退出登录" }).click();
  await login(page, "admin");
  await page.getByRole("button", { name: "管理工作台", exact: true }).click();
  await page.getByRole("button", { name: /^驳回：/ }).first().click();
  await check("F10 审核原因错误可定位，不触发审核写入", async () => {
    await page.getByRole("button", { name: "确认驳回 / 下架" }).click();
    await fieldHasError(page, "原因");
    await page.waitForFunction(() => document.activeElement?.classList.contains("form-errors"));
    await scanErrors("admin-errors");
    await page.screenshot({ path: resolve(out, "03-admin-error.png") });
  });
  await page.keyboard.press("Escape");

  await page.goto(base + "scripts/fixtures/dialogs.html");
  await page.getByRole("button", { name: "打开第一层" }).click();
  await page.getByRole("button", { name: "打开第二层" }).click();
  await check("公共弹窗：下层隔离，Tab 仅在最上层循环", async () => {
    await page.waitForFunction(() => document.querySelector('[inert] [role="dialog"]'));
    const dialogs = await exposedRoles("dialog");
    assert.deepEqual(dialogs.map(node => node.name?.value), ["第二层"]);
    for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
    assert.ok(await page.getByRole("dialog", { name: "第二层" }).evaluate(el => el.contains(document.activeElement)));
  });
  await check("公共弹窗：Escape 逐层关闭并恢复焦点和滚动", async () => {
    await page.keyboard.press("Escape");
    const parent = page.getByRole("dialog", { name: "第一层", exact: true });
    await parent.waitFor();
    assert.equal(await page.locator('[role="dialog"]').count(), 1);
    assert.ok(await page.getByRole("button", { name: "打开第二层" }).evaluate(el => document.activeElement === el));
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    await page.keyboard.press("Escape");
    await parent.waitFor({ state: "hidden" });
    assert.ok(await page.getByRole("button", { name: "打开第一层" }).evaluate(el => document.activeElement === el));
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  });
  await page.goto(base);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "打开导航" }).click();
  await check("公共导航：抽屉打开时主体对辅助技术隔离", async () => {
    await page.waitForFunction(() => document.querySelector(".workspace")?.hasAttribute("inert"));
    assert.equal((await exposedRoles("main")).length, 0);
    assert.equal(await page.getByRole("dialog", { name: "侧边栏" }).count(), 1);
    await page.waitForFunction(() => Math.abs(document.getElementById("app-sidebar")!.getBoundingClientRect().left) < 0.5);
    await page.screenshot({ path: resolve(out, "02-mobile-modal.png") });
  });
  await check("公共导航：关闭恢复主体与触发焦点", async () => {
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("main").count(), 1);
    assert.ok(await page.getByRole("button", { name: "打开导航" }).evaluate(el => document.activeElement === el));
  });
  await check("公共导航：打开抽屉后跨桌面断点释放主体", async () => {
    await page.getByRole("button", { name: "打开导航" }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForFunction(() => !document.querySelector(".workspace")?.hasAttribute("inert"));
    assert.ok((await exposedRoles("main")).length === 1);
    assert.equal(await page.getByRole("dialog", { name: "侧边栏" }).count(), 0);
    assert.ok(await page.getByRole("main").evaluate(el => el.contains(document.activeElement)));
  });
} finally {
  writeFileSync(resolve(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  await vite.close();
  await new Promise<void>((done) => api.close(() => done()));
  app.close();
}
const failed = report.checks.filter(c => !c.passed);
console.log(`\n${report.checks.length - failed.length}/${report.checks.length} checks passed; ${out}`);
assert.equal(failed.length, 0, `${failed.length} 项无障碍回归失败`);
