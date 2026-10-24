# 拾光校园视觉改造实施方案

日期：2026-10-24。状态：仅设计交接，尚未实现或进行浏览器验收。

**目标：** 默认明亮温暖的校园布告栏，以更舒展的排版、克制的纸质细节和短动效改善现有页面。

**架构：** 沿用 `src/styles.css` 的语义变量和现有组件，使用 `<html data-theme>` 管理主题；CSS 负责外观与微动效，React 仅提供主题状态及页面过渡所需的呈现状态。保留现有 hash 页面、权限判断、表单、弹窗及业务 API。

**技术：** Vite 7、React 19、TypeScript、原生 CSS；不增加依赖，不使用字体 CDN。后续执行者可按本方案逐项实施，使用本地 executing-plans 技能；本轮不执行实现。

**依据：** 本轮用户目标及配色优先；继承 `docs/superpowers/specs/2026-10-24-initial-design.md` 的校园布告栏方向与无障碍约定。功能对应 `docs/task-list.md` 的 F01–F12；契约与共享类型不变。本方案不重新核定课程原始要求。

## 0. 范围、事实与交接边界

- 本轮唯一产物为本文；不修改代码，不安装依赖，不运行 `npm test` 或 `npm run build`。
- 后续涉及共享样式、App 和公共组件，由协调者整合；页面展示属性由相应负责人配合：xzh F01–F03、csw F04–F06、stt F07–F09、gbl F10–F12。本文列出跨模块影响，不授权改动 API、数据库或业务状态。
- 已查看指定公共文件、扫描五个页面文件的组件与 className。样式顶部已有浅色变量，但第 34 行附近的系统暗色媒体查询会覆盖它们；文件末尾约 2810–2910 行还有公共状态、布局、hover、减少动效的二次覆盖。实施时必须核对最终级联，不能只改第一处声明。
- `App.tsx` 使用 `page`、`navigate`、`hashchange` 切换页面，当前条件渲染会立刻卸载旧页面；`Explore key={version}` 也会因通知重新挂载。页面动画不能绑定每次挂载或 version。
- 现有装饰包括 `.art-note`、`.paper-pin`，两张便签目前倾斜约 -11°/+10°；小屏最终规则在 ≤1080px 隐藏 `.hero-art`。保留这些响应式展示规则。
- 本地 ui-ux-pro-max / writing-plans 用于约束与交接结构；本轮搜索未成功运行（Python 启动器指向不可用解释器），不把建议冒充数据库搜索结果。配色来自用户输入，规格为针对现有代码的设计判断。

**优先审查的五类风险：** 系统深色与存储异常；快速切页和登录退出；动画与 hover 的 transform 冲突；长中文与窄屏；状态颜色及焦点对比度。下文均有对应验收。

## 1. 设计令牌

### 1.1 主题颜色：保留旧变量名，减少迁移面

浅色声明放在 `:root`（无属性也能工作），暗色只放在 `:root[data-theme="dark"]`。显式 light 采用同一浅色值，禁止再通过系统配色覆盖。`--green-dark` 和 `--red-dark` 表示交互态，暗色主题可以比默认色更亮。

