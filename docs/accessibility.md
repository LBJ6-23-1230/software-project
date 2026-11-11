# 视障友好适配说明与测试记录

- 项目：拾光校园 · 校园失物招领系统（xzh 用户管理 F01–F03 所属课程项目）
- 适配副本：`xzh2`（原 `xzh` 目录未改动）
- 版本：0.1.1
- 日期：2026-11-02
- 对应任务：揭榜任务二「视障友好适配任务书」

## 1. 项目平台与适配口径

本项目是 **Web 应用**（React 19 + TypeScript + Vite），在 Windows 的浏览器中运行，不是原生 WinForms/WPF 或 Android 工程。因此本次按 **WCAG 2.1 AA + WAI-ARIA 1.2** 做适配，并把任务书中 Windows 桌面项目的要求对应到浏览器：

| 任务书要求 | 本项目的落地方式 |
| --- | --- |
| 控件有无障碍名称、角色、状态，屏幕阅读器可识别 | 原生 HTML 语义 + ARIA 名称/角色/状态；表单错误 `role="alert"`；装饰图标 `aria-hidden` |
| 所有功能可用键盘完整操作，焦点顺序合理 | 跳转链接、原生按钮/输入、弹窗与抽屉焦点锁定、焦点归还、路由焦点管理 |
| 支持系统高对比度模式 | `forced-colors: active`（Windows 高对比度的浏览器映射）+ `prefers-contrast: more`；选中态增加非颜色线索 |
| 原有功能可用、完整、不中断 | 19 项自动化回归测试、生产构建、端到端业务冒烟测试 |

本次**没有新增任何业务功能**：路由、接口、数据库、权限与状态机均未改变；修改集中在语义属性、焦点管理、提示播报与样式。

## 2. 对照任务要求的修改

### 2.1 控件名称、角色、状态

| 位置 | 改造内容 | 主要文件 |
| --- | --- | --- |
| 全局图标 | 所有 Lucide 图标统一包一层 `aria-hidden="true" focusable="false"`，避免屏幕阅读器把无名 SVG 读成“图形”或重复朗读 | `src/components/icons.tsx` |
| 侧边导航 | `<nav aria-label="主导航">`；当前页 `aria-current="page"`；移动端按钮补 `aria-controls="app-sidebar"`；品牌链接不再用与可见文字不一致的 `aria-label` | `src/App.tsx` |
| 页面标题 | 每个路由设置 `document.title`（如“个人中心 · 拾光校园”） | `src/App.tsx` |
| 物品卡片 | 由 `<button>` 整卡改为 `<article aria-labelledby>` + `<h3>` + “查看详情”按钮；按钮名带物品标题；图片改为装饰性 `alt=""`，标题不再重复朗读 | `src/modules/items/Explore.tsx` |
| 搜索与筛选 | 搜索区 `role="search"`；类型/分类筛选分别用带名称的 `role="group"`；筛选按钮用 `aria-pressed` 暴露选中状态；搜索结果通过 `role="status"` 播报“共找到 N 条信息” | `src/modules/items/Explore.tsx` |
| 个人中心 | 视图按钮组 `role="group" aria-label="个人中心视图"` + `aria-pressed`；编辑/撤回按钮的 `aria-label` 带物品标题 | `src/modules/users/Users.tsx` |
| 认领列表 | 列表区域可命名；当前认领行 `aria-current="true"`；筛选按钮 `aria-pressed`；点击认领行后焦点移到详情标题 | `src/modules/claims/Claims.tsx` |
| 认领进度 | `role="list" aria-label="认领进度"`，三步为 `role="listitem"`，当前步骤 `aria-current="step"` | `src/modules/claims/Claims.tsx` |
| 站内消息 | 消息区 `role="log" aria-label="站内消息" aria-live="polite" aria-relevant="additions"`；消息时间使用 `<time datetime>` | `src/modules/claims/Claims.tsx` |
| 审核表格 | 表格增加 `<caption class="sr-only">物品审核列表</caption>`；表头 `scope="col"`；重复的“通过/驳回/下架”按钮 `aria-label` 带物品标题；横向滚动容器可聚焦并有区域名 | `src/modules/admin/Admin.tsx` |
| 弹窗 | `role="dialog" aria-modal="true" aria-labelledby`；`aria-label="关闭窗口"`；弹窗打开时给 `#root` 加 `inert`，屏幕阅读器无法再浏览背景内容；关闭后恢复 | `src/components/ui.tsx` |
| 表单 | 原生 `label` 关联、`required` 保留；必填星号 `aria-hidden`；描述计数、图片格式提示、认领证明提示用 `aria-describedby` 关联；服务端错误 `role="alert"` 并聚焦错误信息 | `Publish.tsx`、`Users.tsx`、`Claims.tsx`、`Admin.tsx`、`ui.tsx` |
| 状态与空态 | 状态文本保留可见文字，图标隐藏；空态 `role="status"`；加载态 `role="status"` | `src/components/ui.tsx` |

### 2.2 键盘操作与焦点

