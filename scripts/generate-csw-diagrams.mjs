/** Rebuild editable SVG + Chinese PNG engineering diagrams; no new dependencies. */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "docs/csw/diagrams");
mkdirSync(out, { recursive: true });
const C = { ink: "#183335", green: "#136B58", pale: "#E5F0E9", gray: "#5D6D73", line: "#A7B8B9", bg: "#F5F7F9", orange: "#924B17" };
const esc = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = (x, y, lines, opt = {}) => {
  const list = Array.isArray(lines) ? lines : [lines];
  return `<text x="${x}" y="${y}" fill="${opt.color || C.ink}" font-size="${opt.size || 24}" font-weight="${opt.bold ? 700 : 400}" text-anchor="${opt.anchor || "start"}">${list.map((t, i) => `<tspan x="${x}" dy="${i ? opt.leading || 35 : 0}">${esc(t)}</tspan>`).join("")}</text>`;
};
const rect = (x,y,w,h,opt={}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opt.rx ?? 12}" fill="${opt.fill || "#FFF"}" stroke="${opt.stroke || C.green}" stroke-width="${opt.strokeWidth || 2}" ${opt.dash ? 'stroke-dasharray="10 7"' : ""}/>`;
const path = (d,opt={}) => `<path d="${d}" fill="none" stroke="${opt.color || C.green}" stroke-width="${opt.width || 2.3}" ${opt.dash ? 'stroke-dasharray="9 7"' : ""} ${opt.arrow === false ? "" : `marker-end="url(#${opt.open ? "open" : "arrow"})"`}/>`;
const line = (x1,y1,x2,y2,opt={}) => path(`M ${x1} ${y1} L ${x2} ${y2}`, opt);
const dot = (x,y,r=9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.ink}"/>`;
const node = (x,y,w,h,title,lines=[],opt={}) => rect(x,y,w,h,opt) + text(x+w/2,y+36,title,{anchor:"middle",bold:true,size:opt.titleSize || 25}) + text(x+20,y+73,lines,{size:opt.size || 22,leading:31});
const ellipse = (cx,cy,rx,ry,lines,opt={}) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${opt.fill || C.pale}" stroke="${opt.stroke || C.green}" stroke-width="2"/>` + text(cx, cy-(Array.isArray(lines) && lines.length>1 ? 8: -8),lines,{anchor:"middle",size:23,leading:32,bold:!opt.secondary});
function actor(x,y,label){return `<circle cx="${x}" cy="${y}" r="18" fill="#FFF" stroke="${C.ink}" stroke-width="2.5"/>`+path(`M${x} ${y+18}v65 M${x-36} ${y+42}h72 M${x} ${y+83}l-32 48 M${x} ${y+83}l32 48`,{arrow:false,color:C.ink})+text(x,y+169,label,{anchor:"middle",size:24,bold:true});}
function frame(title, subtitle, body, foot){return `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1040" viewBox="0 0 1440 1040" role="img" aria-label="${esc(title)}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${C.green}"/></marker><marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="${C.green}" stroke-width="1.5"/></marker></defs><style>text{font-family:'Microsoft YaHei','SimHei',Arial,sans-serif}*{box-sizing:border-box}</style><rect width="1440" height="1040" fill="${C.bg}"/>${text(48,65,title,{size:36,bold:true})}${text(48,108,subtitle,{size:22,color:C.gray})}${body}${line(48,967,1392,967,{arrow:false,color:C.line})}${text(48,1009,foot,{size:20,color:C.gray})}</svg>`;}
const figures = [];
function add(id,title,subtitle,body,foot){figures.push({id,title,svg:frame(title,subtitle,body,foot)});}

