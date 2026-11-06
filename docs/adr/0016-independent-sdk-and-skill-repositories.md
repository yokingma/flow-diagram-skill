# SDK 与 Skill 使用独立仓库和发布周期

Status: accepted

来源：FlowSVG [`07cf031`](https://github.com/yokingma/FlowSVG/blob/07cf031/docs/adr/0016-independent-sdk-and-skill-repositories.md)。本仓保留与 Skill 有关的决策和职责边界。

## 背景

SDK 与 Skill 的使用者、安装资源和验收范围不同，需要各自的维护与发布周期。因此采用独立仓库；本仓以有来源记录的文件快照起步，原仓保留完整开发历史。来源与许可见[来源说明](../../CONTRIBUTING.md#source-and-license-attribution)。

## 决策

SDK 仓库维护图解模型、运行 API、渲染、播放和导出契约。Skill 仓库维护创作、布局计划、检查、复核与交付契约，并通过隔离运行时消费公开 npm SDK。

Skill 安装单元必须自包含，两仓的运行和测试均不能依赖本地兄弟仓库。SDK 模型和 API 的必要使用说明可随 Skill 安装单元分发，并注明适用基线。

SDK 通过 npm 发布；Skill 通过独立 GitHub 仓库分发，采用独立版本。Skill 的精确 SDK 版本与完整性由运行时 manifest 和锁文件确定。SDK 升级需要在 Skill 仓库显式更新基线并重新验收，不能由用户运行时自动升级。

## 影响

本决策取代 [ADR 0006](0006-authoring-skill-uses-public-sdk.md) 的“同仓库维护”前提，保留其仅通过公开 SDK 集成的原则。[ADR 0008](0008-shared-sdk-geometry-diagnostics.md) 中 SDK 提供几何诊断、Skill 编排检查的职责边界继续适用。Skill 的源码分发与正式发布按本仓[发布流程](../releasing.md)验证各自的候选版本。
