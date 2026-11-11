# 课程平台揭榜主贴草稿

> 主贴标题统一格式：**揭榜适配-姓名-视障友好适配**
>
> 当前草稿使用 `xzh`；如平台要求实名，把标题中的 `xzh` 替换为本人姓名即可。

## 标题

揭榜适配-xzh-视障友好适配

## 正文

**项目**：拾光校园 · 校园失物招领系统（xzh 负责 F01–F03 用户管理）
**适配版本**：0.1.1（2026-11-02）
**仓库**：https://github.com/LBJ6-23-1230/software-task-2
**说明文档**：[docs/accessibility.md](https://github.com/LBJ6-23-1230/software-task-2/blob/main/docs/accessibility.md)

### 一、适配说明

本项目是 React + TypeScript 的 Web 应用，在 Windows 浏览器中运行。本次按照揭榜任务二对视障用户的要求，以 WCAG 2.1 AA / WAI-ARIA 为口径，对**原有界面与交互**做无障碍改造，**没有新增任何业务功能**。原 `xzh` 项目保持不动，适配代码放在独立的 `xzh2` 副本中。

1. **名称、角色、状态**
   - 侧边导航有名称，当前页 `aria-current="page"`；筛选、视图切换用 `aria-pressed` 暴露选中状态。
   - 物品卡片改为 `article` + `h3` + “查看详情”按钮，标题可被屏幕阅读器按标题导航，按钮名包含物品标题。
   - 弹窗有 `role="dialog"`、`aria-modal`、`aria-labelledby`，打开时背景 `#root` 设为 `inert`。
   - 表单保留原生 `label`/`required`，错误信息 `role="alert"` 并自动聚焦；表格有 `caption`、`scope`，重复的通过/驳回按钮带物品标题。
   - 装饰图标统一 `aria-hidden`；站内消息使用 `role="log"`；空态/加载态/结果数量使用 `role="status"`。

2. **键盘操作**
   - 新增“跳到主要内容”，首个 Tab 即可跳过侧边导航。
   - 所有原功能均可用键盘完成；弹窗与移动端抽屉 Tab 焦点锁定，Esc 关闭并把焦点还给触发按钮。
   - 路由切换后焦点落到页面 `h1`，文档标题同步更新，并通过 `role="status"` 播报页面变化。
   - 审核表格在窄屏下可聚焦并用键盘横向滚动；按钮/输入最小 40×40 px，焦点环清晰可见。

3. **高对比度与低视力**
   - 支持系统 `forced-colors`（Windows 高对比度）与 `prefers-contrast: more`，用系统色保留控件边框与焦点。
   - 选中态不再只依赖颜色；深色主题同步校验。
   - 200% 缩放、文本间距覆盖、390px 窄屏均无横向溢出。

### 二、测试记录

环境：Windows、Node.js 26.3.0、Chrome 156、Playwright + axe-core 4.14.0。

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 无障碍规则扫描 | `npm run test:a11y` | 10 次 axe 扫描，**0 违规**；28/28 项键盘/焦点/高对比度检查通过 |
| 自动化回归 | `npm test` | **19/19 通过**（HTTP 集成 + 客户端边界） |
| 生产构建 | `npm run build` | TypeScript + Vite 构建通过 |
| 原有业务冒烟 | `npm run test:smoke` | 6/6 步骤通过：发布 → 审核 → 搜索/详情 → 认领 → 站内消息 → 发布者核验 |

审计覆盖广场（浅色/深色/更多对比度/强制颜色）、登录弹窗、物品详情、个人中心、发布、认领、管理工作台、移动端抽屉。改造前基线为每次扫描 1 个 `label-content-name-mismatch` 违规、10/28 检查通过；改造后为 0 违规、28/28 通过。

### 三、复现方式

```powershell
npm install
npm run build
npm start          # http://127.0.0.1:4318
npm run test:a11y  # 需要本机 Chrome/Edge
npm run test:smoke
```

### 四、未完成 / 说明

- 未使用真实 NVDA/Narrator/TalkBack 人工听读，证据为 Chromium accessibility tree + axe-core + 键盘自动化；建议验收时用 NVDA 抽查登录、发布、认领三条主流程。
- Windows 高对比度用 `forced-colors` 模拟，未在真实系统主题下逐项截图。
- 本项目为 Web 应用，不声称完成原生 Windows UIA 或 Android TalkBack 适配。
- 未新增业务功能；接口、数据库、权限与认领状态机均未改动。
