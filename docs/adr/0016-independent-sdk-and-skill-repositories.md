# SDK 与 Skill 使用独立仓库和发布周期

Status: accepted

来源：FlowSVG [`07cf031`](https://github.com/yokingma/FlowSVG/blob/07cf031/docs/adr/0016-independent-sdk-and-skill-repositories.md)。本仓保留与 Skill 有关的决策和职责边界。

本决策已在拆分访谈中确认，新仓快照已经建立，完整独立验收及原仓切换仍待完成。FlowSVG 原仓库将保留 SDK、showcase 和宿主示例；Flow SVG Diagram Skill 及其专属测试、工具、文档和 CI 将迁入独立仓库。两者需要不同的维护与发布周期，因此选择拆仓，而非继续同仓维护。新仓采用当前快照起步并记录来源仓库与提交，完整历史留在原仓。

SDK 仓库维护图解模型、运行 API、渲染、播放和导出契约。Skill 仓库维护创作、布局计划、检查、复核与交付契约，并通过隔离运行时消费公开 npm SDK。Skill 安装单元必须自包含，两仓的运行和测试均不能依赖本地兄弟仓库。SDK 模型和 API 的必要使用说明可随 Skill 安装单元分发，注明适用基线。

SDK 继续通过 npm 发布；Skill 通过独立 GitHub 仓库分发，采用独立版本。本次保持精确锁定的 `flowsvg@0.2.2` 及完整性信息，Skill 拆分后首版为 `v0.1.0`。后续 SDK 升级需要在 Skill 仓库更新基线并重新验收，不能由用户运行时自动升级。

本仓按独立维护实施本决策；原仓切换完成后同步取代 [ADR 0006](0006-authoring-skill-uses-public-sdk.md) 的“同仓库维护”前提，保留其仅通过公开 SDK 集成的原则。[ADR 0008](0008-shared-sdk-geometry-diagnostics.md) 中 SDK 提供几何诊断、Skill 编排检查的职责边界继续适用。

迁移先完成新仓独立验收，再清理原仓专属文件并验证 SDK 与示例。历史工作资料保留在原仓；新仓携带测试所需夹具、当前维护资料和必要的历史摘要。详细范围与切换标准见[拆分访谈记录](https://github.com/yokingma/FlowSVG/blob/07cf031/.scratch/sdk-skill-split/decisions.md)。GitHub 发布另行执行。