// 01: Actors and use cases, with integration cases visually separated.
{
  let b=rect(275,150,940,740,{stroke:C.line})+text(300,187,"校园失物招领系统 · F04—F06 与必要集成",{size:24,bold:true});
  b+=actor(110,230,"访客")+actor(110,570,"校园用户")+actor(1320,285,"管理员");
  b+=ellipse(615,285,195,55,["F05 检索、分页", "与详情浏览"])+ellipse(615,440,195,55,["F04 寻物 / 招领发布"])+ellipse(615,595,195,55,["F06 本人编辑"])+ellipse(615,750,195,55,["F06 本人撤回"]);
  b+=ellipse(1005,285,155,55,["F10 审核 / 下架", "gbl 既有模块"],{fill:"#F0F2F4",secondary:true,stroke:C.line});
  b+=ellipse(1005,475,155,55,["F07 申请认领", "stt 既有模块"],{fill:"#F0F2F4",secondary:true,stroke:C.line});
  b+=ellipse(1005,750,155,55,["二次确认撤回"],{fill:"#FFF",secondary:true});
  b+=line(145,285,420,285,{arrow:false})+path("M145 640 L230 640 L230 285 L420 285",{arrow:false});
  b+=path("M145 650 L250 650 L250 440 L420 440",{arrow:false})+line(145,665,420,595,{arrow:false})+line(145,695,420,750,{arrow:false});
  b+=line(1280,340,1160,285,{arrow:false})+path("M145 630 L250 630 L250 365 L1005 365 L1005 420",{arrow:false,color:C.gray});
  b+=line(810,750,850,750,{dash:true,open:true})+text(812,710,"«include»",{size:20});
  b+=text(315,849,"前置条件：发布、认领及本人维护需要登录；编辑 / 撤回须满足所有权与状态约束。",{size:21});
  add("01-use-cases","图 1  用例与协作边界","绿色：csw 负责的功能；灰色：其他成员接口。本轮改进不重新认领既有贡献。",b,"用例视图 · 撤回确认由现有个人中心触发；F10 / F07 仅作为集成关系出现。");
}

// 02: Conceptual classes, not JavaScript runtime classes.
{
  let b=node(65,250,320,250,"User · 校园用户",["id、昵称、角色", "拥有发布记录", "可作为认领申请人", "身份来自服务端会话"]);
  b+=node(550,210,410,370,"Item · 物品信息",["id、ownerId", "type：lost / found", "标题、类别、时间、地点", "描述、图片、校区", "status：生命周期", "reviewStatus：审核状态", "两维状态分别维护"]);
  b+=node(1120,250,270,280,"Claim · 认领申请",["id、itemId", "applicantId、ownerId", "认领证明与处理状态", "申请与物品信息分离"]);
  b+=line(65,298,385,298,{arrow:false,color:C.line})+line(550,258,960,258,{arrow:false,color:C.line})+line(1120,298,1390,298,{arrow:false,color:C.line});
  b+=line(385,350,550,350,{arrow:false})+text(423,320,"发布",{size:23})+text(398,385,"1",{size:22})+text(490,385,"0..*",{size:22});
  b+=line(960,350,1120,350,{arrow:false})+text(995,320,"关联",{size:23})+text(976,385,"1",{size:22})+text(1065,385,"0..*",{size:22});
  b+=path("M225 500 L225 700 L1255 700 L1255 530",{arrow:false})+text(590,683,"申请：User 1  ↔  Claim 0..*",{size:23});
  b+=node(65,785,1325,125,"业务不变量",["同物品最多一笔有效完成；活跃认领阻止编辑 / 撤回；公开数据必须通过审核且未撤回。"],{fill:C.pale});
  add("02-domain-model","图 2  OOA 领域概念类图","概念关联与多重性用于分析业务；不表示源码中存在 User / Item / Claim 运行时类。",b,"概念模型 · 实际载体是 TypeScript interface、函数组件、路由与 SQLite 关系表。");
}

