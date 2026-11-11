# 0.2.1 Web 无障碍优化实施计划

> 执行方式：本会话按 executing-plans 内联实施；按 test-driven-development 先写浏览器回归，最后独立审查。

**Goal:** 补齐已有四模块的表单错误与模态隔离，提供可重现证据并上传。

**Architecture:** 沿用 React/TypeScript、Vite、Express、SQLite。公共表单只处理原生约束与错误呈现，不变更后端契约。

**Spec:** [设计](../specs/2026-11-11-web-accessibility-design.md)

## 全局约束与审查重点

不新增业务功能；保留原四模块与统一视觉规范；不伪造贡献或听读结果；版本 0.2.1。重点检查：输入改正/重复提交、服务端错误与字段校验区别、叠加弹窗逐层关闭、抽屉后背景访问恢复、文件选择后提示关联持续有效。

## Task 1：表单与焦点回归

- [x] 在 `scripts/a11y-regression.ts` 自启隔离 API/Vite，使用 `scripts/fixtures/dialogs.*` 验证真实公共弹窗组件，逐项输出 JSON。
- [x] 观察基线失败：必填/格式错误无字段关联，叠加弹窗下层仍可访问，抽屉背景未隔离，选图后说明丢失。
- [x] 新增 `src/components/AccessibleForm.tsx`，各模块表单接入；修正 `ui.tsx`、`App.tsx`、`Publish.tsx` 及必要焦点样式。
- [x] 回归通过后运行服务端测试、构建与原无障碍审计。

## Task 2：稳定原业务验证

- [x] 在 `scripts/smoke-test.mjs` 对可见“等待交接”状态等待，复用现有六步流程。
- [x] 运行六步冒烟，保留实际输出与环境；检查原有状态机和接口未变化。

## Task 3：记录、审查与上传

- [x] 更新 `package.json`/锁文件到 0.2.1，增加回归命令；README、CHANGELOG、`docs/accessibility.md`、`docs/verification.md`、`docs/submission-post.md` 沿用原格式。
- [x] 保存本轮实际 JSON/截图与需求映射，区分自动检查、浏览器模拟和未执行的人工听读。
- [x] 独立代码审查；修复重要问题并复验相关用例。
- 交付策略：提交实际改动，快进合入 main；再次 fetch 后普通 push，核对远端提交，不强推、不改写历史。实际上传结果以 Git 日志和远端提交为准。