| 变量 | 浅色 | 暗色 | 用途 |
|---|---|---|---|
| `--bg` | `#FDFBF7` | `#211F1B` | 页面暖纸背景 / 暖炭背景 |
| `--surface` | `#FFFFFF` | `#2D2A25` | 卡片、弹窗、表单 |
| `--ink` | `#1F2A2E` | `#F4EFE6` | 正文与标题 |
| `--muted` | `#5B6B66` | `#C6BEB0` | 辅助文字、占位文字、时间 |
| `--green` | `#0F766E` | `#82D3BF` | 主按钮、链接、通过状态文字 |
| `--green-dark` | `#115E59` | `#A2E2D1` | 主按钮 hover、toast 背景 |
| `--on-accent` | `#FFFFFF` | `#211F1B` | 实心主按钮、危险按钮及 toast 的文字 |
| `--mint` | `#E8F3EE` | `#2C3C34` | 招领/成功标签、选中背景 |
| `--soft` | `#F5F1E9` | `#373229` | 次级面板、只读控件、中性状态 |
| `--border` | `#E8E2D6` | `#5B5347` | 装饰分隔线、卡片边框；不承担控件识别 |
| `--control-border` | `#7A8072` | `#A69C8B` | 输入框、未选筛选项边界 |
| `--red` | `#DC2626` | `#FFAAA0` | 危险实心按钮、错误边界、必填标记 |
| `--red-dark` | `#B91C1C` | `#FFC3BA` | 危险按钮 hover |
| `--red-soft` | `#FFF1EE` | `#452D29` | 错误与拒绝状态底色 |
| `--danger-text`（新增） | `#B91C1C` | `#FFB4AA` | 红色浅底上的错误文字、危险次按钮；避免原红色在淡红底上临界 |
| `--orange` | `#92400E` | `#F6C486` | 寻物、待审核文字；不可直接用装饰琥珀替换 |
| `--orange-soft` | `#FFF3DE` | `#433421` | 寻物、待审核标签底色 |
| `--accent`（新增） | `#D97706` | `#E7AB58` | 图钉、CTA 小标记等非文字强调 |
| `--accent-ink`（新增） | `#3B2507` | `#211F1B` | 必须使用琥珀实心块时的深色文字 |
| `--focus` | `#0F766E` | `#A2E2D1` | 3px 焦点环，offset 3px |
| `--scrim` | `#211F1B66` | `#100E0CCC` | 弹窗、移动导航遮罩 |
| `--paper`（新增） | `#FFF7E8` | `#393226` | hero、装饰便签背景 |
| `--paper-grain`（新增） | `#6B50350A` | `#F1D7AA08` | 细颗粒纸纹色 |
| `--pin`（新增） | `#B45309` | `#E7AB58` | 图钉头部 |
| `--shadow-color` | `#61472D14` | `#00000033` | 暖阴影色 / 暗色柔影 |
| `--shadow` | `0 8px 24px var(--shadow-color)` | 同浅色 | 公共抬升阴影 |
| `--shadow-card`（新增） | `0 2px 8px #61472D0A` | `0 2px 8px #00000026` | 卡片静态阴影 |
| `--shadow-pin`（新增） | `1px 2px 3px #61472D40` | `1px 2px 3px #00000066` | 图钉局部投影 |

颜色搭配规则：正文、辅助文字在 bg/surface/soft/paper 上均须 ≥4.5:1；标签文字在对应 mint/orange-soft/red-soft 上须 ≥4.5:1；输入边界与焦点环相邻背景须 ≥3:1。以上是验收要求，不是浏览器实测结果。浅色 `#D97706` 不作为白底小字，也不搭配白色小字；主 CTA 保持青绿底白字，琥珀只点缀图钉或小标记。危险实心按钮仍使用 `--red`，错误正文使用 `--danger-text`。所有状态保留文字与现有图标，不仅靠颜色。

### 1.2 排版、间距、形状与动效公共变量

以下令牌两主题取值相同；新增字体变量避免统计区硬编码 Segoe UI 与全局脱节。

| 变量 | 两主题值 | 用途 |
|---|---|---|
| `--font-ui` | `"Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif` | 正文、西文、数字均用本地字体；不引 Outfit 文件或 CDN |
| `--font-note` | `"Kaiti SC", "STKaiti", "KaiTi", "PingFang SC", "Microsoft YaHei", sans-serif` | 只用于 hero 装饰便签短语，无楷体时正常回退 |
| `--text-body` | `16px` | 正文、表单、消息 |
| `--text-small` | `14px` | 辅助文字、状态标签；非关键脚注最低 12px |
| `--text-card-title` | `18px` | 物品卡标题，字重 600 |
| `--text-h2` | `24px` | 区块标题，字重 600 |
| `--text-h1` | `clamp(28px, 2.4vw, 36px)` | 页面主标题，字重 700 |
| `--text-hero` | `clamp(30px, 3vw, 40px)` | 首页主标题，字重 700 |
| `--leading-body` | `1.75` | 描述、证明、消息 |
| `--leading-heading` | `1.35` | 标题；中文 letter-spacing 为 0 |
| `--space-1/2/3/4` | `8px / 16px / 24px / 32px` | 保留现有含义，不全局放大旧变量 |
| `--space-5/6`（新增） | `40px / 48px` | 桌面大区块留白 |
| `--space-xs`（新增） | `4px` | 图标微间距 |
| `--radius-control` | `10px` | 输入框与按钮 |
| `--radius-card` | `16px` | 业务卡片、panel |
| `--radius-modal` | `20px` | 弹窗 |
| `--radius-paper` | `4px` | 装饰纸片，避免所有元素胶囊化 |
| `--motion-hover` | `160ms` | hover 颜色、边框及抬升 |
| `--motion-page-out/in` | `80ms / 200ms` | 页面总过渡 280ms，退出快于进入 |
| `--motion-card` | `360ms` | 单卡入场 |
| `--motion-stagger` | `30ms` | 首批卡片错峰，最多延迟 90ms |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | 进入、普通反馈 |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | 退出 |
| `--ease-back-out` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | CSS 对 back.out 的近似，无需 GSAP |