// 03: Real implementation dependencies with honest stereotypes.
{
  let b=rect(40,165,870,745,{stroke:C.line})+text(65,204,"浏览器 / React",{size:23,bold:true})+rect(970,165,430,745,{stroke:C.line})+text(995,204,"服务端 / Express + SQLite",{size:23,bold:true});
  b+=node(75,240,330,105,"App · 函数组件",["导航、editing 与回调交接"],{titleSize:24,size:20});
  b+=node(75,415,330,120,"Explore · 函数组件",["列表、选中 ID、ItemDetail", "加载 / 失败 / 重试"],{titleSize:24,size:20});
  b+=node(75,615,330,120,"Publish · 函数组件",["用途告知与表单状态", "POST / PATCH"],{titleSize:24,size:20});
  b+=node(535,420,320,130,"«module» api/client.ts",["api<T>、post、patch", "请求、会话头与错误转换"],{titleSize:22,size:20});
  b+=node(535,240,320,115,"«interface» shared/types",["Item / ItemInput / ItemPage", "仅编译期类型，无运行时类"],{titleSize:21,size:20,fill:C.pale});
  b+=node(1010,420,350,130,"registerItemRoutes()",["«function» GET / POST / PATCH", "validateItem 与本人权限"],{titleSize:23,size:20});
  b+=node(1010,615,350,110,"«module» common.ts",["身份、可见性、活跃认领检查"],{titleSize:22,size:20});
  b+=node(1010,790,350,95,"«database» SQLite",["items · users · claims"],{titleSize:22,size:20});
  b+=line(240,345,240,415)+path("M120 345 L120 380 L50 380 L50 675 L75 675");
  b+=line(405,470,535,470)+path("M405 675 L475 675 L475 515 L535 515")+line(855,485,1010,485)+text(882,453,"HTTP",{size:21});
  b+=line(405,455,535,300,{dash:true,open:true})+path("M405 655 L450 585 L600 355",{dash:true,open:true})+line(1085,420,855,300,{dash:true,open:true});
  b+=line(1180,550,1180,615,{dash:true,open:true})+path("M1360 515 L1380 515 L1380 840 L1360 840");
  b+=text(80,811,["集成：Profile（xzh 既有）提供编辑 / 撤回入口；", "F07 认领与 F10 审核继续由对应模块负责。"],{size:22,color:C.gray});
  add("03-implementation-dependencies","图 3  OOD 实际组件与模块依赖","实线为调用 / 渲染依赖；虚线为类型或辅助模块依赖。未新增 API、运行时类或数据库表。",b,"设计模型 · 类型接口描述数据形状；组件管理界面状态；业务不变量由服务端最终校验。");
}

function lifeline(x,title,body=[],end=880){return node(x-140,165,280,100,title,body,{titleSize:22,size:18})+line(x,265,x,end,{dash:true,arrow:false,color:C.line});}
function message(x1,x2,y,label,opt={}){return line(x1,y,x2,y,opt)+text((x1+x2)/2,y-15,label,{anchor:"middle",size:opt.size || 22});}
// 04: Posting with server authorization and validation.
{
  let b=lifeline(175,"校园用户")+lifeline(520,"Publish 函数组件")+lifeline(875,"API / items 路由")+lifeline(1230,"SQLite");
  b+=message(175,520,325,"阅读告知、填写并提交");
  b+=message(520,875,405,"POST /items + ItemInput");
  b+=rect(745,440,260,76,{fill:C.pale})+text(875,471,["requireUser", "validateItem"],{anchor:"middle",size:21,leading:27});
  b+=message(875,1230,560,"INSERT：active + pending");
  b+=message(1230,875,635,"已保存 Item",{dash:true,open:true});
  b+=message(875,520,705,"201 Item（待审核）",{dash:true,open:true});
  b+=message(520,175,790,"onDone：进入本人发布记录",{dash:true,open:true,size:21});
  b+=rect(70,870,1300,62,{stroke:C.line,fill:"#FFF"})+text(95,909,"异常：未登录 / 输入无效 → 401 / 400 + 错误说明；界面保留表单，服务端拒绝写入。",{size:23});
  add("04-publish-sequence","图 4  F04 发布成功与验证边界序列","前端说明用途并约束输入；服务端从会话获取身份，创建记录后仍须由 gbl 的 F10 审核。",b,"序列视图 · 图中 API 合并表示现有请求客户端与服务端边界；管理员审核不是发布接口自动完成。");
}

