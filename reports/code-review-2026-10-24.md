# 代码审查（2026-10-24 · DSH 侧）

范围：`software-project` 的鉴权、数据层、信息接口、管理端快照恢复、前端请求客户端。
方法：逐文件阅读 + 定向 grep（XSS sink、SQL 拼接、口令/令牌处理）。所有结论都指到 `文件:行`。

状态：**第一轮完成，认领与争议模块待续**。

## 结论摘要

| 级别 | 数量 | 说明 |
|---|---|---|
| 高 | 0 | 未发现可直接利用的注入 / 越权 / 凭据泄露 |
| 中 | 3 | 登录无限速、注册竞态返回 500、演示管理员口令硬编码 |
| 低 | 4 | verified 可自设、损坏口令哈希 500、令牌存 sessionStorage、缺少安全响应头 |

整体质量高于一般课程项目：全程参数化 SQL、口令 scrypt + 定时安全比较、会话令牌只存哈希、数据库层用部分唯一索引兜住并发、管理端快照恢复还做了语义一致性校验。

## 中危

### M1 登录没有速率限制，可被撞库

`server/modules/users.ts:56-66` —— `/api/auth/login` 每次请求直接查库并做 scrypt 校验，无失败计数、无 IP 节流。
影响：离线字典 + 在线爆破都无成本；演示账号口令又是公开的（见 M3）。
建议：按 `studentId` + 来源 IP 做滑动窗口（例如 5 次/分钟），或失败后加固定延迟。

### M2 注册的唯一性检查在事务外，并发下返回 500

`server/modules/users.ts:38-53` —— 先 `SELECT` 判重（第 38 行），再在 `transaction()` 里 `INSERT`（第 41 行）。
两支并发请求都能通过 SELECT，随后其中一支撞 `users.studentId UNIQUE` 约束；该异常不是 `ApiFailure`，落到 `server/app.ts:48-51` 变成 **500 INTERNAL**。
影响：并发注册同学号时前端提示"操作失败，请稍后重试"，语义错误但不致命。
建议：捕获 INSERT 的约束错误转成 409 `DUPLICATE_ACCOUNT`；或把判重移进事务内。

### M3 演示管理员与演示账号的口令写死在种子里

`server/db.ts:72-105` —— `admin` / `20260001` / `20260002` 全部是 `Campus123!`，随仓库分发。
影响：这套代码被部署到任何公网地址，管理员口令就是公开知识。
建议：种子口令改为首次启动随机生成并打印一次，或强制环境变量注入；至少在 README 顶部写明"仅本地演示，禁止公网部署"。

## 低危 / 需明确

### L1 用户可把自己的 `verified` 置为 true

`server/modules/users.ts:90-96` —— `PATCH /api/users/me` 接受 `verified: boolean` 并直接写库。
这与"校园绑定是演示"的约定一致，但对外表述必须一致：**这不是真实认证**。建议前端明确标注"演示绑定"，避免答辩时被当成真实 SSO。

### L2 损坏的 passwordHash 会让登录抛 TypeError → 500

`server/db.ts:10-15` —— `stored.split(":")` 后若缺少 `:`，`Buffer.from(undefined, "hex")` 抛错。
影响：仅当库被手工改坏时触发，属健壮性问题。建议先做格式校验，不匹配直接 401。

### L3 会话令牌存 `sessionStorage`

`src/api/client.ts:1-5` —— 任何 XSS 都能读走令牌（无 HttpOnly 保护）。
现状：全仓库 grep 无 `innerHTML` / `dangerouslySetInnerHTML` / `eval`，React 默认转义，实际风险低。
建议：要更稳可改成后端下发 HttpOnly + SameSite Cookie；课程演示可保持现状，但要在文档里写明取舍。

### L4 缺少安全响应头

`server/app.ts:13-16` —— 只关了 `x-powered-by`，没有 CSP / `X-Content-Type-Options` / `Referrer-Policy` / `frame-ancestors`。
建议：加 `helmet` 或手写 4 行中间件；CSP 至少 `default-src 'self'`。

## 已确认做对的地方（不必改）

- 口令：`scrypt` + 16 字节随机盐 + `timingSafeEqual`（`server/db.ts:6-15`）。
- 令牌：32 字节随机、库里只存 `sha256`、`^Bearer ([a-f0-9]{64})$` 严格匹配（`server/common.ts:19-20, 86-95`）。
- SQL：全部参数化；`items.ts:140-148` 的 `${condition}` 只由固定片段拼接，用户输入全部走 `?`，**不构成注入**。
- 越权：`visibleItem`（`common.ts:114-123`）与 `participant`（`common.ts:142-147`）把"待审核 / 已下架 / 非当事人"收敛成 404/403。
- 并发：`claims` 上两条部分唯一索引（`db.ts:38-39`）+ `BEGIN IMMEDIATE`（`db.ts:51-61`），挡住两人同时认领。
- 快照恢复：表名列名来自 allowlist（`admin.ts:55-74`），再做 integrity_check / user_version / foreign_key_check + 语义一致性 SQL（`admin.ts:87-139`），比大多数课程项目严谨。
- 前端请求层：`client.ts:20-28` 已修 —— HTML 200 不再被当成成功，`null` 错误体不再崩。

## 待续

- `server/modules/claims.ts`：认领状态机、终态消息规则、争议联动。
- `server/modules/admin.ts` 余下部分：备份路径穿越、恢复流程的事务边界。
- `shared/types.ts` 与 `docs/api-contract.md` 的字段级一致性。
- 前端五个页面的表单校验与服务端错误码映射是否一一对应。
