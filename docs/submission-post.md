# 课程平台揭榜主贴草稿

> 主贴标题统一格式：**揭榜适配-姓名-视障友好适配**。发布前填写本人姓名，并按本人实际理解、修改和验证情况补充个人贡献；本草稿不冒用 xzh/csw/stt/gbl 任一成员身份。本轮只更新仓库草稿，未代发课程平台。

## 标题

揭榜适配-姓名-视障友好适配

## 正文

**项目**：拾光校园 · 校园失物招领系统

**适配版本**：0.2.1（2026-11-11，基于四分支汇总版 0.2.0 增量优化）

**仓库**：[software-project](https://github.com/LBJ6-23-1230/software-project)

**说明文档**：[无障碍适配与测试记录](https://github.com/LBJ6-23-1230/software-project/blob/main/docs/accessibility.md)

### 一、适配说明

本项目是 React + TypeScript 的 Web 应用，在 Windows 的 Chrome/Edge 中运行，并非原生 Windows 桌面工程。采用 HTML/ARIA、WCAG 检查与 Windows 浏览器强制颜色支持来落实任务书的名称/角色/状态、键盘焦点、高对比度与原功能保持要求；是否符合任务书的平台口径，需由任课教师确认。

本次只优化已有界面和交互，**没有新增业务功能**，后端 API、数据库契约、权限与认领状态机均未改变。沿用 xzh 用户管理 F01–F03、csw 发布浏览 F04–F06、stt 认领沟通 F07–F09、gbl 系统管理 F10–F12 的分类。该分类是课程责任边界，不证明本轮代码由各成员独立完成。

1. **名称、角色、状态与错误关联**
   - 保留既有导航、卡片、表格、进度与消息语义。
   - 表单使用原生必填/格式/长度约束，失败后聚焦可读错误汇总；链接支持键盘跳到对应字段。
   - 字段通过 `aria-invalid` 标识错误，`aria-describedby` 同时关联错误和原提示；修正输入后移除过期错误。
   - 请求级失败仍由 `role="alert"` 整体解释，不把“账号或密码错误”武断归因到某一个字段。
   - 选择图片后格式说明保持可访问，上传区域有键盘焦点环。

2. **键盘操作与模态隔离**
   - 保留跳到主要内容、路由标题/焦点和弹窗焦点循环。
   - 修复叠加弹窗的一次 Escape 关闭两层问题，仅顶层处理键盘；下层和页面 `inert`，逐层关闭恢复焦点，最终恢复原滚动状态。
   - 移动导航打开期间隔离主体，暴露有名称模态，关闭后恢复主体与触发按钮焦点。
   - 使用 Chromium 实际可访问树检查背景隔离，不只依赖 DOM 快照。

3. **高对比度与原功能保持**
   - 保留 `forced-colors`、`prefers-contrast`、深色主题及非颜色选中线索；补充错误与上传焦点样式。
   - 原业务流程在普通及浏览器强制颜色模式下分别通过六步冒烟。
   - 修正冒烟脚本的异步状态读取时序，等待“等待交接”真正可见后断言，不改业务逻辑来迁就测试。

### 二、测试记录

环境：Windows、Node.js v24.16.0、Chrome 157.0.8103.39、axe-core 4.14.0。使用独立演示数据库，不修改原日常数据库。

| 检查 | 命令 | 实际结果 |
| --- | --- | --- |
| 无障碍规则与原交互 | `npm.cmd run test:a11y` | 10 次 axe 扫描 0 违规节点；28/28 项交互检查通过 |
| 新增边界回归 | `npm.cmd run test:a11y:regression` | 15/15 通过；同组用例在旧版 0.2.0 为 3/15 |
| 原自动化回归 | `npm.cmd test` | 25/25 通过 |
| 生产构建 | `npm.cmd run build` | TypeScript + Vite 构建通过 |
| 原业务冒烟 | `npm.cmd run test:smoke` | 普通及强制颜色模式各 6/6：发布、审核、搜索/详情、认领、消息、发布者核验 |

证据：[本轮验证摘要](https://github.com/LBJ6-23-1230/software-project/blob/main/docs/verification-0.2.1-2026-11-11.md)、[规则与交互报告](https://github.com/LBJ6-23-1230/software-project/blob/main/reports/a11y-0.2.1-2026-11-11/report.json)、[新增回归与截图](https://github.com/LBJ6-23-1230/software-project/tree/main/reports/a11y-regression-2026-11-11)。

### 三、复现方式

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run test:a11y:regression # 自启隔离服务
npm.cmd start                  # 以下命令在另一终端，对演示数据运行
npm.cmd run test:a11y
npm.cmd run test:smoke
$env:SMOKE_FORCED_COLORS='active'
npm.cmd run test:smoke
Remove-Item Env:SMOKE_FORCED_COLORS
```

默认服务地址为 `http://127.0.0.1:4318`；测试需要本机 Chrome/Edge，可通过 `CHROME_PATH` 指定。业务冒烟会新增虚构演示记录，应对演示数据库运行；新增边界回归自动隔离。

### 四、未完成 / 说明

- 未进行真实 NVDA/Narrator 人工听读，不能把自动化或 AX 树检查表述为人工听读验收。
- 强制颜色为浏览器模拟，未逐项验收真实 Windows 系统对比度主题。
- 尚未完成全功能纯键盘人工验收；自动化规则与脚本检查不代表完整 WCAG 合规认证。
- 本项目为 Web 应用，不声称完成原生 Windows UIA 或 Android TalkBack 适配；平台口径待教师确认。
- 本轮为 AI 辅助优化；提交人需要理解并核查代码，以真实操作和记录说明本人贡献。