正文行长以 60–75 个西文字符宽度为上限参考，长中文描述自然换行；统计数字使用 tabular-nums、字重 700、字距 -0.02em。不要给所有中文标题负字距。

## 2. 逐处改动清单

下表为后续实施文件，不代表本轮已修改。全部 CSS 改动应回到原规则块；合并末尾重复项，保留输入错误、忙碌、禁用、长文字换行和焦点保护。不要再追加第三套覆盖。

### 2.1 公共外壳与组件（协调者，影响 F01–F12）

| 文件:选择器/组件 | 改什么 | 为什么 |
|---|---|---|
| `src/styles.css: :root、暗色媒体查询` | 用令牌表替换；暗色改为属性选择器；明/暗分别声明 color-scheme | 默认浅色与原生表单色一致 |
| `src/styles.css: body、h1–h4、p、small、label` | 应用字号层级；正文 16/1.75、辅助 14px、标签 14px/600；脚注保留 12px | 从小而密的控制台感转为阅读界面 |
| `src/styles.css: .main-content、.main-footer、.topbar` | 桌面内容 padding 40px，段落区块间 32px，标题与内容 24px；保持现有最大宽度、侧栏占位 | 留白增加而不更换布局骨架 |
| `src/styles.css: .sidebar、.nav-item、.kindness、.avatar` | surface 导航，mint 选中底、green 字；kindness 用 paper；导航字 15px，点击高度 ≥48px | 明亮外壳与亲和的校园提示 |
| `src/App.tsx: .topbar-actions` | 加主题按钮，保留账号与登录入口顺序；主题按钮固定至少 44×44px | 主题入口全页可达且窄屏不挤压登录 |
| `src/App.tsx: main 条件渲染` | 加纯呈现过渡层，按第 4 节处理退出与取消 | 避免卸载后只剩入场动画 |
| `src/styles.css: .panel、.button、.icon-button、.text-button` | panel 16px 圆角/细暖边/轻影；主按钮 48px，small 与图标按钮 44px；按钮间距 ≥8px | 统一视觉与触控面积 |
| `src/styles.css: input/select/textarea、.stack-form、.form-row` | 控件高度 ≥48px，文本域 ≥128px；字段间 24px、标签距控件 8px；强边界不换成装饰浅边框 | 减轻拥挤并维持可识别性 |
| `src/components/ui.tsx: Status、ErrorBox、Info、Loading、Empty、PageHeading` | 保持现有语义、role 和标签映射；CSS 统一色与排版，Empty 垂直 padding 48px（手机 32px） | 无需改状态定义就获得一致反馈 |
| `src/styles.css: .status.red、.error-box、.button.secondary.danger、错误 label` | 文字改 danger-text；边框 red；禁用/busy 规则优先于 hover，禁用不透明化 | 防止错误文字和禁用态过淡 |
| `src/components/ui.tsx: Modal；src/styles.css: .modal*` | 保留 Escape、遮罩关闭、滚动锁和焦点返回；桌面内边距 32px、手机 20px；宽度不超过视口减 32px，高度不超过 100dvh 减 32px，内部可滚动 | 确认流程不变且键盘、手机可用 |
| `src/styles.css: .toast` | 保留 4500ms 展示时长、role=status、居中定位；入场只动 opacity，避免覆盖 translateX | 提示稳定、不引入业务等待 |

### 2.2 首页、详情与发布（csw，F04–F06；详情关联 F07/F09）

