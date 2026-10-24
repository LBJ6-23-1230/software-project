# 四人模块交接指南

本初版用于查看整体界面、打通业务和稳定接口。功能验收、教师认可、个人完成情况须分别以真实证据确认。开始前读本仓库 `AGENTS.md` 与 `docs/course-requirements.md`（原工作区的上级规则和原始课件可作为补充），再读共享类型、API、任务清单、架构和初版设计。

## 责任与范围

| 成员 | 功能             | 前端目录             | 后端目录                   | 协调关系                            |
| ---- | ---------------- | -------------------- | -------------------------- | ----------------------------------- |
| xzh  | F01–F03 用户管理 | `src/modules/users`  | `server/modules/users.ts`  | 身份提供全组，个人记录消费物品/认领 |
| csw  | F04–F06 发布浏览 | `src/modules/items`  | `server/modules/items.ts`  | 用户身份、审核、认领期间编辑限制    |
| stt  | F07–F09 失物认领 | `src/modules/claims` | `server/modules/claims.ts` | 物品可认领性、个人记录、争议入口    |
| gbl  | F10–F12 系统管理 | `src/modules/admin`  | `server/modules/admin.ts`  | 审核可见性、争议状态、全库恢复      |

`shared/`、数据库/鉴权基础设施、公共组件、入口、全局样式和启动配置由协调者整合。需要改动时先说明问题、受影响调用方和兼容方案。不要为了自己的模块暗改字段名、状态、响应包装或他人代码。

当前初版的匹配路由位于 `server/modules/items.ts`，争议提交路由位于 `server/modules/claims.ts`。这是技术放置位置，不改变 F09 属于 stt、F11 属于 gbl 的课程责任；涉及这些跨文件功能时先协调对应文件维护者，或在约定后拆分模块，避免各自 AI 同时覆盖文件。

## 当前交付边界

12 功能已有初版实现，核心自动测试 16/16 通过，完整质量目标仍需逐项验证，详见 docs/verification.md。React/TypeScript + Vite、Express、Node.js 24 内置 SQLite 是本轮默认选型。校园身份为演示绑定，消息为 REST 刷新/轮询，匹配为规则，备份为手动操作。真实 SSO、WebSocket、大模型、定时备份是扩展。

启动方式见 README。演示主线为“两学生登录→发布→管理员审核→搜索→申请→核验→消息→完成”，再检查个人记录、争议与隔离测试库备份恢复。按 TC-F01–TC-F12 留真实输出，未执行写未执行，失败写复现条件。构建通过不能代替权限、并发和浏览器验收。

## 可复制给各自 AI 的提示

### xzh：用户管理

> 继续 F01–F03。先读 AGENTS.md、docs/course-requirements.md、shared/types.ts、docs/api-contract.md、docs/task-list.md 和用户模块。允许改 src/modules/users、server/modules/users.ts 及其测试。改进注册登录退出、演示校园绑定、个人资料隐私和本人发布/认领记录。身份由服务端会话确定，普通注册不能自选管理员；公开数据不泄漏学号电话。个人记录消费现有接口，不复制维护物品/认领状态。保持共享类型、路径、错误格式，不改其他成员模块。公共变更先列出影响并协调。交付修改文件、F 编号、真实测试命令与输出、失败/未测项。不要编造 xzh 个人贡献或提交，不推送、不部署。

### csw：信息发布和浏览

> 继续 F04–F06。先读 AGENTS.md、docs/course-requirements.md、shared/types.ts、docs/api-contract.md、docs/task-list.md、初版视觉规范及物品模块。允许改 src/modules/items、server/modules/items.ts 及其测试。改进寻物招领发布、分类搜索分页详情、本人编辑撤销。保持 type/status/reviewStatus 三维区分；发布编辑待审；进行中认领的编辑撤销与 stt 协调。身份来自会话，不接受 ownerId 注入，图片与字段遵循契约。公共接口和视觉规范先协调，不改他人模块。交付真实验证、未测项和 F04–F06 对应关系；不虚构个人历史，不推送、不部署。

### stt：失物认领

> 继续 F07–F09。先读 AGENTS.md、docs/course-requirements.md、shared/types.ts、docs/api-contract.md、docs/task-list.md、docs/architecture.md 和认领模块。允许改 src/modules/claims、server/modules/claims.ts 及其测试。改进申请核验完成、参与人消息和规则匹配。校验操作者与状态跳转；完成与物品状态一致，同物品最多一条有效完成，物品写入与 csw 协调。消息只供参与人，REST 刷新/轮询不声称 WebSocket；推荐给规则原因、不自动认领、不引入大模型。争议需改状态时提供受约束入口并与 gbl 协调。保持契约、不改他人模块；交付真实命令、输出、并发/越权验证和未完成项；不造个人贡献，不推送、不部署。

### gbl：系统管理

> 继续 F10–F12。先读 AGENTS.md、docs/course-requirements.md、shared/types.ts、docs/api-contract.md、docs/task-list.md、docs/architecture.md 和管理模块。允许改 src/modules/admin、server/modules/admin.ts 及其测试。改进管理员审核驳回下架、争议处理、手动备份恢复。服务端校验所有管理员入口；审核与生命周期分开，争议不任意改终态，涉及认领先协调 stt。恢复要明确确认，在隔离库验证往返与坏备份，先全组协调恢复影响。不声称定时调度已实现。保持契约、不改他人模块；交付真实测试、复现步骤、未测项和 F10–F12 对应关系，不伪造贡献，不推送、不部署。

## 每轮交付记录

1. 需求及 F 编号：本轮改什么、为什么。
2. 设计及接口：状态、权限、字段、跨模块影响与已协调内容。
3. 实现证据：实际文件、真实提交（若有）、本人理解与审核内容。
4. 验证：环境、日期、用例、命令、输出、截图、失败和未测项。
5. 交接：依赖、限制与下一步。

四位同学是课程责任人，AI 生成内容按 AI 辅助如实记录，由实际成员理解、审核和测试。不得冒用成员身份创建提交、补写虚构开发日期或将统一集成工作伪装成每个人独立完成的证据。
