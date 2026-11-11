# UML与工程图源

共7张，每张同时保留可编辑SVG与2160×1560 PNG。SVG内是可读中文文本和图形；生成逻辑位于`scripts/generate-csw-diagrams.mjs`，没有引入新依赖。实际生成时间、Node与浏览器版本、画布溢出检查见`manifest.json`。图片已经实际查看，中文使用Windows微软雅黑，无缺字；生成检查只覆盖画布越界，不替代语义与视觉审阅。

| 编号 | 视图与语义 | 图源 | 图片 |
| --- | --- | --- | --- |
| 1 | 用例及成员边界，撤回include确认 | [SVG](01-use-cases.svg) | [PNG](01-use-cases.png) |
| 2 | OOA领域概念类与多重性，不是运行时类 | [SVG](02-domain-model.svg) | [PNG](02-domain-model.png) |
| 3 | OOD实际函数组件、接口和模块依赖 | [SVG](03-implementation-dependencies.svg) | [PNG](03-implementation-dependencies.png) |
| 4 | 发布成功序列与身份/字段验证边界 | [SVG](04-publish-sequence.svg) | [PNG](04-publish-sequence.png) |
| 5 | 详情异常→重试→当前数据序列 | [SVG](05-detail-retry-sequence.svg) | [PNG](05-detail-retry-sequence.png) |
| 6 | lifecycle/reviewStatus两维主要状态转移 | [SVG](06-item-state-dimensions.svg) | [PNG](06-item-state-dimensions.png) |
| 7 | 查询、失败及同条件重试活动 | [SVG](07-list-activity.svg) | [PNG](07-list-activity.png) |

方法入口：[OMG UML 2.5.1](https://www.omg.org/spec/UML/2.5.1/About-UML)。图为课堂交流中的精简工程视图，不声称做过形式化UML模型校验。实线/虚线含义按各图副标题；图6概括主要转移，不穷尽管理员复核和自环，不替代服务端守卫。

重新生成：在仓库根用权威运行时执行`node.exe scripts/generate-csw-diagrams.mjs`；实际Node绝对路径见验收脚本。可通过`CHROME_PATH`指定本机Chrome/Edge。修改生成器优先于直接改SVG，防止下次生成覆盖手工修改。重生成后逐张检查文字、箭头、概念/实现区分与源码一致性，并更新工程报告中的相关说明。
