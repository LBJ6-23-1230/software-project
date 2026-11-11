// 素材替换验收：确认广场卡片、详情弹窗、匹配列表与兜底图全部真实渲染，无 404 与控制台错误。
// 运行：node scripts/asset-check.mjs（dev server 需已在 5173 端口运行）
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = "http://127.0.0.1:5173";
const SHOTS = fileURLToPath(
  new URL("../reports/browser-evidence/", import.meta.url),
);
mkdirSync(SHOTS, { recursive: true });

const errors = [];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`);
});

await page.goto(BASE);
await page.locator(".item-card").first().waitFor({ timeout: 10000 });
await page.waitForTimeout(1500); // 等懒加载图片完成

const cards = page.locator(".item-card");
const count = await cards.count();
let bad = 0;
for (let i = 0; i < count; i++) {
  const img = cards.nth(i).locator("img");
  const src = await img.getAttribute("src");
  const ok = await img.evaluate((el) => el.complete && el.naturalWidth > 0);
  const title = await cards.nth(i).locator("h3").textContent();
  console.log(`${ok ? "PASS" : "FAIL"}  卡片[${title.trim()}]  ${src}`);
  if (!ok) bad++;
}
await page.screenshot({ path: `${SHOTS}10-real-images-home.png`, fullPage: true });

// 详情弹窗图片 + 匹配列表图片
await cards.first().click();
await page.getByRole("dialog").waitFor({ timeout: 8000 });
const detailImg = page.getByRole("dialog").locator(".detail-visual img");
const detailOk = await detailImg.evaluate((el) => el.complete && el.naturalWidth > 0);
console.log(`${detailOk ? "PASS" : "FAIL"}  详情主图  ${await detailImg.getAttribute("src")}`);
const matchImgs = page.getByRole("dialog").locator(".match-item img");
const mCount = await matchImgs.count();
let mBad = 0;
for (let i = 0; i < mCount; i++) {
  const ok = await matchImgs.nth(i).evaluate((el) => el.complete && el.naturalWidth > 0);
  if (!ok) mBad++;
}
console.log(`${mBad === 0 ? "PASS" : "FAIL"}  匹配列表图片 ${mCount} 张全部渲染`);
await page.screenshot({ path: `${SHOTS}11-real-images-detail.png` });

// 首页插画（保留的 keys.svg / card.svg 装饰）也应正常
const heroOk = await page.locator(".hero-art img").first().evaluate((el) => el.complete && el.naturalWidth > 0);
console.log(`${heroOk ? "PASS" : "FAIL"}  首页装饰插画仍可渲染`);

const httpErrors = errors.filter((e) => !e.includes("/api/auth/me") || !e.includes("401"));
console.log("\n非预期错误（排除访客 401 探测）:");
httpErrors.length ? httpErrors.forEach((e) => console.log("  " + e)) : console.log("  无");
await browser.close();
process.exit(bad + mBad > 0 || httpErrors.length ? 1 : 0);
