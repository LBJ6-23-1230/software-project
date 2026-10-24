# 初版 HTTP 契约

所有路径前缀 /api，返回直接 JSON 对象（不额外包 data），错误 {error:{code,message}}。
认证头 Authorization: Bearer <token>。时间 ISO 字符串，id 字符串。类型见 shared/types.ts。

| 方法与路径                       | 请求                                                  | 响应                |
| -------------------------------- | ----------------------------------------------------- | ------------------- |
| POST /auth/register              | name, studentId, password                             | AuthResult          |
| POST /auth/login                 | studentId,password                                    | AuthResult          |
| GET /auth/me                     | —                                                     | User                |
| POST /auth/logout                | —                                                     | {ok:true}           |
| PATCH /users/me                  | name?,phone?,verified?（仅演示绑定）                  | User                |
| GET /stats                       | —                                                     | Stats               |
| GET /items                       | q?,type?,category?,campus?,page?,pageSize?,mine?=true | ItemPage            |
| GET /items/:id                   | —                                                     | Item                |
| POST /items                      | ItemInput                                             | Item                |
| PATCH /items/:id                 | ItemInput                                             | Item                |
| POST /items/:id/withdraw         | —                                                     | Item                |
| GET /items/:id/matches           | —                                                     | Match[]             |
| GET /claims                      | —                                                     | Claim[]（仅参与者） |
| POST /claims                     | itemId,proof                                          | Claim               |
| POST /claims/:id/action          | action=approve/reject/complete/cancel                 | Claim               |
| GET /claims/:id/messages         | —                                                     | Message[]           |
| POST /claims/:id/messages        | content                                               | Message             |
| POST /disputes                   | claimId,reason                                        | Dispute             |
| GET /admin/items                 | reviewStatus?                                         | Item[]              |
| POST /admin/items/:id/review     | action=approve/reject,reason?                         | Item                |
| GET /admin/disputes              | —                                                     | Dispute[]           |
| POST /admin/disputes/:id/resolve | resolution                                            | Dispute             |
| GET /admin/backups               | —                                                     | Backup[]            |
| POST /admin/backups              | —                                                     | Backup              |
| POST /admin/backups/:id/restore  | confirm=true                                          | {ok:true}           |

演示账号：学生 20260001（林同学）、20260002（陈同学）；管理员 admin。统一演示密码 Campus123!。公开页面不展示上述登录标识，只有登录弹窗有明确“演示账号”入口。注册学号支持 6–20 位字母数字，普通角色不可自选管理员。

约束：页大小 1–50，标题 2–80、描述 5–2000、地点 2–80、认领证明 5–1000、消息 1–1000 字；phone 为空或 11 位数字。图片限本地 /assets/ 与 data:image/png/jpeg/webp（最多 1MB），拒绝脚本和 HTML。审核通过的编辑重新待审。客户端禁止传 ownerId、role 覆盖身份。
