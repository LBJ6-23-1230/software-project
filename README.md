# 拾光校园 · 失物招领系统

四人课程项目初版：React/TypeScript + Vite、Express、Node.js 内置 SQLite。覆盖用户、发布浏览、认领沟通、后台管理；版本 **0.1.0（初版）**，用于本机课程演示和四人后续分模块优化。当前测试 16/16 通过，生产构建通过；完整范围与限制见验证记录。

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

演示学生：`20260001`、`20260002`；管理员：`admin`；密码均为 `Campus123!`。通过登录窗口选择或输入账号，不自动登录。

## 分工与文档

| 成员 | 子系统         | 功能    |
| ---- | -------------- | ------- |
| xzh  | 用户管理       | F01–F03 |
| csw  | 信息发布和浏览 | F04–F06 |
| stt  | 失物认领       | F07–F09 |
| gbl  | 系统管理       | F10–F12 |

- [课程要求摘要](docs/course-requirements.md)、[版本记录](CHANGELOG.md)、[实际验证](docs/verification.md)
- [任务清单与质量目标](docs/task-list.md)
- [架构、ER 与流程](docs/architecture.md)
- [API 契约](docs/api-contract.md)与[共享类型](shared/types.ts)
- [模块交接与 AI 提示](docs/handoff.md)
- [协作规则](AGENTS.md)与[初版设计](docs/superpowers/specs/2026-10-24-initial-design.md)

校园绑定为演示，消息采用 REST 刷新/轮询，匹配采用规则，备份由管理员手动执行。真实学校 SSO、WebSocket、大模型、定时备份为后续扩展。当前面向本机课程演示；AI 辅助不等于四位同学已完成个人课程贡献。