| 文件:选择器/组件 | 改什么 | 为什么 |
|---|---|---|
| `src/styles.css: .hero、.hero-copy、.hero-note、.hero-actions` | hero 改 paper，桌面 padding 40px/手机 24px，高度由内容决定；正文限宽约 34em，标题下 16px、按钮前 24px | 暖纸布告而非大块绿色面板 |
| `src/styles.css: .art-note、.note-one、.note-two、.paper-pin、.art-orbit` | 倾角改 -3°/+2°；取消硬质偏移阴影，改 shadow；图钉用 10px 圆头加 2px 针脚与 shadow-pin；隐藏装饰 orbit 虚线圈 | 保留便签隐喻，降低科技感与玩具感 |
| `src/styles.css: .hero::before、.art-note::before`（新增） | 仅此两类区域铺纸纹：伪元素 pointer-events:none，内容层在上；用 3/5/7px 不同周期的 0.5px 微点径向背景叠加，颜色 paper-grain，静态无滤镜；不铺在表单和图片上 | 离线细颗粒，不新增图片文件或昂贵噪声滤镜 |
| `src/styles.css: .art-note b、.hero-note` | 装饰短语 font-note 16px；业务正文仍 font-ui；保持 hero-art 的 aria-hidden | 手写感不承担关键信息 |
| `src/styles.css: .stat-strip、.stat-icon.*` | padding 24px，数字 28px，说明 14px；背景 surface；green/amber 图标分别用语义色，blue 类名保留但外观改中性色 | 统计可读但不成为仪表盘视觉中心 |
| `src/styles.css: .search-bar、.segmented、.filters、.category-filters` | 搜索高度 ≥48px；筛选组之间 16px，底部到卡片 24px；选中项 mint+green+字重，控件边界 control-border | 扫读层级明确，不改筛选流程 |
| `src/styles.css: .item-grid、.item-card、.item-card-body/footer` | grid 最小卡宽 260px，gap 24px；卡体 padding 20px、标题 18px、元信息 14px、底部上下 16px；保留图像占位比例与长标题换行；手机单列 | 减低密度，避免靠截断换取整齐 |
| `src/modules/items/Explore.tsx: ItemCard、items.map` | 增加纯展示的入场索引/是否入场属性，稳定 item.id key；卡片可加无语义外层承担入场，原 button 承担 hover | 避免两个动画争抢 transform；点击与键盘行为保持 |
| `src/styles.css: .guide-card、.safety-note、.right-rail` | guide 内边距 24px，步骤间 16px，安全提示用 orange-soft 和 orange；不新增栏目 | 右栏像公告附注而非另一个功能入口 |
| `src/styles.css: .detail-layout、.detail-copy、.description、.claim-form、.matches` | 图文 gap 32px；描述 16/1.75，段落 16px；认领表单与推荐区上方各 24px；标签不倾斜 | 详情、证明与推荐的阅读顺序不变 |
| `src/styles.css: .publish-form、.form-section、.type-picker、.upload-zone、.form-submit、.form-help` | 桌面表单 padding 32px、手机 20px；章节隔 32px，字段隔 24px；类型选中加边框+字重；上传虚线用 control-border、底用 soft；提交区上方 32px | 纸质登记表感，同时保留类型与上传反馈 |
| `src/modules/items/Publish.tsx: Publish` | 原表单字段、校验、提交、编辑复用均不变；只在需要时添加展示 class | 不把视觉改造变为步骤式发布或业务重构 |

### 2.3 认领（stt，F07–F09）

| 文件:选择器/组件 | 改什么 | 为什么 |
|---|---|---|
| `src/styles.css: .claims-layout、.claim-list-row、.claim-detail` | gap 24px；列表行 padding 20px、行间信息间距 8px；选中 mint 底加内侧 3px green 标识；详情 padding 32px/手机 20px | 分清当前申请，维持列表与详情关系 |
| `src/styles.css: .claim-state.*、.claim-progress、.proof-box` | 状态使用文字+语义色；进度文字至少 14px，步骤间 16px；证明区 soft 底、20px padding；不旋转、不加纹理 | 核验信息必须可信且易读 |
| `src/styles.css: .claim-action-bar、.conversation-heading、.messages、.message > p、.message.mine p` | 操作间距 ≥8px可换行；会话标题上方 32px；双方气泡 surface/mint、正文 ink；气泡 12px 16px、最大宽度 85%，消息间 16px | 阅读和操作各有空间 |
| `src/modules/claims/Claims.tsx: Claims、messages.map、确认/争议 Modal` | 状态流转、刷新、发送、确认弹窗保留；列表/消息刷新不重播入场；无自动滚到底等新交互 | REST 刷新不引发跳动或改变工作流 |

### 2.4 个人中心与登录（xzh，F01–F03）

