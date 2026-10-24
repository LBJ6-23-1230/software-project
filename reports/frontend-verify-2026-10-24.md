# 前端改动验收（2026-10-24 · DSH 侧实测）

对象：Codex 在 11:04–11:11 那一轮做的视觉层改动（`src/styles.css` 为主，`App.tsx` / `Explore.tsx` / `Claims.tsx` 仅 className 与 aria）。
方法：真浏览器（Chromium，Playwright 驱动）在 1440×900 与 375×812 下，分别以浅色 / 暗色两套 color-scheme 加载 `http://127.0.0.1:5173`，采集截图、横向溢出、计算样式与抽屉行为。

## 结果

| 检查项 | 浅色 1440 | 浅色 375 | 暗色 1440 | 暗色 375 |
|---|---|---|---|---|
| 页面加载 | ✓ | ✓ | ✓ | ✓ |
| 横向溢出 | 0 px | 0 px | 0 px | 0 px |
| 实际生效背景变量 | `#f5f7f9` | `#f5f7f9` | `#12201e` | `#12201e` |
| 抽屉关闭时 | — | `visibility: hidden` | — | `visibility: hidden` |
| 抽屉打开时 | — | `visibility: visible` | — | `visibility: visible` |
| 打开后焦点位置 | — | 落在抽屉内首个链接 | — | 落到抽屉内首个链接 |

截图：`desktop-light.png`、`mobile-light.png`、`desktop-dark.png`、`mobile-dark.png`、`mobile-*-drawer.png`。

## 我在验收中补的缺口

Codex 的报告里把"抽屉无焦点圈定、无 Esc 关闭"列为已知缺口没做（需要改 JS）。我补上了 `src/App.tsx` 的三处改动：

1. 打开抽屉时把焦点移入（首个可聚焦元素），关闭时把焦点还给原触发按钮；
2. `Escape` 关闭抽屉；
3. `Tab` / `Shift+Tab` 在抽屉内循环，不外泄到背景。

实测结果：`closed=hidden → open=visible → after-esc=hidden`，切换前后焦点位置正确，`npm run build`（含 `tsc --noEmit`）通过，`npm test` 16/16 通过。

## 仍未验证 / 未做

- **200% 缩放、真实移动设备触控**：只覆盖了 375×812 的视口模拟，不是真机。
- **字段级错误关联**：错误仍是请求级字符串，无法把服务端错误定位到具体输入框（Codex 已在报告里说明，未冒充）。
- **全站 WCAG AA**：只验了正文/辅助文字对四种底色的对比度计算（浅 5.06:1、暗 6.80:1）与视觉抽查，不是完整无障碍审计。
- **控制台 401**：未登录时 `/api/auth/me` 返回 401 属预期，前端已兜住，不影响页面；但会污染控制台，可考虑改成 204 或静默。

## 复现

```powershell
# 起服务（若 5173 已在服务则跳过）
cd G:\武汉理工大学\日常学习\软件工程\software-project
npm run dev

# 跑验收脚本
python C:\Users\16007\.codex\quota-watch\shots\verify_ui.py
```
