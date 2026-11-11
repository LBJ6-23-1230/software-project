# F04—F06 Covenant Engineering Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; use requesting-code-review for one fresh whole-branch review. Preserve actual evidence.

**Goal:** 在现有模块内补齐发布用途告知、修复详情失败使用旧快照，交付公约、工程记录与验收证据。

**Architecture:** 沿用React函数组件和Express/SQLite模块化单体。详情读取通过显式状态控制加载、错误、重试与操作开放。API、数据结构与他人模块不变。

**Tech Stack:** React/TypeScript、Vite、Express、Node SQLite、Node test、现有Playwright/axe；无新增依赖。

**Spec:** ../specs/2026-11-11-csw-covenant-engineering.md

## Global Constraints

- 仅items业务页面、模块测试和文档；不改变他人状态机。
- 公约依据原PDF；区别个人实际工作、团队现有成果、待验证判断。
- 先RED后GREEN；已有能力补充覆盖可首次通过，不伪称修复。
- 记录本轮真实时间、命令、输出和截图；不虚构敏捷历史或工时。

## Review Focus

- 当前详情404、网络失败、慢请求；不得回退旧快照开放认领。
- 相关物品来回切换和关闭弹窗；晚到请求不得污染当前选择。
- 发布用途说明可见且范围真实，不把撤回说成删除或自动脱敏。
- 精确字段边界、图片伪装、组合筛选及分页；拒绝越权和非法状态。
- 原有键盘、焦点、错误反馈与业务回归；固定演示数据隔离。

## Task 1 模块基线与失败证据

- [x] 读取现有类型、页面、接口、设计与公约。
- [x] 建立scripts/items-regression.ts：隔离SQLite/API/Vite，检查告知、详情失败、重试、相关导航、慢响应与成功流程，保存JSON与PNG。
- [x] 运行基线，确认针对真实缺陷的检查失败，保存命令、结果和截图。

## Task 2 最小实现与模块测试

- [x] 修改src/modules/items/Publish.tsx，加入提交前用途与公开范围说明。
- [x] 修改src/modules/items/Explore.tsx，统一当前详情加载、失败、重试和选择切换的生命周期；不改认领接口。
- [x] 列表查询失败后清除旧结果，提供同条件重试；补真实浏览器负例。
- [x] 新增server/tests/items.test.ts：字段上下边界、图片和日期负例、组合筛选分页、本人/他人维护和认领约束。
- [x] 运行新模块检查至通过，再运行完整回归、TypeScript和生产构建。

## Task 3 工程记录与UML

- [x] docs/csw保存需求、可行性、敏捷backlog与本轮执行记录、分析/设计、测试和维护说明；全部有状态和证据。
- [x] 保存UML图源与PNG，区分概念模型和实际函数/组件实现。
- [x] 生成明日验收步骤、异常演示及已知限制。

## Task 4 文档交付与提交

- [x] 更新个人工作清单，完整核对公约15条，证据变化后重算结论。
- [x] 生成便于阅读的Word工程记录；逐页渲染检查两份Word。
- [x] 新上下文审查全部差异，修复重要问题并留真实红绿证据。
- [ ] 提交本分支并推送GitHub；核对远程提交；不强推或覆盖共享分支。

## Execution Ledger

- 2026-11-11 22:20 CST：从8bbd1a6建立独立工作区与codex/csw-covenant-engineering分支。原工作区保留不动。基线25项测试、类型检查、生产构建在原相同快照通过。
- Ruling: 用户明确授权直接修改和提交，复用已有F04—F06分工及技术栈，按本计划连续执行而不重复审批；新业务、共享状态机变更均不纳入本轮。代价是暂缓较大范围扩展。
- Ruling: 保留可审阅的依据、方案比较、决策和执行摘要，避免把推测、工具工作或共同集成记为个人历史。未知个人统计继续待补。
- 早期独立审查：隔离浏览器确认详情GET404后仍有认领表单、列表查询失败仍显示旧类型卡片、同条件搜索不重试、发布前用途告知缺失。原25项测试均通过，说明这些场景此前未覆盖。
- 测试夹具纠正：首次启动受已有5173端口影响；首次定位将type=search误写为textbox；匹配样本起初同类型。已更正夹具，以上不计产品缺陷证据。更正后基线8项均因目标行为缺失失败，原产品代码未修改。
- Task 1 complete：reports/csw/2026-11-11-baseline/report.json及截图记录0/8，命令退出1（预期RED）。server/tests/items.test.ts新增5项原能力覆盖首次即通过，未称为缺陷红绿修复。
- Task 2 intermediate：三项主体改进后6/8，B02/B04因新错误态的axe color-contrast失败。Ruling: 新增items.css仅给本模块请求错误使用现有red-dark变量，不修改公共ErrorBox或他人页面；代价是其他页面的同类潜在问题仍需各自验收。
- Task 2 checks：模块浏览器8/8、3次错误/告知态axe扫描0违规；全量HTTP/客户端30/30；类型检查与Vite生产构建通过（1591模块）；既有无障碍边界15/15；生产构建10次axe扫描0违规、28/28交互检查通过。
- 业务冒烟发现同步断言提前读取新的详情加载态。Ruling: 保留地点断言，先等待所选物品标题加载完成；调整仅涉及公共冒烟脚本等待条件，不修改业务逻辑或放宽权限断言。代价是慢请求将按原12秒超时失败。修复前输出保留production-before-wait目录。

- 2026-11-12交付核对：全量30/30、类型检查及1591模块构建再次通过；50处资料链接0失效。Word清单5页、工程记录11页均完成最终逐页PNG检查，图源和7张PNG保存，原模板SHA保持不变。代码独立审查无阻断项，B05精度建议已增强；额外文档独立审查因工具配额未产出，文档及渲染由主执行者复核，边界见docs/csw/交付核对.md。