| 文件:选择器/组件 | 改什么 | 为什么 |
|---|---|---|
| `src/styles.css: .profile-banner、.profile-layout、.avatar-large` | banner padding 32px/手机 20px，文字间 8px；头像保留字头像，背景 mint；布局 gap 24px | 温和清晰的身份摘要 |
| `src/styles.css: .tabs、.my-items > article、.my-item-info、.row-actions` | tab 高度 ≥48px、活动下划线保持；记录行 padding 24px、标题 18px、辅助 14px；按钮可换行 | 个人记录有呼吸感，不改变标签页与编辑/撤回位置 |
| `src/styles.css: .settings-form、.verification、.verified` | 设置 padding 32px/手机 20px，验证提示留 24px；成功用 green/mint；保留“演示”语义 | 不将校园演示绑定包装成真实认证 |
| `src/modules/users/Users.tsx: LoginDialog、Profile；src/styles.css: .login-intro、.demo-accounts` | 登录介绍 16px，演示账号区域 soft 底、16px padding；保留注册切换、真实标签与错误提示 | 弹窗与全站统一且不影响登录流程 |

### 2.5 管理工作台（gbl，F10–F12）

| 文件:选择器/组件 | 改什么 | 为什么 |
|---|---|---|
| `src/styles.css: .admin-stats、.admin-badge、.admin-panel、.admin-toolbar` | 统计面板 padding 24px、数字 28px；toolbar padding 24px；白/暖炭底，禁用全区深绿底与渐变 | 保持效率但不呈现监控台气氛 |
| `src/styles.css: .table-scroll、table/th/td、.table-item、.row-actions` | 表头 soft、文字 muted 14px，正文 15px；单元格纵向 16px/横向 20px，长标题可换行；保留表格语义与局部横滚 | 表格松而不散，手机不撑宽整页 |
| `src/styles.css: .dispute-list article、.resolution、.backup-list article` | 行内 padding 24px、区块 gap 24px；结论使用 soft，危险恢复按钮维持红色 | 争议结论与恢复风险清晰可辨 |
| `src/modules/admin/Admin.tsx: Admin、审核/争议/恢复 Modal` | tabs、权限、确认文案、恢复确认条件不变；统计卡可入场，表格行/备份列表不做 stagger | 避免审查数据出现延迟或动画误导 |

## 3. 主题切换实现契约

1. **样式文件：** 移除所有 `prefers-color-scheme: dark` 主题覆盖；`:root` 默认 light，`:root[data-theme="dark"]` 才设 dark。全局背景、原生控件、选中/错误/禁用态全部使用令牌；不使用 CSS filter 反转图片。
2. **初始化位置：** 后续修改 `index.html` 的 head，在应用模块和页面内容绘制前执行极短的同步主题初始化。本文未读取或改动该文件，执行者先确认现有 head/CSP 位置。读取键 `shiguang-campus-theme`；仅接受 `light`、`dark`；缺失、非法或读取异常一律 light，并立即写入 documentElement.dataset.theme。所有存储访问包在异常保护中；不读取系统暗色偏好，不增加“跟随系统”选项。若 CSP 不允内联，用同源极小外部初始化脚本并遵守现有策略，不放宽 CSP。
3. **React 状态：** `App.tsx` 的 Theme 类型为 light/dark，useState 懒初始化读取已设置的 html 属性，非法则 light。切换时同步更新 React 状态和 html 属性，再尝试 localStorage.setItem；存储失败时当前页面仍能切换，下次访问默认浅色，不中断业务。
4. **入口：** `.topbar-actions` 新增 type=button 的主题按钮，使用已有 lucide-react 图标能力，不装图标包。固定可访问名称“深色主题”，`aria-pressed` 表示是否开启；title 提示“切换为浅色/深色”。宽屏可显示“浅色/深色”当前模式字样，窄屏只留图标及可访问名称。按钮不放在可能隐藏的侧栏底部。
5. **刷新与多标签页：** 刷新恢复手动选择；storage 事件监听同一键，按相同白名单更新界面；删除键恢复 light。不因登出清除主题；不将选择写到用户资料/API，不干扰 auth token。
6. **无闪烁原则：** 首次无存储访问直接浅色；已保存 dark 必须在首帧设置属性。主题变化立即生效，不做全页颜色过渡或白黑闪动。禁用 JS 时 CSS 仍可呈现浅色。

## 4. 动效规格与实现边界

### 4.1 页面切换：80ms 退出 + 200ms 进入

只在五个顶层 page 值真正变化时触发。初次打开不播放退出；重复点击当前页、主题切换、toast、version、搜索、选中认领、页内 tabs 均不算顶层切页。

`App.tsx` 保留 page 为业务目标状态，另设 displayedPage 与 phase（idle/out/in）作为呈现状态，过渡序号用 ref。导航仍按原逻辑更新 hash；navigate 与 hashchange 都汇入同一个去重的过渡请求，不能产生两轮动画。