| 改造 | 行为 |
| --- | --- |
| 跳到主要内容 | 页面第一个 Tab 焦点是“跳到主要内容”，回车后焦点到 `main#main-content`，且不改变 SPA 哈希路由 |
| 路由切换 | 焦点移到新页面 `h1`，同时更新 `document.title`，并用 `role="status"` 播报“已切换到 X 页面” |
| 弹窗 | 打开后焦点进入弹窗；Tab/Shift+Tab 在弹窗内循环；Esc 关闭；关闭后焦点回到触发按钮；背景 `inert` |
| 移动端抽屉 | 打开后焦点进入侧栏；Tab 循环；Esc 关闭；关闭后焦点回到“打开导航”按钮 |
| 物品卡片 | Tab 到“查看详情”按钮，回车打开详情；Esc 关闭后焦点回到该按钮 |
| 认领详情 | 用键盘选择认领记录后，焦点移到详情标题，便于立即读取标题与状态 |
| 审核表格 | 窄屏下表格容器可 Tab 聚焦，可用方向键/Shift+滚轮横向查看 |
| 触控目标 | 按钮/输入统一最小 40×40 px；焦点环 3 px，`prefers-contrast: more` 下 4 px |

登录成功还有一个焦点兜底：从“登录后继续”空态登录时，原触发按钮会被卸载，此时焦点会移到登录后页面的一级标题，不会丢到 `body`。

### 2.3 高对比度与低视力

- **系统强制颜色**（Windows 高对比度的浏览器行为）：`@media (forced-colors: active)` 下用 `CanvasText` 为按钮、面板、输入、状态、卡片补边框，选中/当前项用 `Highlight` 轮廓；装饰性首屏插画隐藏，减少干扰。
- **更多对比度**：`@media (prefers-contrast: more)` 下同时覆盖浅色/深色主题的 `--muted`、`--border`、`--control-border` 等变量，边框加粗到 2 px，焦点环 4 px。
- **选中态非颜色线索**：当前导航增加左侧内阴影；分段筛选与类型选择增加绿色边框；认领行保留左边框；标签页保留下划线。
- **深色主题**：正文/辅助文字与背景对比度由 axe 在深色上下文复核，0 违规。
- **缩放与文本间距**：在 720×450 等效视口（约 200% 缩放）和“行高 1.5 / 字距 0.12em / 词距 0.16em / 段距 2em”覆盖下检查，文档宽度未超过视口。

### 2.4 原功能保持

没有改动任何 API、数据库表、权限判断或认领状态机。`npm run test:smoke` 用真实浏览器走通：发布 → 管理员审核 → 公开搜索 → 详情 → 认领申请 → 站内消息 → 发布者核验通过。

## 3. 主要修改文件

| 文件 | 说明 |
| --- | --- |
| `src/components/icons.tsx` | 新增：装饰图标统一无障碍包装 |
| `src/components/ui.tsx` | 弹窗 portal + 背景 inert、错误聚焦、加载/空态语义、标题可聚焦 |
| `src/App.tsx` | 跳转链接、路由焦点/标题/播报、导航语义、登录焦点兜底 |
| `src/modules/items/Explore.tsx` | 卡片语义化、搜索/筛选状态、结果播报、分页、详情表单 |
| `src/modules/items/Publish.tsx` | 类型选择状态、必填星号、字段描述、图片输入名称、错误聚焦 |
| `src/modules/users/Users.tsx` | 登录弹窗表单、演示账号组、个人中心视图、资料表单、撤回弹窗 |
| `src/modules/claims/Claims.tsx` | 认领筛选/当前项、进度列表、消息 log、焦点转移、表单错误 |
| `src/modules/admin/Admin.tsx` | 管理视图状态、表格 caption/scope、重复操作名称、备份列表时间 |
| `src/styles.css` | `.sr-only`、跳转链接、卡片整卡点击、焦点、强制颜色/更多对比度 |
| `scripts/a11y-audit.mjs` | 新增：axe + 键盘/焦点/高对比度自动审计 |
| `scripts/smoke-test.mjs` | 新增：原有业务端到端冒烟 |

## 4. 验证环境与方法

- 系统：Windows，Node.js **v26.3.0**，npm **11.16.0**
- 浏览器：本机 Google Chrome **156.0.8078.74**（headless，Playwright `playwright-core@1.64.1` 驱动）
- 规则引擎：**axe-core 4.14.0**，规则标签 `wcag2a / wcag2aa / wcag21a / wcag21aa / wcag22aa`
- 审计脚本：`scripts/a11y-audit.mjs`，同时检查 Chromium accessibility tree（`ariaSnapshot`）、键盘焦点、弹窗/抽屉焦点循环、系统颜色/对比度媒体查询、200% 缩放与文本间距。
- 审计页面：广场（浅色/深色/更多对比度/强制颜色）、登录弹窗、物品详情弹窗、个人中心、发布页、认领页、管理工作台、390px 移动端抽屉，共 **10 次 axe 扫描 + 28 项交互检查**。

## 5. 实际结果

