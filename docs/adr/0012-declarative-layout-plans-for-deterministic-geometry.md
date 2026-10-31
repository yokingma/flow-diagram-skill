# 用声明式布局计划生成确定性几何

Status: accepted

来源：FlowSVG [`86bb7ad`](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/adr/0012-declarative-layout-plans-for-deterministic-geometry.md)。本仓保留与 Skill 有关的决策和职责边界。

FlowSVG 的图解创作由 Agent 负责来源语义、对象关系、阅读顺序和布局选择；skill 新增 `layout` 命令，负责把版本化的 `layout-plan.json` 转换为新的布局结果草稿。首版只支持静态图，原稿保持不变，布局结果保留显式坐标覆盖和所有 validate warning。

我们选择声明式布局计划与确定性布局策略的组合，而不是让每次任务生成一次性坐标脚本，也不引入会推断语义的通用自动布局引擎。这样可以把层、行、列、间距、分组尺寸和基础路由等重复计算固化，同时让 Agent 继续决定对象归属、关系方向、阅读顺序和不规则场景的表达方式。布局能力属于 skill 契约，不扩展 `diagram.json` 的公共 schema；布局策略只改变几何，不合并、删除、重排或补造信息。

## Consequences

- `layout-plan.json` 需要版本化、可验证，并以节点 ID 引用对象。
- `layout` 必须生成新的 draft，不能覆盖输入；后续交付仍通过现有 `validate`、`author` 和 revision 流程完成。
- 首批策略覆盖通用布局原语和静态分层架构；动画中的位置和尺寸继续由图解文档显式描述。
- 不规则场景使用显式布局覆盖；无法表达的情况由 Agent 调整计划或直接维护坐标。
- 布局产生的 warning 保留在结果中，由 Agent 按现有诊断与用户决定流程处理。