时序：先让旧页面 opacity 1→0（80ms ease-in），期间旧内容 inert、不可重复点击；退出完成后切 displayedPage，挂载目标页并保持现有权限判断，再 opacity 0→1（200ms ease-out）。新页面一挂载即可交互。外壳、导航、topbar、全局 toast 不参与淡出。滚动复位与现有 navigate 行为保持，不给浏览器前进后退新增强制滚动规则。

边界必须实现：

- 不保留两份活业务页面，不复制表单、ID、请求或弹窗。旧页在退出结束后卸载，新页此时挂载。
- displayedPage 只决定展示分支；当前 user/authReady 和权限判断必须实时生效。退出登录、权限失效优先立即卸载受保护内容，取消正在进行的过渡，不等待 80ms。
- 快速连续切页以最后一次目标为准：退出中只替换待进入目标；进入中先取消当前动画再执行下一次过渡；递增序号，过期回调不再提交状态。若最终目标回到 displayedPage，取消退出并恢复可见可操作。
- 用户触发的成功提交、编辑等仍传递原 editing/notify/onDone 数据；不可为了动画缓存旧 user、旧 item 或把 version 并入过渡 key。
- 监听当前层自身的 animationend（排除子节点冒泡），并设 120ms/240ms 的安全完成计时器；清理旧计时器和监听。隐藏标签页、组件卸载、减少动效开启时直接收敛到目标页，不能停在 opacity 0。
- 过渡时若焦点在旧内容内，卸载前移到常驻 main（tabIndex=-1），新页可见后聚焦其标题或 main；若焦点在导航/主题按钮则保留。不得让 inert 子树保有焦点；不要改变 Modal 已有焦点恢复规则。

### 4.2 逐处动效表

| 位置 | 触发与属性 | 时长/缓动 | reduced-motion 降级 |
|---|---|---|---|
| 顶层 page 呈现层 | 顶层 hash/page 变化，纯 opacity | 出 80ms ease-in，入 200ms ease-out，总 280ms | 不等待事件/计时器，直接显示目标页 |
| 首页 `.item-grid` 卡片外层 | 每次真实进入 explore 后，第一批成功加载的卡片；y 10px→0，opacity 0→1 | 位移 360ms back-out，opacity 180ms ease-out；索引 0/1/2/≥3 延迟 0/30/60/90ms，整批 ≤450ms | 无位移、无延迟、完全可见 |
| `.admin-stats > div` | 真正进入 admin 后首次展现，不随统计刷新 | 同卡片，三张延迟 0/30/60ms | 静态显示 |
| `.button、.item-card、.claim-list-row、.type-picker button` | fine pointer+hover 且非禁用/忙碌；y 0→-2px，阴影增强 | 160ms ease-out；离开 160ms；按下回 0 | 取消位移/阴影动画，保留即时颜色反馈 |
| `.modal-backdrop、.modal` | 弹窗打开，遮罩与内容纯 opacity | 160ms ease-out；关闭立即卸载 | 立即显示/关闭，焦点逻辑照常 |
| 移动 `.sidebar` | 已有开关触发 translateX | 开 220ms ease-out、关 140ms ease-in | 立即切换；仍有遮罩和焦点约束 |
| `.toast` | 文本提示出现，opacity | 入 160ms ease-out；4500ms 后立即卸载 | 静态提示，展示时间不缩短 |
| `.spin、button[aria-busy]::after` | 已有加载或提交 | 保留 1s linear 循环，仅加载时 | 停止旋转，保留静态图标与“正在加载”/按钮语义 |
| 主题、状态更新、消息新增、筛选分页 | 直接呈现结果 | 无装饰入场、无数字滚动 | 同常规 |

stagger 触发门控放在 App 的页面访问周期中，不能只放在 Explore 内的 useRef：其 `key={version}` 重挂载会清空局部 ref。每次顶层访问最多消费一次入场许可；空列表/加载中不消费，首次成功非空结果才消费。后续筛选、翻页、刷新、通知导致的重挂载不重播。页面淡入与首批卡片入场可重叠，不串联额外等待；仅屏幕首批最多 8 张播放，其余直接显示。内容默认可见，只在明确添加动画标记时播放，不用永久 opacity:0 隐藏列表。

入场外层与 hover 按钮分离；动画结束移除入场样式，不保留 forwards 对 transform 的控制。不动 width/height/top/left，不做全屏模糊、持续漂浮、循环图钉动画，不常驻 will-change。

移动导航现有 visibility:hidden 会吞掉关闭动画：用 visibility 的延迟隐藏与 140ms 关闭过渡配合；关闭时立刻禁止指针和键盘进入，动画只保留画面。减少动效时 visibility 不延迟。

