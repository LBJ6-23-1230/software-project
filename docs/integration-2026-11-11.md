# 分支汇总记录（2026-11-11）

本记录说明如何把 `software-project` 的各开发分支与 `software-task-2` 的无障碍适配汇总为一个可运行的完整项目，并记录实际验证结果。此记录只描述本仓库与本地分支的真实状态，不代表教师验收或四位同学的个人贡献已经完成。

## 汇总前分支状态

`software-project`（https://github.com/LBJ6-23-1230/software-project.git）：

| 分支 | 提交 | 说明 |
| ---- | ---- | ---- |
| `main` | `650979e` | 只有 Initial commit（LICENSE、README），不是项目代码 |
| `csw` / `feat/initial-campus-platform` | `3a7b2dc` | v0.1.0 四模块整体界面、共享类型、API 与 16 项回归测试 |
| `xzh` | `21cd026` | 在 `3a7b2dc` 上完善用户流程、六校区选项、旧数据迁移与客户端错误提示 |
| `gbl` | `592d1ab` | 在 `3a7b2dc` 上完成 F10–F12 系统管理增强与管理员测试 |
| `stt` | `8122acd` | 在 `3a7b2dc` 上完善失物认领、真实物品图片、浏览器证据与检查脚本 |

`software-task-2`（https://github.com/LBJ6-23-1230/software-task-2.git）：

| 分支 | 提交 | 说明 |
| ---- | ---- | ---- |
| `main` | `c6ad8a2` | 基于 xzh 内容快照完成视障友好无障碍适配（揭榜任务二）；仓库历史与 `software-project` 无共同祖先 |

> 本地工作目录中的 `xzh2` 实际指向 `software-task-2`，不是 `software-project` 的分支。汇总时将其树内容做成以 `3a7b2dc` 为父提交的快照提交，再与其它分支做三方合并。

## 汇总步骤

1. 从 `3a7b2dc` 建立 `integration` 分支。
2. 合并 `xzh`：用户管理、校区选项与客户端改进。
3. 合并 `gbl`：系统管理增强与 `server/tests/admin.test.ts`。
4. 合并 `stt`：认领逻辑、真实图片、搜索体验、证据与脚本。
5. 将 `software-task-2` 的树内容做成快照提交（父提交 `3a7b2dc`），再合并进 `integration`，让 Git 以 `3a7b2dc` 为共同基线做三方合并。
6. 人工处理 4 个前端文件冲突，补齐无障碍语义与各分支业务逻辑，再运行完整验证。
7. 将 `integration` 快进/合并到 `main` 并推送。

## 冲突处理

| 文件 | 冲突来源 | 处理结果 |
| ---- | -------- | -------- |
| `src/modules/admin/Admin.tsx` | gbl 的审核列表/筛选与 xzh2 的表格无障碍改造 | 保留 gbl 的 `displayedItems` 本地筛选、审核理由回显、重新通过/下架约束；保留 xzh2 的 `role="region"`、表格标题、`scope="col"`、按钮 `aria-label` 与 `<time>` 语义 |
| `src/modules/claims/Claims.tsx` | stt 新增 `Clock3`/`CheckCircle2` 图标与 xzh2 改用本地图标集 | 统一从 `src/components/icons` 引入全部图标；保留 stt 的终态会话禁止发消息与“仅供查阅”提示；保留 xzh2 的 `role="log"`、进度列表语义与焦点管理 |
| `src/modules/items/Explore.tsx` | stt 的真实 `.jpg` 图片与 xzh2 的装饰性 `alt=""` | 使用 stt 的 `.jpg` 图与 `current` 详情数据，同时采用 xzh2 的空 `alt`、`<time dateTime>` 与 `useId` 证明提示；详情页保留从 API 刷新的逻辑 |
| `src/modules/users/Users.tsx` | stt 的 `.jpg` 图片与 xzh2 的空 `alt` | 使用 `.jpg` + `alt=""`，标题仍由相邻标题元素提供可读名称 |
| `scripts/smoke-test.mjs` | xzh2 断言认领通过后显示“已通过”，stt 将该状态文案改为“等待交接” | 断言改为“等待交接”；这是文案变更，不是流程失败 |

## 实际验证

环境：Windows、Node.js v26.3.0、Chrome 156、axe-core 4.14.0。以下均为 2026-11-11 在汇总后的 `integration` 工作树实际执行：

| 检查 | 实际结果 |
| ---- | -------- |
| `npm run build` | TypeScript 检查与 Vite 生产构建通过，退出码 0；1589 modules |
| `npm test` | 25 tests / 25 pass / 0 fail，退出码 0（含 gbl 管理员测试、stt 终态消息测试、xzh 校区/客户端测试） |
| `npm run test:smoke` | 6/6 步骤通过：发布 → 管理员审核 → 搜索/详情 → 认领申请 → 站内消息 → 发布者核验 |
| `npm run test:a11y` | 10 次 axe 扫描 0 违规节点；28/28 项键盘、焦点、高对比度与缩放检查通过，退出码 0 |
| 浏览器人工复核 | 首页、详情弹窗、管理员审核/争议/备份、我的认领均实际打开并截图检查；未见页面报错或布局破坏 |

本次无障碍扫描的 10 页截图、ARIA 快照与 `report.json` 保存在 [`reports/a11y-latest/`](../reports/a11y-latest/report.json)。

## 课堂演示

```powershell
npm install
npm run build
npm start
```

打开 <http://127.0.0.1:4318>。演示账号：学生 `20260001` / `20260002`，管理员 `admin`，密码均为 `Campus123!`。

建议演示顺序：登录学生发布一条招领 → 管理员审核通过 → 另一学生搜索并申请认领 → 双方站内消息 → 发布者核验通过 → 个人中心查看发布与认领记录。无障碍部分可现场按 Tab 展示“跳到主要内容”、弹窗焦点锁定与 Esc 归还焦点。

## 已知限制

- 无障碍验证为 axe-core 自动扫描与脚本化键盘检查，不是 NVDA/Narrator 人工听读验收。
- 校园身份绑定、站内消息、规则匹配与手动备份均为课程演示实现，不代表真实学校 SSO、WebSocket、大模型匹配或定时备份。
- 演示账号与密码公开，仅用于本机课堂演示，不要用于真实校园数据或生产环境。
- 汇总保留各分支原有测试与证据；历史报告中的测试数量（如 0.1.0 的 16/16、0.1.1 的 19/19）是当时分支的记录，不代表汇总后的 25/25。