// 05: Error/retry sequence; old snapshots are not used as authoritative data.
{
  let b=lifeline(210,"校园用户",[],920)+lifeline(700,"ItemDetail 函数组件",[],920)+lifeline(1210,"GET /items/:id",[],920);
  b+=message(210,700,315,"选择物品 ID");
  b+=message(700,1210,385,"清空旧 current；发起详情请求");
  b+=message(1210,700,465,"404 / 网络失败",{dash:true,open:true});
  b+=message(700,210,540,"聚焦错误；隐藏旧详情与认领表单",{dash:true,open:true,size:21});
  b+=message(210,700,615,"点击“重试加载详情”");
  b+=message(700,1210,690,"相同 selectedId，再次 GET");
  b+=message(1210,700,765,"返回当前有效 Item",{dash:true,open:true});
  b+=message(700,210,845,"成功态渲染；满足条件才开放认领",{dash:true,open:true,size:21});
  add("05-detail-retry-sequence","图 5  F05 详情异常与同物品重试序列","卡片 / 推荐只提供选中标识。每次选择、返回、重试均重新读取；失败不能退回旧快照。",b,"并发保护 · effect 清理时 abort；alive 检查阻止过时响应更新状态。推荐请求仅在详情成功后发起。");
}

// 06: Orthogonal lifecycle and review regions; neither is a substitute for the other.
{
  let b=rect(45,165,1350,745,{stroke:C.line})+text(70,209,"Item 的两个正交状态维度",{size:25,bold:true})+line(710,235,710,860,{dash:true,arrow:false,color:C.line});
  b+=text(85,265,"status · 生命周期",{size:26,bold:true})+text(755,265,"reviewStatus · 审核状态",{size:26,bold:true});
  b+=dot(360,305)+line(360,315,360,350)+node(225,350,270,100,"active",["仍在寻找 / 招领"],{fill:C.pale});
  b+=node(85,675,235,100,"withdrawn",["发布者撤回"])+node(420,675,235,100,"claimed",["认领完成 / 已归还"]);
  b+=path("M285 450 L205 585 L205 675")+text(75,535,["F06 本人撤回", "无进行中认领"],{size:22});
  b+=path("M430 450 L540 585 L540 675")+text(425,535,["F07 完成交接", "stt 既有流程"],{size:22});
  b+=text(88,839,["撤回不物理删除；当前没有本人恢复入口。", "两种终态均拒绝本人继续编辑 / 撤回。"],{size:21,color:C.gray,leading:30});
  b+=dot(1045,305)+line(1045,315,1045,350)+node(910,350,270,100,"pending",["发布或编辑后待审核"],{fill:C.pale});
  b+=node(785,675,230,100,"approved",["管理员批准"])+node(1110,675,230,100,"rejected",["驳回 / 下架"]);
  b+=path("M995 450 L900 585 L900 675")+text(790,535,"F10 批准",{size:22});
  b+=path("M1100 450 L1225 585 L1225 675")+text(1160,535,"F10 驳回",{size:22});
  b+=path("M785 715 L752 715 L752 400 L910 400")+text(778,615,"编辑 → 重审",{size:20,color:C.gray});
  b+=path("M1340 715 L1370 715 L1370 400 L1180 400")+text(1175,615,"编辑 → 重审",{size:20,color:C.gray});
  b+=line(1015,725,1110,725)+text(1065,810,"F10 下架",{anchor:"middle",size:20,color:C.gray});
  b+=text(755,839,["公开：approved 且 status ≠ withdrawn。", "仍需单独检查认领类型与生命周期。"],{size:21,color:C.gray,leading:30});
  add("06-item-state-dimensions","图 6  生命周期与审核的两维状态机","type（lost / found）是信息类型；此图概括主要转移，未穷尽管理员复核与状态自环。",b,"图示范围 · F10 治理和 F07 认领均沿用既有模块；带认领 / 终态限制由服务端校验，不由前端单独保证。");
}

