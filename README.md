# 拾光校园 · 失物招领系统

四人课程项目完整汇总版：React/TypeScript + Vite、Express、Node.js 内置 SQLite。覆盖用户管理、发布浏览、失物认领与站内沟通、后台管理四个子系统，并包含视障友好无障碍适配。版本 **0.2.1（无障碍增量优化）**，用于本机课程演示与验收。

> `main` 已汇总 `csw` / `gbl` / `stt` / `xzh` 四个开发分支，并吸收 `xzh2`（`software-task-2`）的视障友好适配。原分支保留用于追溯，`main` 是完整的课程展示版本。合并明细见 [分支汇总记录](docs/integration-2026-11-11.md)。

2026-11-12已将`codex/csw-covenant-engineering`的代码改进、工程记录及最终两页精炼清单快进合入`main`：补充csw F04–F06发布前用途告知、列表失败清空与重试、失效详情和过时请求处理。完整需求、设计取舍、7张UML/工程图、真实工作日志、测试和验收步骤见 [csw验收材料入口](docs/csw/README.md)，本次合并见 [main更新记录](docs/integration-2026-11-12.md)。团队发布版本号仍为0.2.1。

合并后的`main`于11月12日重新验证：自动化测试 **30/30 通过**、类型检查与1591模块生产构建通过，本机首页和公开物品接口正常。11月11日的模块浏览器回归 **8/8**、普通及强制颜色模式业务冒烟各 **6/6**、无障碍审计 **10次axe扫描0违规 / 28项交互检查通过**、原边界回归 **15/15**的历史证据继续保留，本次未冒称全部重跑。结果与限制见 [csw材料](docs/csw/README.md)，团队原版本记录见 [验证记录](docs/verification.md)。

0.2.1 补齐表单错误汇总与字段关联、叠加弹窗逐层关闭、导航抽屉背景隔离、上传提示持续可访问，并修复冒烟脚本提前读取旧状态的问题。保留原业务与四模块分类。**本项目是 Windows 浏览器中的 Web 应用；是否符合任务书的“Windows 桌面项目”口径待教师确认。** 自动扫描不代表真实读屏听读或完整 WCAG 合规认证。

## 本地运行

需要 Node.js **24 或更高版本**。在本目录运行：

```powershell
npm install
npm run dev
```