全局 `@media (prefers-reduced-motion: reduce)` 合并到样式末尾：animation/transition 均关闭、delay 为 0、scroll-behavior:auto；卡片 transform:none。注意不能对所有元素一刀切 transform:none，否则会破坏侧栏隐藏与 toast 居中。JS 同步监听 matchMedia 的 change，立即取消待完成动效并收敛呈现状态；不将短至 0.01ms 作为唯一降级。

## 5. 响应式定值与浏览器验收

### 5.1 三档布局目标

保留现有 1550/1250/1080/760/520px 断点，不添加新的信息架构。局部 gap/padding 可以覆盖，不能靠更换 DOM 阅读顺序挤出空间。

| 检查项 | 375px | 768px | 1440px |
|---|---|---|---|
| 导航 | 原移动抽屉，关闭时不可聚焦 | 保留现有固定侧栏（≤1250 为 208px），不是手机抽屉 | 固定侧栏 224px |
| 主内容左右留白 | 16px；可用宽约343px | 24px；剩余宽度扣侧栏后约512px | 40px |
| panel 内边距 | 20px | 24px | 表单/详情32px，普通卡片24px |
| 首页卡片 | 单列；gap 20px | 现侧栏下可用宽不足两张260px，单列 | 主列表通常两列，保留右栏；不强行三列 |
| hero | 不显示装饰插画，文字按钮换行 | ≤1080仍隐藏插画 | 显示轻倾斜便签，文字和插画不重叠 |
| 发布/认领/个人中心 | 按既有规则纵向堆叠 | ≤1080按既有规则单列 | 保留原双区域结构 |
| 管理统计/表格 | 统计单列；表格仅自身容器横滚 | 统计保持原布局并允许文字换行；表格局部横滚 | 统计三列；表格完整显示 |

375px 下主题按钮、账号/登录、移动导航入口都必须可达；topbar 允许换行，不压缩为低于44px的触控目标。说明文字不可为凑一屏重新降为12px。

### 5.2 接手者逐条执行（本轮均未执行）

验收记录每条的主题、视口、页面、截图/录屏和通过/失败；两主题 × 三宽度覆盖五页，不能只验首页。建议同时记录视口高度（例如 812/1024/900），并在原有数据可用时测试，不上传真实校园数据。

- [ ] **主题初始值：** DevTools Application 删除主题键，Rendering 模拟系统 dark，硬刷新；首屏仍暖白，html 属性 light，原生输入框为浅色。改系统 light/dark 不影响页面。
- [ ] **手动与持久化：** 切 dark 后刷新仍 dark；切 light 后刷新仍 light。非法值、清除键、存储禁止时默认 light 且控制台无未捕获异常。开两个标签页检查同步；登出不清除主题。
- [ ] **首帧：** 保存 dark 后用性能录屏/慢速加载刷新，首个可见画面不先出现白底再闪暗；无外部字体网络请求，断网保留页面字体和已有本地素材。
- [ ] **颜色：** 在 DevTools 检查正文、辅助、placeholder、四类状态、主/危险/次按钮常态与 hover 的实际前景背景对比；普通文字≥4.5:1，控制边界与焦点≥3:1。纸纹区域按最差底色核对，不用平均底色掩盖局部不足。
- [ ] **三档布局：** 逐档查看五页及登录、物品详情、认领确认、管理员确认弹窗；整页 document.scrollWidth 不大于视口宽。只有管理表格自身允许横向滚动；抽屉、弹窗不会把页面撑宽。
- [ ] **长内容：** 用80字标题、长地点/姓名、2000字描述/证明、1000字消息及长错误文本检查换行；标签不覆盖标题，操作按钮不溢出，弹窗底部按钮可滚到。200%缩放无关键内容丢失。
- [ ] **键盘：** 从导航经主题到表单/列表完整 Tab；焦点环无遮挡、不被圆角裁切，主题可用 Enter/Space；Modal Escape/Tab约束/关闭后焦点返回仍有效。手机关闭抽屉不可聚焦内部元素。
- [ ] **页面时序：** DevTools Animations/录屏检查退出80ms、进入200ms；连续快速点 explore→publish→profile、浏览器前进/后退、重复点击当前项，最终页面与hash一致，无幽灵点击、空白页或重复挂载的弹窗。
- [ ] **权限和上下文：** 动画期间退出登录，受保护内容立即消失；从个人发布点编辑仍显示正确item；提交完成后仍到原目标；toast/version刷新不重播整页/卡片。原后台角色限制不因 displayedPage 延迟绕过。
- [ ] **卡片与微动效：** 首批入场360ms，延迟最多90ms；hover抬升恰为2px；入场期间 hover 不跳位；筛选/分页/刷新/消息新增不重播。管理表格数据立即可读。
- [ ] **减少动效：** Rendering 开启 reduce 后重新访问，再在动画中动态开启：页面立即收敛，无stagger/抬升/旋转；加载文字仍在，侧栏位置、toast居中、主题切换不损坏。
- [ ] **静态视觉：** 1440px 首页纸纹接近不可察觉、无摩尔纹，图钉只投小阴影；业务卡片端正、无渐变卡面；375px 正文仍16px，区块之间至少24px（紧凑卡片间20px）。
- [ ] **性能：** 在普通和4倍CPU降速录屏各切页一次、打开详情一次；检查无持续重绘、纹理不触发全屏滤镜、无动画导致的布局位移。记录设备与实际结果，不预填60fps或CLS实测值。
- [ ] **业务回归边界：** 用既有演示数据验证登录/发布校验/筛选/认领确认/消息/个人编辑/管理tabs的既有操作和错误可见性。备份恢复仅可用隔离数据，不能为验视觉操作真实备份。