// 07: List state activity with an explicit retry loop.
{
  let b=dot(720,180)+line(720,190,720,225)+node(510,225,420,90,"输入 / 筛选 / 翻页 / 重试",["保持当前查询参数"]);
  b+=line(720,315,720,360)+node(510,360,420,90,"清空旧结果，进入 loading",["新请求携带 AbortSignal"]);
  b+=line(720,450,720,495)+node(510,495,420,80,"GET /items?查询参数");
  b+=line(720,575,720,610)+`<polygon points="720,610 820,665 720,720 620,665" fill="${C.pale}" stroke="${C.green}" stroke-width="2"/>`+text(720,674,"请求成功？",{anchor:"middle",size:23});
  b+=path("M620 665 L280 665 L280 745")+text(470,643,"否",{size:24})+node(85,745,390,100,"失败：显示可读错误",["无旧卡片；提供同条件重试"]);
  b+=path("M820 665 L1120 665 L1120 745")+text(955,643,"是",{size:24})+node(935,745,390,100,"成功：渲染本次结果",["卡片 / 分页，或空结果提示"]);
  b+=path("M85 795 L55 795 L55 270 L510 270")+text(75,390,["用户点击", "重新加载列表"],{size:23});
  b+=line(1120,845,1120,895)+`<circle cx="1120" cy="909" r="14" fill="none" stroke="${C.ink}" stroke-width="2"/>`+dot(1120,909,8);
  b+=node(1010,275,360,165,"过时请求清理",["筛选 / 页码变化或卸载", "alive=false + abort()", "晚到结果不能替换新查询"],{fill:"#FFF",stroke:C.line,size:20,titleSize:23});
  add("07-list-activity","图 7  F05 查询、失败与恢复活动图","可恢复失败是一条正常交互路径；明确的重试触发量让相同参数也能再次请求。",b,"活动视图 · 未实现自动重试、退避或网络超时策略；本图不代表已完成真实弱网性能验收。");
}

const chrome = [process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(p => p && existsSync(p));
if (!chrome) throw new Error("请设置 CHROME_PATH 指向本机 Chrome / Edge。");
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width:1440, height:1040 }, deviceScaleFactor:1.5 });
  for (const f of figures) {
    writeFileSync(resolve(out, `${f.id}.svg`), f.svg, "utf8");
    await page.setContent(`<style>html,body{margin:0;padding:0;background:#F5F7F9}</style>${f.svg}`);
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.locator("svg text").evaluateAll(nodes => nodes.filter(n => { const b=n.getBBox(); return b.x<0 || b.y<0 || b.x+b.width>1440 || b.y+b.height>1040; }).map(n => n.textContent));
    if (overflow.length) throw new Error(`${f.id} text outside canvas: ${overflow.join(" | ")}`);
    await page.locator("svg").screenshot({ path:resolve(out,`${f.id}.png`) });
    checks.push({id:f.id,title:f.title,svg:`${f.id}.svg`,png:`${f.id}.png`,canvasOverflow:overflow.length});
    console.log(`Rendered ${f.id}: editable SVG + 2160x1560 PNG`);
  }
  writeFileSync(resolve(out,"manifest.json"),JSON.stringify({generatedAt:new Date().toISOString(),runtime:process.version,browser:browser.version(),font:"Microsoft YaHei, SimHei, Arial",scope:"Engineering/UML-style views; concept classes are not runtime classes",checks},null,2));
} finally { await browser.close(); }