### 5.1 改造前后对比

| 指标 | 改造前（xzh2 初始副本） | 改造后 |
| --- | --- | --- |
| axe WCAG 违规节点 | 9 次扫描，每次 1 个（品牌链接 `label-content-name-mismatch`） | **10 次扫描，0 个** |
| 交互检查 | 10/28 通过 | **28/28 通过** |
| 服务端回归测试 | 19/19 | **19/19** |
| 生产构建 | 通过 | **通过** |
| 原有业务冒烟 | — | **6/6 步骤通过** |

改造前基线报告保存在 `reports/a11y-baseline-2026-11-02/report.json`，改造后报告在 `reports/a11y-after-2026-11-02/report.json`。

### 5.2 复现命令与输出

```powershell
npm run build
# tsc --noEmit && vite build
# ✓ 1589 modules transformed，退出码 0

npm start          # 另开终端，http://127.0.0.1:4318
npm run test:a11y
# 合计：10 次 axe 扫描，0 个违规节点；28/28 项交互检查通过。退出码 0

npm test
# tests 19 / pass 19 / fail 0，退出码 0

npm run test:smoke
# ✔ 发布信息并进入待审核列表
# ✔ 管理员审核通过
# ✔ 公开搜索与详情打开正常
# ✔ 提交认领申请
# ✔ 申请人发送站内消息
# ✔ 发布者核验通过，认领进入等待交接
```

### 5.3 28 项交互检查明细

- 首个 Tab 到“跳到主要内容”，回车聚焦主内容且不改变路由
- 主导航/主内容地标可命名，当前导航 `aria-current=page`
- 搜索框名称、筛选项组名称、筛选 `aria-pressed`
- 卡片 `article` + `h3` + 详情按钮；键盘打开详情、Esc 关闭并归还焦点
- 登录弹窗名称/模态/关闭按钮；背景 `inert`；Tab 循环；Esc 归还焦点；必填项；登录播报
- 路由切换焦点落到 `h1`；文档标题更新；个人中心视图 `aria-pressed`
- 发布表单全部控件名称、必填项、图片输入名称、星号隐藏
- 认领 `log` 语义、当前项 `aria-current`、进度列表 3 项
- 管理表格名称/表头/重复操作名称、管理视图 `aria-pressed`
- 深色主题生效；`prefers-contrast: more` 生效；强制颜色下焦点与边框可见
- `prefers-reduced-motion` 下过渡/动画时长 ≤ 0.02s
- 200% 缩放与文本间距覆盖无横向溢出
- 390px 视口无横向溢出；移动抽屉焦点循环、Esc 关闭、焦点归还

### 5.4 可访问树抽查（广场）

```text
- link "跳到主要内容"
- complementary "侧边栏"
  - navigation "主导航"
    - button "拾光广场"  (aria-current=page)
- main
  - region "总有一份善意， 让失物回到你身边。"
  - group "校园互助数据"
  - region "校园失物动态"
    - search "搜索物品"
    - group "信息类型"
      - button "全部信息" [pressed]
    - status: 共找到 10 条信息
    - article "南湖图书馆拾到一把蓝色雨伞"
      - heading "南湖图书馆拾到一把蓝色雨伞" [level=3]
      - button "查看详情：南湖图书馆拾到一把蓝色雨伞"
```

## 6. 已知限制

- 本项目是 Web 应用，不是原生 Windows 桌面或 Android 工程；本记录不声称完成 WinForms/WPF/UIA 或 Android TalkBack 适配。
- 未进行真实 NVDA/Narrator/TalkBack 人工听读；使用 Chromium accessibility tree、axe-core 与键盘自动化作为可复现证据。建议验收时再用 NVDA 抽查登录、发布、认领三条主流程。
- Windows 高对比度使用 Chromium `forced-colors` 模拟，未在真实 Windows 高对比度主题下逐项截图。
- axe 对首屏装饰插画（`aria-hidden`）仍会给出 `color-contrast` “incomplete”（无法确定图片上的文字背景），不是违规；该区域对辅助技术隐藏。
- 服务端错误仍是请求级消息，通过 `role="alert"` 整体播报，未细分为字段级 `aria-invalid`；浏览器原生 `required/minLength/pattern` 覆盖客户端字段校验。
- 未覆盖 Safari/Firefox、语音控制、屏幕放大软件与真实移动设备。
- 测试脚本需要本机 Chrome/Edge 和正在运行的服务；CI 未配置。

## 7. 相关文件

- 审计脚本：[`scripts/a11y-audit.mjs`](../scripts/a11y-audit.mjs)
- 业务冒烟：[`scripts/smoke-test.mjs`](../scripts/smoke-test.mjs)
- 改造前报告：[`reports/a11y-baseline-2026-11-02/report.json`](../reports/a11y-baseline-2026-11-02/report.json)
- 改造后报告：[`reports/a11y-after-2026-11-02/report.json`](../reports/a11y-after-2026-11-02/report.json)
- 提交用主贴草稿：[`docs/submission-post.md`](submission-post.md)
