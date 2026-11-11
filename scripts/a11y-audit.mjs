/**
 * 视障友好适配自动审计。
 *
 * 依赖：playwright-core（驱动本机 Chrome/Edge）、axe-core（WCAG 规则）。
 * 运行前先构建并启动生产服务：
 *   npm run build
 *   npm start
 * 另开终端：
 *   npm run test:a11y
 *
 * 说明：脚本只读页面、登录演示账号和打开弹窗，不发布信息、不修改业务数据。
 * A11Y_STRICT=0 可只采集报告、不因检查失败退出（用于改造前基线）。
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const base = process.env.A11Y_BASE_URL || "http://127.0.0.1:4318";
const strict = process.env.A11Y_STRICT !== "0";
const outDir = resolve(root, process.env.A11Y_OUT || "reports/a11y-latest");
const outRel = relative(root, outDir).replaceAll("\\", "/");
const axePath = require.resolve("axe-core/axe.min.js");
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);
const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

mkdirSync(outDir, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: base,
  engine: "Chromium (system Chrome/Edge) + axe-core",
  browser: executablePath || "not found",
  axeVersion: null,
  runs: [],
  checks: [],
  screenshots: [],
  consoleErrors: [],
};

function recordRun(name, result) {
  report.runs.push({
    name,
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    })),
    incomplete: result.incomplete.map((item) => ({
      id: item.id,
      impact: item.impact,
      nodes: item.nodes.map((node) => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary,
      })),
    })),
    passes: result.passes.length,
    violationNodeCount: result.violations.reduce(
      (sum, violation) => sum + violation.nodes.length,
      0,
    ),
  });
}

async function ensureAxe(page) {
  const loaded = await page.evaluate(() => Boolean(window.axe));
  if (!loaded) await page.addScriptTag({ path: axePath });
}

async function scan(page, name) {
  await ensureAxe(page);
  const version = await page.evaluate(() => window.axe.version);
  report.axeVersion = version;
  const result = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
      resultTypes: ["violations", "incomplete", "passes"],
    });
  });
  recordRun(name, result);
  console.log(
    `axe ${name}: ${result.violations.length} violations / ${result.passes.length} passes`,
  );
  return result;
}

async function screenshot(page, name) {
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage: false });
  report.screenshots.push(`${outRel}/${name}.png`);
}

async function ariaSnapshot(page, name) {
  try {
    const yaml = await page.locator("body").ariaSnapshot();
    writeFileSync(resolve(outDir, `${name}.aria.yml`), yaml, "utf8");
  } catch {
    // ariaSnapshot 在旧版 Playwright 中不可用，不影响 axe 结果。
  }
}

async function check(id, label, fn) {
  try {
    const detail = await fn();
    report.checks.push({ id, label, pass: true, detail: detail ?? "" });
    console.log(`PASS ${id} ${label}`);
  } catch (error) {
    report.checks.push({ id, label, pass: false, detail: error.message });
    console.log(`FAIL ${id} ${label}: ${error.message}`);
  }
}

async function activeElement(page) {
  return await page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    return {
      tag: element.tagName,
      id: element.id,
      role: element.getAttribute("role"),
      label: element.getAttribute("aria-label"),
      text: (element.getAttribute("aria-label") || element.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120),
      className: String(element.className || ""),
      insideDialog: Boolean(element.closest('[role="dialog"]')),
      insideSidebar: Boolean(element.closest("#app-sidebar")),
    };
  });
}

async function assertNoHorizontalOverflow(page) {
  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    size.scrollWidth <= size.clientWidth + 1,
    `页面横向溢出：scrollWidth=${size.scrollWidth}, clientWidth=${size.clientWidth}`,
  );
  return `${size.scrollWidth}px / ${size.clientWidth}px`;
}

async function open(page, path = "/") {
  await page.goto(base + path, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForTimeout(100);
}

async function login(page, account, password = "Campus123!") {
  if (await page.getByRole("dialog").count()) {
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }
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

async function main() {
  if (!executablePath) throw new Error("未找到 Chrome/Edge，请设置 CHROME_PATH");
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--force-color-profile=srgb"],
  });
  const pageErrors = [];

  try {
    // ---------------------------------------------------------------- 桌面浅色：广场
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      locale: "zh-CN",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await open(page);
    await page.locator(".item-card").first().waitFor();
    await scan(page, "01-explore-light");
    await screenshot(page, "01-explore-light");
    await ariaSnapshot(page, "01-explore-light");

    await check("skip-link", "首 Tab 可到达“跳到主要内容”且不改变路由", async () => {
      const before = page.url();
      await page.keyboard.press("Tab");
      const active = await activeElement(page);
      assert.match(active?.text || "", /跳到主要内容/);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      const focused = await page.evaluate(
        () => document.activeElement?.id === "main-content",
      );
      assert.ok(focused, "跳到主要内容后焦点未落到 main#main-content");
      assert.equal(page.url(), before, "跳转链接不应改变 SPA 路由");
    });

    await check("landmarks", "页面包含可命名的主导航与主内容地标", async () => {
      assert.equal(
        await page.getByRole("navigation", { name: "主导航" }).count(),
        1,
      );
      assert.equal(await page.getByRole("main").count(), 1);
    });

    await check("nav-current", "当前导航项带 aria-current=page", async () => {
      const item = page.getByRole("button", { name: "拾光广场", exact: true });
      assert.equal(await item.getAttribute("aria-current"), "page");
    });

    await check("search-name", "搜索框有可读名称，筛选组有组名", async () => {
      assert.equal(
        await page
          .getByRole("searchbox", { name: "搜索物品名称、描述或地点" })
          .count(),
        1,
      );
      assert.equal(
        await page.getByRole("group", { name: "信息类型" }).count(),
        1,
      );
    });

    await check("filter-state", "筛选按钮用 aria-pressed 暴露选中状态", async () => {
      const found = page.getByRole("button", { name: "招领信息", exact: true });
      await found.click();
      assert.equal(await found.getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "全部信息", exact: true }).click();
    });

    await check("card-semantics", "物品卡片是文章结构，标题为标题，详情动作可命名", async () => {
      const card = page.locator(".item-card").first();
      assert.equal(await card.evaluate((element) => element.tagName), "ARTICLE");
      assert.equal(await card.locator("h3").count(), 1);
      const action = card.getByRole("button", { name: /查看.*详情/ });
      assert.equal(await action.count(), 1);
    });

    await check("card-detail-focus", "键盘打开详情后焦点进入弹窗，Esc 关闭并回到卡片", async () => {
      const card = page.locator(".item-card").first();
      const action = card.getByRole("button", { name: /查看.*详情/ });
      const target = (await action.count()) ? action : card;
      await target.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      await scan(page, "02b-item-detail");
      await screenshot(page, "02b-item-detail");
      await ariaSnapshot(page, "02b-item-detail");
      assert.ok(
        await page.evaluate(() =>
          Boolean(document.activeElement?.closest('[role="dialog"]')),
        ),
      );
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await page.waitForTimeout(100);
      const active = await activeElement(page);
      assert.match(active?.text || "", /查看.*详情/);
    });

    // ---------------------------------------------------------------- 登录弹窗
    const loginTrigger = page.getByRole("button", { name: "登录 / 注册" });
    await loginTrigger.click();
    const loginDialog = page.getByRole("dialog", { name: "欢迎回到拾光校园" });
    await loginDialog.waitFor();
    await scan(page, "02-login-dialog");
    await screenshot(page, "02-login-dialog");
    await ariaSnapshot(page, "02-login-dialog");

    await check("dialog-semantics", "登录弹窗有名称、模态语义和关闭按钮", async () => {
      assert.equal(await loginDialog.getAttribute("aria-modal"), "true");
      assert.equal(
        await loginDialog.getByRole("button", { name: "关闭窗口" }).count(),
        1,
      );
      assert.ok(
        await page.evaluate(() =>
          Boolean(document.activeElement?.closest('[role="dialog"]')),
        ),
        "弹窗打开后焦点不在弹窗内",
      );
      assert.equal(
        await page.evaluate(() => document.getElementById("root")?.inert),
        true,
        "弹窗打开时背景根节点未设置 inert",
      );
    });

    await check("dialog-focus-trap", "Tab 在弹窗内循环，背景不可聚焦", async () => {
      for (let index = 0; index < 12; index += 1) {
        await page.keyboard.press("Tab");
        const active = await activeElement(page);
        assert.ok(active?.insideDialog, `第 ${index + 1} 次 Tab 焦点逃出弹窗`);
      }
    });

    await check("dialog-escape-restore", "Esc 关闭弹窗并把焦点还给触发按钮", async () => {
      await page.keyboard.press("Escape");
      await loginDialog.waitFor({ state: "hidden" });
      const active = await activeElement(page);
      assert.match(active?.text || "", /登录 \/ 注册/);
      assert.equal(
        await page.evaluate(() => document.getElementById("root")?.inert),
        false,
        "弹窗关闭后背景根节点仍处于 inert",
      );
    });

    await check("form-required", "登录表单必填项使用原生 required", async () => {
      await loginTrigger.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      try {
        const account = dialog.getByLabel("校园账号");
        assert.equal(await account.getAttribute("required"), "");
      } finally {
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
      }
    });

    await login(page, "20260001");
    await check("login-status", "登录成功通过 role=status 播报", async () => {
      const status = page.getByRole("status").filter({ hasText: "登录成功" });
      assert.equal(await status.count(), 1);
    });

    // ---------------------------------------------------------------- 个人中心
    await page.getByRole("button", { name: "个人中心", exact: true }).click();
    await page.getByRole("heading", { level: 1, name: "我的校园足迹" }).waitFor();
    await page.waitForTimeout(150);
    await scan(page, "03-profile");
    await screenshot(page, "03-profile");
    await ariaSnapshot(page, "03-profile");

    await check("route-focus", "路由切换后焦点落到页面一级标题", async () => {
      const active = await activeElement(page);
      assert.match(active?.text || "", /我的校园足迹/);
    });

    await check("route-title", "路由切换后文档标题随页面更新", async () => {
      assert.match(await page.title(), /个人中心/);
    });

    await check("profile-tabs", "个人中心视图按钮暴露 aria-pressed", async () => {
      const settings = page.getByRole("button", { name: "资料与隐私" });
      await settings.click();
      assert.equal(await settings.getAttribute("aria-pressed"), "true");
      assert.equal(
        await page
          .getByRole("button", { name: /我的发布/ })
          .getAttribute("aria-pressed"),
        "false",
      );
    });

    // ---------------------------------------------------------------- 发布页
    await page.getByRole("button", { name: "发布信息", exact: true }).click();
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForTimeout(150);
    await scan(page, "04-publish");
    await screenshot(page, "04-publish");
    await ariaSnapshot(page, "04-publish");

    await check("publish-form-labels", "发布表单控件均有可读名称且必填状态可感知", async () => {
      assert.equal(await page.getByLabel("物品名称").count(), 1);
      assert.equal(await page.getByLabel("物品分类").count(), 1);
      assert.equal(await page.getByLabel(/拾取日期|遗失日期/).count(), 1);
      assert.equal(await page.getByLabel("具体地点").count(), 1);
      assert.equal(await page.getByLabel("物品描述").count(), 1);
      const file = page.locator('input[type="file"]');
      assert.equal(await file.getAttribute("aria-label"), "选择物品图片");
      assert.equal(await page.getByLabel("物品名称").getAttribute("required"), "");
      assert.equal(
        await page.locator(".required").first().getAttribute("aria-hidden"),
        "true",
      );
    });

    // ---------------------------------------------------------------- 认领页
    await page.getByRole("button", { name: "我的认领", exact: true }).click();
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForTimeout(400);
    await scan(page, "05-claims");
    await screenshot(page, "05-claims");
    await ariaSnapshot(page, "05-claims");

    await check("claim-log", "站内消息使用 log 语义，认领列表暴露当前项", async () => {
      assert.equal(await page.getByRole("log").count(), 1);
      const rows = page.locator(".claim-list-row");
      assert.ok((await rows.count()) > 0, "演示账号没有认领记录");
      assert.equal(await rows.first().getAttribute("aria-current"), "true");
    });

    await check("claim-progress", "认领进度以列表语义暴露，当前步骤可感知", async () => {
      const progress = page.getByRole("list", { name: "认领进度" });
      assert.equal(await progress.count(), 1);
      assert.equal(await progress.getByRole("listitem").count(), 3);
    });

    // ---------------------------------------------------------------- 管理员
    await page.getByRole("button", { name: "退出登录" }).click();
    await page.getByRole("button", { name: "登录 / 注册" }).waitFor();
    await login(page, "admin");
    await page.getByRole("button", { name: "管理工作台", exact: true }).click();
    await page
      .getByRole("heading", { level: 1, name: "守护每一份校园善意" })
      .waitFor();
    await page.waitForTimeout(300);
    await scan(page, "06-admin-review");
    await screenshot(page, "06-admin-review");
    await ariaSnapshot(page, "06-admin-review");

    await check("admin-table", "审核表格有名称、列标题，重复操作按钮带物品上下文", async () => {
      const table = page.getByRole("table", { name: /物品审核/ });
      assert.equal(await table.count(), 1);
      assert.ok((await table.getByRole("columnheader").count()) >= 5);
      const approve = table.getByRole("button", { name: /通过/ }).first();
      assert.match((await approve.getAttribute("aria-label")) || "", /通过/);
    });

    await check("admin-tabs", "管理工作台视图按钮暴露 aria-pressed", async () => {
      const disputes = page.getByRole("button", { name: "争议处理" });
      await disputes.click();
      assert.equal(await disputes.getAttribute("aria-pressed"), "true");
      await page.waitForTimeout(150);
    });

    await page.getByRole("button", { name: "信息审核" }).click();
    await context.close();

    // ---------------------------------------------------------------- 深色主题
    const darkContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
      locale: "zh-CN",
    });
    await darkContext.addInitScript(() =>
      localStorage.setItem("campus-theme", "dark"),
    );
    const darkPage = await darkContext.newPage();
    darkPage.setDefaultTimeout(6000);
    await open(darkPage);
    await darkPage.locator(".item-card").first().waitFor();
    await scan(darkPage, "07-explore-dark");
    await screenshot(darkPage, "07-explore-dark");
    await check("dark-theme", "深色主题实际生效", async () => {
      assert.equal(
        await darkPage.evaluate(() => document.documentElement.dataset.theme),
        "dark",
      );
      const background = await darkPage.evaluate(
        () => getComputedStyle(document.documentElement).backgroundColor,
      );
      assert.match(background, /^rgb\(33, 31, 27\)$/);
    });
    await darkContext.close();

    // ---------------------------------------------------------------- 高对比度偏好
    const contrastContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      contrast: "more",
      colorScheme: "light",
      locale: "zh-CN",
    });
    const contrastPage = await contrastContext.newPage();
    contrastPage.setDefaultTimeout(6000);
    await open(contrastPage);
    await contrastPage.locator(".item-card").first().waitFor();
    await scan(contrastPage, "08-contrast-more");
    await screenshot(contrastPage, "08-contrast-more");
    await check("contrast-more", "prefers-contrast: more 下提高文字与边框对比度", async () => {
      assert.equal(
        await contrastPage.evaluate(
          () => matchMedia("(prefers-contrast: more)").matches,
        ),
        true,
      );
      const tokens = await contrastPage.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return {
          muted: style.getPropertyValue("--muted").trim().toUpperCase(),
          control: style.getPropertyValue("--control-border").trim().toUpperCase(),
        };
      });
      assert.notEqual(tokens.muted, "#5B6B66", "高对比度偏好未覆盖 --muted");
      assert.notEqual(
        tokens.control,
        "#7A8072",
        "高对比度偏好未覆盖 --control-border",
      );
    });
    await contrastContext.close();

    // ---------------------------------------------------------------- 系统强制颜色（Windows 高对比度）
    const forcedContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      forcedColors: "active",
      locale: "zh-CN",
    });
    const forcedPage = await forcedContext.newPage();
    forcedPage.setDefaultTimeout(6000);
    await open(forcedPage);
    await forcedPage.locator(".item-card").first().waitFor();
    await screenshot(forcedPage, "09-forced-colors");
    await check("forced-colors", "系统强制颜色模式下保留焦点与控件边框", async () => {
      assert.equal(
        await forcedPage.evaluate(
          () => matchMedia("(forced-colors: active)").matches,
        ),
        true,
      );
      const nav = forcedPage.getByRole("button", {
        name: "拾光广场",
        exact: true,
      });
      await nav.focus();
      const style = await nav.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          outlineStyle: computed.outlineStyle,
          outlineWidth: parseFloat(computed.outlineWidth),
          borderStyle: computed.borderStyle,
        };
      });
      assert.notEqual(style.outlineStyle, "none");
      assert.ok(style.outlineWidth >= 2, `焦点轮廓宽度过小：${style.outlineWidth}`);
      assert.notEqual(style.borderStyle, "none", "导航项没有可见边框");
    });
    await forcedContext.close();

    // ---------------------------------------------------------------- 减少动态效果
    const motionContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
      locale: "zh-CN",
    });
    const motionPage = await motionContext.newPage();
    motionPage.setDefaultTimeout(6000);
    await open(motionPage);
    await motionPage.locator(".item-card").first().waitFor();
    await check("reduced-motion", "prefers-reduced-motion 下取消过渡与动画", async () => {
      const durations = await motionPage.evaluate(() => {
        const button = document.querySelector(".button");
        const spinner = document.querySelector(".spin");
        const buttonStyle = button ? getComputedStyle(button) : null;
        const spinnerStyle = spinner ? getComputedStyle(spinner) : null;
        return {
          transition: buttonStyle?.transitionDuration || "",
          animation: spinnerStyle?.animationDuration || "",
        };
      });
      const values = `${durations.transition},${durations.animation}`
        .split(",")
        .map((value) => parseFloat(value) || 0);
      assert.ok(
        values.every((value) => value <= 0.02),
        `仍存在动态时长：${durations.transition} / ${durations.animation}`,
      );
    });
    await motionContext.close();

    // ---------------------------------------------------------------- 200% 缩放 / 文本间距
    const zoomContext = await browser.newContext({
      viewport: { width: 720, height: 450 },
      locale: "zh-CN",
    });
    const zoomPage = await zoomContext.newPage();
    zoomPage.setDefaultTimeout(6000);
    await open(zoomPage);
    await zoomPage.locator(".item-card").first().waitFor();
    await screenshot(zoomPage, "10-zoom-200");
    await check("zoom-200", "200% 等效视口无横向溢出", async () => {
      return await assertNoHorizontalOverflow(zoomPage);
    });
    await check("text-spacing", "文本间距覆盖后内容不横向溢出", async () => {
      await zoomPage.addStyleTag({
        content:
          "*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}",
      });
      return await assertNoHorizontalOverflow(zoomPage);
    });
    await zoomContext.close();

    // ---------------------------------------------------------------- 移动端抽屉
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "zh-CN",
      isMobile: false,
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.setDefaultTimeout(6000);
    await open(mobilePage);
    await mobilePage.locator(".item-card").first().waitFor();
    await check("mobile-overflow", "390px 视口无横向溢出", async () => {
      return await assertNoHorizontalOverflow(mobilePage);
    });
    const toggle = mobilePage.getByRole("button", { name: "打开导航" });
    await toggle.click();
    await mobilePage.waitForTimeout(150);
    await screenshot(mobilePage, "11-mobile-drawer");
    await scan(mobilePage, "11-mobile-drawer");

    await check("mobile-drawer", "抽屉焦点锁定、Esc 关闭并归还焦点", async () => {
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      const active = await activeElement(mobilePage);
      assert.ok(active?.insideSidebar, "抽屉打开后焦点不在侧栏内");
      for (let index = 0; index < 10; index += 1) {
        await mobilePage.keyboard.press("Tab");
        const current = await activeElement(mobilePage);
        assert.ok(current?.insideSidebar, `第 ${index + 1} 次 Tab 焦点逃出抽屉`);
      }
      await mobilePage.keyboard.press("Escape");
      await mobilePage.waitForTimeout(100);
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      const restored = await activeElement(mobilePage);
      assert.match(restored?.text || "", /打开导航/);
    });
    await mobileContext.close();

    if (pageErrors.length) report.consoleErrors = pageErrors;
  } finally {
    await browser.close();
    writeFileSync(
      resolve(outDir, "report.json"),
      JSON.stringify(report, null, 2),
      "utf8",
    );
  }

  const failedChecks = report.checks.filter((item) => !item.pass);
  const violationCount = report.runs.reduce(
    (sum, run) => sum + run.violationNodeCount,
    0,
  );
  console.log(
    `\n合计：${report.runs.length} 次 axe 扫描，${violationCount} 个违规节点；` +
      `${report.checks.length - failedChecks.length}/${report.checks.length} 项交互检查通过。`,
  );
  console.log(`报告：${resolve(outDir, "report.json")}`);
  if (strict && (failedChecks.length > 0 || violationCount > 0)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  writeFileSync(
    resolve(outDir, "report.json"),
    JSON.stringify({ ...report, fatal: String(error) }, null, 2),
    "utf8",
  );
  process.exitCode = 1;
});
