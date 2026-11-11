# 拾光校园 · 失物招领系统

四人课程项目：React/TypeScript + Vite、Express、Node.js 内置 SQLite。覆盖用户、发布浏览、认领沟通、后台管理；版本 **0.1.1（视障友好适配）**，用于本机课程演示和四人后续分模块优化。当前自动化测试 19/19 通过，生产构建通过；完整范围与限制见验证记录。

> 本目录是揭榜任务二「视障友好适配」的独立副本（`xzh2`），原 `xzh` 项目未改动。适配只增加无障碍语义、键盘操作与高对比度样式，不新增业务功能。

## 本地运行

需要 Node.js **24 或更高版本**，在本目录运行：

```powershell
npm install
npm run dev
```

打开 [http://127.0.0.1:5173](http://127.0.0.1:5173)，API 端口 **4318**。Windows 若阻止 npm.ps1，可用 `npm.cmd` 执行相同命令。

构建后运行：

```powershell
npm run build
npm start
```

Express 在 [http://127.0.0.1:4318](http://127.0.0.1:4318) 提供 `dist` 页面和 `/api`。测试使用 `npm test`；本轮结果见 [验证记录](docs/verification.md)。

## 视障友好适配（揭榜任务二）

面向屏幕阅读器、键盘用户和低视力用户，对本项目原有界面做无障碍改造，不新增业务功能。对照任务的四项要求，已完成：

1. **名称 / 角色 / 状态**：导航、筛选、标签页、弹窗、表格、状态标签、消息列表均补齐语义与可读名称；表单错误使用 `role="alert"` 并把焦点移到错误信息；装饰图标统一 `aria-hidden`。
2. **键盘完整操作**：新增“跳到主要内容”；路由切换后焦点落到一级标题并更新文档标题、通过 `role="status"` 播报；弹窗与移动端抽屉焦点锁定，Esc 关闭并把焦点还给触发按钮；审核表格可聚焦横向滚动。
3. **高对比度与低视力**：支持系统 `forced-colors`（Windows 高对比度）与 `prefers-contrast: more`；选中态不只依赖颜色；深色主题、200% 缩放、文本间距覆盖均验证无横向溢出。
4. **原功能可用**：登录、发布、审核、搜索、详情、认领申请、站内消息、发布者核验等原有流程通过端到端冒烟测试；服务端回归 19/19 通过。

复现无障碍检查（需本机 Chrome 或 Edge）：

```powershell
npm run build
npm start          # 另开一个终端
npm run test:a11y  # axe-core 扫描 + 键盘/焦点/高对比度检查
npm run test:smoke # 原有业务流程端到端冒烟
```

完整修改点、测试记录与已知限制见 [无障碍适配说明与测试记录](docs/accessibility.md)，课程平台发帖草稿见 [提交用主贴](docs/submission-post.md)。

演示学生：`20260001`、`20260002`；管理员：`admin`；密码均为 `Campus123!`。通过登录窗口选择或输入账号，不自动登录。

## 分工与文档

| 成员 | 子系统         | 功能    |
| ---- | -------------- | ------- |
| xzh  | 用户管理       | F01–F03 |
| csw  | 信息发布和浏览 | F04–F06 |
| stt  | 失物认领       | F07–F09 |
| gbl  | 系统管理       | F10–F12 |

- [课程要求摘要](docs/course-requirements.md)、[版本记录](CHANGELOG.md)、[实际验证](docs/verification.md)
- [无障碍适配说明与测试记录](docs/accessibility.md)、[揭榜提交主贴草稿](docs/submission-post.md)
- [任务清单与质量目标](docs/task-list.md)
- [架构、ER 与流程](docs/architecture.md)
- [API 契约](docs/api-contract.md)与[共享类型](shared/types.ts)
- [模块交接与 AI 提示](docs/handoff.md)
- [协作规则](AGENTS.md)与[初版设计](docs/superpowers/specs/2026-10-24-initial-design.md)

校园绑定为演示，消息采用 REST 刷新/轮询，匹配采用规则，备份由管理员手动执行。真实学校 SSO、WebSocket、大模型、定时备份为后续扩展。当前面向本机课程演示；AI 辅助不等于四位同学已完成个人课程贡献。
