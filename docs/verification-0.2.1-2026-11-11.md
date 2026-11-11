# 0.2.1 验证摘要（2026-11-11）

以下为本轮实际执行的结果摘要，不是所有质量目标的完整验收，也不是 NVDA/Narrator 听读报告。

## 环境与隔离

- Windows，Node.js v24.16.0，Chrome 157.0.8103.39，axe-core 4.14.0，Vite 7.3.7。
- 本轮浏览器基址 `http://127.0.0.1:5173`，服务使用 `output/preview/campus-v020.sqlite` 独立演示库与重新生成的 `dist/`；原 `data/campus.sqlite` 未被测试修改。
- 新增回归另行自启随机本地端口的 API/Vite，数据库在 `output/a11y-regression-时间戳/`，每次独立种子数据。
- 所有截图、账号、发布与认领内容为虚构演示数据。

## 实际命令与结果

| 命令 / 环境变量 | 实际输出摘要 | 退出码 |
| --- | --- | --- |
| `npm.cmd test` | tests 25 / pass 25 / fail 0 | 0 |
| `npm.cmd run build` | TypeScript 检查通过；1590 modules；Vite 构建成功 | 0 |
| `A11Y_BASE_URL=http://127.0.0.1:5173`、`A11Y_OUT=reports/a11y-0.2.1-2026-11-11` 后 `npm.cmd run test:a11y` | 10 次 axe，0 违规节点；28/28 交互检查 | 0 |
| `A11Y_REGRESSION_OUT=reports/a11y-regression-2026-11-11` 后 `npm.cmd run test:a11y:regression` | 15/15 checks passed | 0 |
| `SMOKE_BASE_URL=http://127.0.0.1:5173` 后 `npm.cmd run test:smoke` | 发布待审、管理员通过、搜索详情、认领申请、站内消息、发布者核验，6/6 | 0 |
| 同上加 `SMOKE_FORCED_COLORS=active` 后 `npm.cmd run test:smoke` | 同六步，6/6 | 0 |

PowerShell 设置环境变量需使用 `$env:变量名='值'`，上表用等号形式简写环境配置。

## 红绿对照

先对原代码观察失败，再实现修复。最终 15 项回归使用相同脚本重新针对 `2a8f061` 的源文件快照运行（快照在被忽略的 `output/preview/v020-baseline/`；测试夹具使用本轮同一份，不改变基线产品代码）。设置 `A11Y_APP_ROOT` 指向该目录，结果为 **3/15 通过、12 项失败，退出码 1**。当前代码 **15/15 通过，退出码 0**。

旧代码失败包括：无字段关联错误、选图后格式说明的引用目标丢失、叠加弹窗未隔离且 Escape 同时关闭两层、移动抽屉未隔离主体；三项原有行为（有效演示账号填入、请求错误播报、导航关闭后焦点恢复）通过。新增回归中的登录、发布、争议、审核四种错误态另做了 4 次 axe 扫描，最终均为 0 违规。

## 审查及补充验证

独立审查实际发现并复现了表单切换时 ID 冲突/过期错误、抽屉跨桌面断点不释放主体两类问题，已补充回归并按先失败、后通过验证修复。截图复核后对错误态追加扫描，发现错误汇总文字对比度不足，改用既有深红变量后 4 次扫描均通过。

审查方在内存 SQLite 与临时服务上另行复测：连续三轮登录/注册切换和快捷填入；390px 到 761px/1440px 释放主体隔离并可登录；弹窗正反向 Tab、逐层 Escape 与非空 `overflow: auto` 恢复。最终未报告遗留 Critical/Important 问题。该结论是代码审查，不是本轮文档审查或真实屏幕阅读器听读验收。

原业务冒烟曾在成功提示后立即读取旧 DOM，断言“等待交接”失败。诊断表明界面列表异步刷新；现在等待该状态可见后再断言，普通与强制颜色两次均通过。没有修改后端流程来迁就测试。

## 可核对文件

- [原审计本轮 JSON](../reports/a11y-0.2.1-2026-11-11/report.json)（同目录截图/ARIA 快照）
- [新增回归 JSON](../reports/a11y-regression-2026-11-11/report.json)（登录错误、管理员错误、抽屉截图）
- [同组基线 JSON](../reports/a11y-regression-baseline-2026-11-11/report.json)
- [实现设计与范围](superpowers/specs/2026-11-11-web-accessibility-design.md)

## 未执行与限制

未进行真实 NVDA/Narrator 人工听读、真实 Windows 主题切换、全功能纯键盘人工验收、性能压测或生产部署。`forced-colors` 是浏览器模拟；0 个自动扫描违规不等于完整无障碍合规。Web 平台是否满足任务书“Windows 桌面项目”口径仍需教师确认。
