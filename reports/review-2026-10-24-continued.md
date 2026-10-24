# 2026-10-24 续审与优化记录

范围：沿用 Vite 7、React 19、TypeScript、Express 5、SQLite，检查代码与设计并修复安全可确定的问题。不改四人责任、接口路径、字段名或状态枚举，不执行 Git 操作、不安装依赖、不删除已有文件。

## 进展 1：重新核实基线

- 已读取当前及上级项目规则、分工草案、四份上级需求设计文档、夜间报告，以及当前 task-list、api-contract、architecture、handoff、初版设计和 shared/types.ts。
- Node v24.16.0；实际执行 `npm.cmd test`：13 tests、13 pass、0 fail，退出码 0。完整输出：[基线测试](review-continued-baseline-tests.txt)。
- 实际执行 `npm.cmd run build -- --outDir reports/build-baseline --emptyOutDir false`：类型检查与 Vite v7.3.7 构建成功，1587 modules，退出码 0。[基线构建](review-continued-baseline-build.txt)。参数用于保留已有 dist，与原脚本相同的编译/打包流程。
- 现有测试使用临时隔离数据库；未启动使用 data/campus.sqlite 的正式入口。构建/测试通过不等于课程验收、生产安全或完整浏览器验证。
- 本轮 Python 启动器指向不存在的 D:/python/python.exe，UI UX 搜索脚本无法运行；使用已读取技能规范及既有视觉规范，不宣称获得搜索结果。

## 进展 2：审查与修复（持续追加）

共享修改计划：请求客户端错误处理影响全部模块；统一样式影响五个页面。仅改错误传播、交互展示与可访问性，不更换认证协议，不变更端点或响应结构。后续各块记录实际修复及证据。

### 已完成：请求失败语义（R03）

`src/api/client.ts` 原先把 JSON 解析失败转换成普通对象，200 HTML 会被当作成功；500 null 则因读取 null.error 变成 TypeError。增加 `server/tests/client.test.ts`，先运行出现 2 fail/1 pass，再最小修改为解析失败抛出可理解错误、null 安全处理、成功必须为对象/数组，复跑 3 pass/0 fail。日志见 review-client-red.txt 与 review-client-green.txt。未改网络契约或添加依赖。此测试模拟网络返回边界，调用真实客户端，不代表浏览器端到端测试。

### 浏览器验证限制

隔离预览只使用新建 reports/preview-data-* 数据库，监听 127.0.0.1:4329。浏览器工具先报告 iab 不可用，随后 Edge 对此本机地址返回明确的权限拒绝（未获 origin 授权）。未换浏览器或绕过限制；已告知用户，后续界面检查只能在重新获准后继续。当前无真实截图、无手机实机验证，不能声称 UI 已完整验收。

### 界面调整计划（沿用初版规范）

保持校园布告栏、系统中文字体、校园绿和纸签插画。颜色以背景 #F5F7F9、面板 #FFFFFF、正文 #183335、辅助文字 #516963、主色 #136B58、寻物橙 #914318 为基础；暗色单独配置正文/面板/强调色；高对比使用系统色。正文 16px、辅助信息至少 12px，物品标题 16px，手机一列卡片保留可读地点；8/16/24/32px 间距层级。优先修小字、焦点、触控和错误反馈，不引入新业务页面。修改由协调者统一整合，四人责任不变。