实施者最终自行运行项目既有前端构建及与实际改动相应的检查；本轮按约定不运行构建或测试，不声明任何功能测试已通过。

## 6. 风险、回退与实施顺序

### 6.1 风险与局部回退

| 风险 | 防范与触发回退条件 | 回退方式 |
|---|---|---|
| 新浅边框过淡、琥珀/红色文字对比不足 | 分离装饰边/控件边、强调色/文字色；实际不达标即阻断该配色交付 | 只加深对应文字/边界令牌，保留暖白背景 |
| 纸纹重复、模糊、绘制成本高 | 只在hero/装饰便签使用，100%/200%缩放与低性能检查 | 关闭两个伪元素，保留纯paper底；不影响布局 |
| 字体回退使宽度变化 | 不依赖 Outfit/KaiTi 必然存在；按钮和标题可换行 | 装饰也回退 font-ui，保留排版层级 |
| 动画引入旧状态、空白页、重复提交 | 序号取消、超时完成、权限实时判定、旧层inert；异常即停用过渡 | 恢复App原即时条件渲染，保留主题与CSS；不能回滚业务修复 |
| stagger与hover冲突或刷新重播 | 分离外层与button；许可跨Explore重挂载存活 | 移除入场标记/外层，保留原button及2px hover |
| 存储故障或首帧闪色 | try/catch、白名单、head预初始化 | 退回恒定浅色并隐藏主题入口；不删其他localStorage键 |
| 间距放大挤压768px与管理操作 | 定值检查最窄固定侧栏档；允许局部表格横滚 | 仅回退受影响容器padding/gap，不整体缩字体 |
| 样式末尾旧规则覆盖新值 | 改原规则并合并重复项，逐组件查Computed | 回退对应小批次CSS，不删除全部无障碍覆盖 |

### 6.2 可交接实施批次（本轮不执行）

- [ ] **A：令牌与主题** — 协调者先实现 styles.css 两套令牌、index.html 初始化、App 主题入口；检查第5节主题与对比度。共享影响先向四模块说明。
- [ ] **B：排版与纸质视觉** — 按2.1至2.5修改既有规则，清理相关重复覆盖；对应负责人核对五页，完成三档静态与键盘验收。禁止顺手调整状态映射、路由或文案含义。
- [ ] **C：动效** — 先独立实现页面过渡与取消，再加卡片许可/外层，最后统一微动效与reduce；执行快速切页、登录退出、version刷新和动态reduce用例。失败时可以独立回退C。
- [ ] **D：整体验收** — 两主题三宽度检查、运行接手者所需构建/测试、记录真实输出与未完成项；只在有证据时标记通过，不以本文验收目标冒充结果。

执行前保存现有工作区差异或建立只包含本次改动的可回退检查点；当前仓库已有修改和未跟踪文件，不使用整仓reset或clean。回退只撤销执行者本次批次；不推送、不部署。

## 7. 本轮交付状态

需求/设计已落到本文，覆盖 F01–F12 的展示层；实现文件与责任人见第2节，主题与动画契约见第3–4节。未完成项是全部代码实现、构建、测试与浏览器验收，均留给接手者。无新增依赖、无外部字体、无API/共享类型/数据库变更；本文不是个人开发历史或功能完成证明。
