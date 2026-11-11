/** F04–F06 browser regression. Uses an isolated DB and ephemeral API/Vite ports. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { once } from "node:events";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium, type Page } from "playwright-core";
import { createServer } from "vite";
import { createApp } from "../server/app.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const out = resolve(root, process.env.ITEMS_REGRESSION_OUT || "reports/csw/module-latest");
const scratch = resolve(root, "output", `csw-regression-${Date.now()}`);
mkdirSync(out, { recursive: true }); mkdirSync(scratch, { recursive: true });
const chrome = [process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(p => p && existsSync(p));
assert.ok(chrome, "请设置CHROME_PATH指向Chrome/Edge");
const app = createApp({ dbPath: resolve(scratch,"campus.sqlite"), backupDir: resolve(scratch,"backups") });
const apiServer = app.app.listen(0,"127.0.0.1"); await once(apiServer,"listening");
const address = apiServer.address(); assert.ok(address && typeof address !== "string");
const apiBase = `http://127.0.0.1:${address.port}/api`;
const vite = await createServer({root,logLevel:"error",server:{host:"127.0.0.1",port:0,strictPort:false,
  proxy:{"/api":`http://127.0.0.1:${address.port}`}}});
await vite.listen(); const base = vite.resolvedUrls!.local[0];
const browser = await chromium.launch({executablePath:chrome,headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1000},locale:"zh-CN"});
page.setDefaultTimeout(3500);
const report = {generatedAt:new Date().toISOString(),node:process.version,browser:browser.version(),
  scope:"F04–F06 isolated browser regression; no real user data or production DB",
  checks:[] as {id:string,name:string,passed:boolean,error?:string}[],
  scans:[] as {name:string,violations:string[],incomplete:string[],details:unknown[]}[]};
async function call(path:string, body?:unknown, token?:string) {
  const r=await fetch(apiBase+path,{method:body===undefined?"GET":"POST",headers:{
    "Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},
    body:body===undefined?undefined:JSON.stringify(body)});
  assert.ok(r.ok,`${path}: ${r.status}`);return r.json();
}
async function check(id:string,name:string,fn:()=>Promise<void>){
  try{await fn();report.checks.push({id,name,passed:true});console.log(`PASS ${id} ${name}`);}
  catch(e){report.checks.push({id,name,passed:false,error:String(e)});console.log(`FAIL ${id} ${name}: ${e}`);
    await page.screenshot({path:resolve(out,`${id}-failure.png`),fullPage:true}).catch(()=>{});}
  finally{await page.unrouteAll({behavior:"wait"});}
}
async function search(q:string){
  await page.getByRole("searchbox",{name:"搜索物品名称、描述或地点"}).fill(q);
  await page.getByRole("button",{name:"搜索",exact:true}).click();
}
async function openFixture(id:string,title:string){
  await page.goto(base);
  await search(title);
  await page.getByRole("button",{name:`查看详情：${title}`,exact:true}).click();
}
async function scan(name:string){
  await page.addScriptTag({path:require.resolve("axe-core/axe.min.js")});
  const result=await page.evaluate(async()=>{
    const axe=(window as any).axe;
    return axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}});
  });
  report.scans.push({name,violations:result.violations.map((v:any)=>v.id),incomplete:result.incomplete.map((v:any)=>v.id),
    details:result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}))});
  assert.equal(result.violations.length,0,`${name} axe violations`);
}
try {
  const owner=await call("/auth/login",{studentId:"20260002",password:"Campus123!"});
  const admin=await call("/auth/login",{studentId:"admin",password:"Campus123!"});
  const titles=["CSW验收蓝色雨伞A","CSW验收蓝色雨伞B"];
  const items=[];
  for(const title of titles){
    const item=await call("/items",{type:title===titles[0]?"found":"lost",title,category:"生活用品",location:"南湖图书馆",
      campus:"南湖校区",occurredAt:"2026-11-11",description:"虚构蓝色雨伞，用于课程隔离测试。"},owner.token);
    await call(`/admin/items/${item.id}/review`,{action:"approve"},admin.token);items.push(item);
  }
  await page.goto(base);
  await page.getByRole("button",{name:"登录 / 注册",exact:true}).click();
  const loginDialog=page.getByRole("dialog");
  await loginDialog.getByLabel("校园账号").fill("20260001");
  await loginDialog.getByLabel("密码",{exact:true}).fill("Campus123!");
  await loginDialog.getByRole("button",{name:"登录",exact:true}).click();
  await loginDialog.waitFor({state:"hidden"});

  await check("B01","发布前展示用途、公开范围和保留边界",async()=>{
    await page.getByRole("button",{name:"发布信息",exact:true}).click();
    const notice=page.getByRole("region",{name:"发布信息用途与公开范围"});
    await notice.waitFor();const text=await notice.innerText();
    for(const word of ["用于","公开","描述","照片","撤回","保留"])assert.ok(text.includes(word),word);
    const noticeBox=await notice.boundingBox(),fieldBox=await page.getByLabel("物品名称").boundingBox();
    assert.ok(noticeBox && fieldBox && noticeBox.y<fieldBox.y,"告知必须位于首个输入前");
    await scan("publish-notice");
    await page.screenshot({path:resolve(out,"publish-notice.png"),fullPage:true});
  });
  await check("B02","新查询失败时不显示旧条件结果",async()=>{
    await page.goto(base);await search(titles[0]);
    await page.getByRole("button",{name:`查看详情：${titles[0]}`,exact:true}).waitFor();
    await page.route("**/api/items?*",async route=>{
      if(new URL(route.request().url()).searchParams.get("q")==="CSW不可达")
        await route.fulfill({status:503,json:{error:{code:"TEST_FAILURE",message:"测试查询暂不可用"}}});
      else await route.continue();
    });
    await search("CSW不可达");
    await page.getByRole("alert").filter({hasText:"测试查询暂不可用"}).waitFor();
    assert.equal(await page.locator("article.item-card").count(),0,"错误条件下不得复用旧卡片");
    await scan("list-error");
    await page.screenshot({path:resolve(out,"list-error.png"),fullPage:true});
  });
  await check("B03","列表可按相同条件显式重试",async()=>{
    await page.goto(base);let fail=true;
    await page.route("**/api/items?*",async route=>{
      if(fail && new URL(route.request().url()).searchParams.get("q")===titles[0])
        await route.fulfill({status:503,json:{error:{code:"TEST_FAILURE",message:"测试查询暂不可用"}}});
      else await route.continue();
    });
    await search(titles[0]);await page.getByRole("alert").filter({hasText:"测试查询暂不可用"}).waitFor();
    fail=false;await page.getByRole("button",{name:"重新加载列表",exact:true}).click();
    await page.getByRole("button",{name:`查看详情：${titles[0]}`,exact:true}).waitFor();
  });
  await check("B04","详情404不展示旧状态或认领表单",async()=>{
    await page.route(`**/api/items/${items[0].id}`,route=>route.fulfill({status:404,json:{error:{code:"NOT_FOUND",message:"物品不存在或不可见"}}}));
    await openFixture(items[0].id,titles[0]);
    const dialog=page.getByRole("dialog");await dialog.getByRole("alert").waitFor();
    assert.equal(await dialog.getByRole("heading",{name:titles[0],exact:true}).count(),0);
    assert.equal(await dialog.getByRole("textbox",{name:"认领证明"}).count(),0);
    await scan("detail-error");
    await page.screenshot({path:resolve(out,"detail-unavailable.png"),fullPage:true});
  });
  await check("B05","详情失败后重试读取最新数据",async()=>{
    let fail=true;
    await page.route(`**/api/items/${items[0].id}`,async route=>{
      if(fail)await route.fulfill({status:503,json:{error:{code:"TEST_FAILURE",message:"暂不可用"}}});else await route.continue();
    });
    await openFixture(items[0].id,titles[0]);const dialog=page.getByRole("dialog");
    await dialog.getByRole("alert").waitFor();fail=false;
    await dialog.getByRole("button",{name:"重试加载详情",exact:true}).click();
    await dialog.getByRole("heading",{name:titles[0],exact:true}).waitFor();
    await dialog.getByRole("textbox",{name:"认领证明"}).waitFor();
  });
  await check("B06","相关物品慢响应不得覆盖返回后的原物品",async()=>{
    await openFixture(items[0].id,titles[0]);const dialog=page.getByRole("dialog");
    await dialog.getByRole("heading",{name:titles[0],exact:true}).waitFor();
    let started:()=>void=()=>{};const requested=new Promise<boolean>(r=>{started=()=>r(true);});
    await page.route(`**/api/items/${items[1].id}`,async route=>{
      started();
      await new Promise(r=>setTimeout(r,600));await route.continue().catch(()=>{});
    });
    await dialog.locator(".match-list").getByRole("button").filter({hasText:titles[1]}).click();
    assert.ok(await Promise.race([requested,new Promise<boolean>(r=>setTimeout(()=>r(false),1000))]),"切换相关物品必须重新读取当前详情");
    assert.equal(await dialog.getByRole("textbox",{name:"认领证明"}).count(),0,"未读取当前物品时不得沿用旧认领表单");
    await dialog.getByRole("button",{name:"返回原物品",exact:true}).click();
    await dialog.getByRole("heading",{name:titles[0],exact:true}).waitFor();
    await page.waitForTimeout(750);
    assert.equal(await dialog.getByRole("heading",{name:titles[1],exact:true}).count(),0);
    assert.ok(await dialog.getByRole("heading",{name:titles[0],exact:true}).isVisible());
  });
  await check("B07","详情断网提供恢复入口并保留弹窗关闭能力",async()=>{
    await page.route(`**/api/items/${items[0].id}`,route=>route.abort("internetdisconnected"));
    await openFixture(items[0].id,titles[0]);const dialog=page.getByRole("dialog");
    await dialog.getByRole("alert").waitFor();
    assert.ok(await dialog.getByRole("button",{name:"重试加载详情",exact:true}).isVisible());
    await page.keyboard.press("Escape");await dialog.waitFor({state:"hidden"});
  });
  await check("B08","窄屏发布告知可读且没有横向溢出",async()=>{
    await page.setViewportSize({width:390,height:844});await page.goto(base+"#/publish");
    // Use the public navigation path if the application doesn't use a publish hash.
    if(!await page.getByRole("region",{name:"发布信息用途与公开范围"}).count()){
      const opener=page.getByRole("button",{name:"打开导航",exact:true});
      if(await opener.isVisible())await opener.click();
      await page.getByRole("button",{name:"发布信息",exact:true}).click();
    }
    await page.getByRole("region",{name:"发布信息用途与公开范围"}).waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
    await page.screenshot({path:resolve(out,"publish-mobile.png"),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
  });
} finally {
  writeFileSync(resolve(out,"report.json"),JSON.stringify(report,null,2));
  await browser.close();await vite.close();
  await new Promise<void>(r=>apiServer.close(()=>r()));app.close();
}
const failed=report.checks.filter(c=>!c.passed).length;
console.log(`F04–F06 checks: ${report.checks.length-failed}/${report.checks.length}; ${failed} failed`);
if(failed)process.exitCode=1;