打开 [http://127.0.0.1:5173](http://127.0.0.1:5173)，API 端口 **4318**。Windows 若阻止 `npm.ps1`，可用 `npm.cmd` 执行相同命令。

构建后以单端口运行（适合课堂展示，前端与 API 都在 4318）：

```powershell
npm run build
npm start
```

打开 [http://127.0.0.1:4318](http://127.0.0.1:4318)。Express 同时提供 `dist` 页面与 `/api`。

## 已汇总内容

| 来源 | 汇总内容 |
| ---- | -------- |
| `csw` / 初版基线 | 四模块整体界面、共享类型与 API 契约、SQLite 持久化、认领状态机与回归测试 |
| `xzh` | 用户管理与校区选项完善；六个校区选项、旧数据迁移、后端不可用提示、相关测试 |
| `gbl` | F10–F12 系统管理增强：审核理由回显、全部状态本地筛选、重新通过/下架约束、争议幂等处理、备份恢复时校验账号凭据；新增管理员测试 |
| `stt` | 失物认领完善：真实物品图片、终态认领只读会话、搜索/分类/排序体验、浏览器证据与检查脚本 |
| `xzh2`（`software-task-2`） | 视障友好适配：语义与可读名称、键盘与焦点管理、跳过导航、深色/高对比度/强制颜色、200% 缩放、axe 审计与冒烟脚本 |

合并时保留了各分支的业务逻辑，并将 `xzh2` 的无障碍语义叠加到 `gbl`、`stt` 改过的页面上。冲突处理与复核记录见 [分支汇总记录](docs/integration-2026-11-11.md)。

## 视障友好适配（揭榜任务二）

面向屏幕阅读器、键盘用户和低视力用户，对原有界面做无障碍改造，不新增业务功能：

1. **名称 / 角色 / 状态**：导航、筛选、标签页、弹窗、表格、状态标签、消息列表均补齐语义与可读名称；表单错误使用 `role="alert"` 并把焦点移到错误信息；装饰图标统一 `aria-hidden`。
2. **键盘完整操作**：提供“跳到主要内容”；路由切换后焦点落到一级标题并更新文档标题、通过 `role="status"` 播报；弹窗与移动端抽屉焦点锁定，Esc 关闭并把焦点还给触发按钮；审核表格可聚焦横向滚动。
3. **高对比度与低视力**：支持系统 `forced-colors`（Windows 高对比度）与 `prefers-contrast: more`；选中态不只依赖颜色；深色主题、200% 缩放、文本间距覆盖均验证无横向溢出。
4. **原功能可用**：登录、发布、审核、搜索、详情、认领申请、站内消息、发布者核验等流程通过端到端冒烟测试。
5. **错误与模态边界（0.2.1）**：原生约束失败后聚焦错误汇总，链接可跳转字段，`aria-invalid` / `aria-describedby` 随修正更新；下层弹窗和导航背景使用 `inert` 隔离，Escape 逐层关闭。新增回归在独立数据库上自启服务，不影响日常数据。

复现检查（需本机 Chrome 或 Edge）：

```powershell
npm run build
npm start          # 另开一个终端
npm test           # 当前分支30项服务端/客户端回归
npm run test:a11y  # axe-core 扫描 + 键盘/焦点/高对比度检查
npm run test:smoke # 原有业务流程端到端冒烟
npm run test:a11y:regression # 自启隔离服务，15 项边界回归，无需 npm start
```

强制颜色模式业务验证（浏览器模拟，非真实 Windows 主题切换）：

```powershell
$env:SMOKE_FORCED_COLORS='active'
npm.cmd run test:smoke
Remove-Item Env:SMOKE_FORCED_COLORS
```

`test:smoke` 会创建演示发布、消息和认领数据，应对演示数据库执行；`test:a11y:regression` 自动隔离，报告默认写入 `reports/a11y-regression-latest/`。

完整适配说明见 [无障碍适配说明与测试记录](docs/accessibility.md)，课程平台发帖草稿见 [提交用主贴](docs/submission-post.md)。

## 演示账号

| 角色 | 校园账号 | 密码 |
| ---- | -------- | ---- |
| 学生（林同学） | `20260001` | `Campus123!` |
| 学生（陈同学） | `20260002` | `Campus123!` |
| 管理员 | `admin` | `Campus123!` |

通过登录窗口选择或输入账号，不自动登录。演示数据均为虚构。

## 分工与文档

| 成员 | 子系统         | 功能    |
| ---- | -------------- | ------- |
| xzh  | 用户管理       | F01–F03 |
| csw  | 信息发布和浏览 | F04–F06 |
| stt  | 失物认领       | F07–F09 |
| gbl  | 系统管理       | F10–F12 |

- [分支汇总记录](docs/integration-2026-11-11.md)、[课程要求摘要](docs/course-requirements.md)、[版本记录](CHANGELOG.md)、[实际验证](docs/verification.md)
- [无障碍适配说明与测试记录](docs/accessibility.md)、[揭榜提交主贴草稿](docs/submission-post.md)
- [gbl F10–F12 交付说明](docs/gbl-F10-F12-delivery.md)
- [csw F04–F06 工程记录与验收材料](docs/csw/README.md)
- [任务清单与质量目标](docs/task-list.md)
- [架构、ER 与流程](docs/architecture.md)
- [API 契约](docs/api-contract.md)与[共享类型](shared/types.ts)
- [模块交接与 AI 提示](docs/handoff.md)
- [协作规则](AGENTS.md)与[初版设计](docs/superpowers/specs/2026-10-24-initial-design.md)

校园绑定为演示，消息采用 REST 刷新/轮询，匹配采用规则，备份由管理员手动执行。真实学校 SSO、WebSocket、大模型、定时备份为后续扩展。当前面向本机课程演示；AI 辅助不等于四位同学已完成个人课程贡献。
