# 校园失物招领初版 Implementation Plan

> **For agentic workers:** Use executing-plans or subagent-driven-development. Shared contracts must be read first.

**Goal:** 可浏览、发布、认领、沟通、管理的本地初版，以及四人独立维护所需文档。
**Architecture:** React UI 调用独立 /api。Express 模块共享 SQLite 存储和身份校验；前端业务按成员目录拆分。
**Tech Stack:** Node >=24, React 19, TypeScript 5.9, Vite 7, Express 5, node:sqlite.
**Spec:** ../specs/2026-10-24-initial-design.md

## Global Constraints

- 责任 xzh/users、csw/items、stt/claims、gbl/admin；不伪造人类提交或测试。
- 类型来自 shared/types.ts；真实 API、SQLite 持久化；仅本地预览。
- 校园绑定标为演示，用户端不展示内部实现说明。

## Review Focus

1. 未登录和非本人不能修改信息或读取私密证明。
2. 重复及并发认领不能重复完成；审核/编辑不能绕开状态保护。
3. 空值、过长文本、危险图片 URL、错误枚举返回明确错误。
4. 移动端导航、详情和表单不溢出，键盘可关闭对话框。
5. 备份恢复仅管理员可执行，失败不能部分覆盖数据库。

## Task 1: 独立后端与集成测试

Files: server/app.ts, server/index.ts, server/db.ts, server/modules/{users,items,claims,admin}.ts, server/tests/api.test.ts.
Consumes shared/types.ts. Produces createApp({dbPath,backupDir?}) returning {app,close}; bind 127.0.0.1:4318.

- [ ] 先写 HTTP 集成测试：登录错误、越权、创建及审核、分页搜索、认领终态、消息私密、争议、备份恢复。
- [ ] 执行观察失败，再实现模块接口，运行 node --import tsx --test server/**/*.test.ts。
- [ ] 持久化演示数据和输出测试证据；不修改 UI。

## Task 2: 可交互前端及视觉规范

Files: src/App.tsx, src/components/_, src/api/client.ts, src/modules/{users,items,claims,admin}/_, src/styles.css.
Consumes shared types and API documented in docs/api-contract.md.

- [ ] 构建路由、导航、请求处理和共享对话框。
- [ ] 实现五个页面及认证、详情、发布、编辑、认领、沟通、审核、备份恢复表单。
- [ ] 类型检查与生产构建成功；浏览器验证实际 API 联动，截图桌面及移动端。

## Task 3: 要求对照与交接

Files: docs/task-list.md, docs/handoff.md, docs/api-contract.md, README.md, AGENTS.md.

- [ ] 12 行任务每行至少 2 个可验收质量要求、8 个教师要求字段。
- [ ] 写四人路径边界、启动步骤、演示账号、替换接口、已知限制、真实验证记录。
- [ ] 独立审查，修复重要发现；测试及构建通过后提交功能分支并推送 GitHub，保持 main 不变。
