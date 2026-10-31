# 图解创作 skill 使用独立环境中的公开 SDK

Status: accepted

来源：FlowSVG [`86bb7ad`](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/adr/0006-authoring-skill-uses-public-sdk.md)。本仓保留与 Skill 有关的决策和职责边界。

本 ADR 是当前 skill 集成决策记录；实际支持版本和安装行为以 skill 验收、SDK 公开产物和测试为准。

原决策的“同仓库维护”前提在本仓由 [ADR 0016](0016-independent-sdk-and-skill-repositories.md) 取代；SDK 原仓清理仍以完整独立验收为门槛。Skill 在独立仓库维护，安装后必须脱离源码仓库运行。skill 只通过公开 SDK 校验、测量和导出图解，不依赖源码内部模块、private showcase package 或应用构建。工具环境隔离于用户应用，使用锁定并通过验收的 SDK 版本，不跟随 npm latest 自动升级。这样可以复用公开 SDK 并独立维护文档和验收，同时避免用户必须克隆、构建整个项目，以及工具安装改变应用依赖。

## Consequences

- skill 的依赖与资料必须随独立分发流程准备；SDK npm 包不含完整仓库手册，所需 references 应自包含。
- 用户要求应用集成时，应用自身的 SDK 安装属于明确的集成任务；图解创作工具不借机修改应用依赖。
- 支持版本以实际安装产物和验收为依据，不能仅根据本地 package.json 推断 registry 产物的行为。
- Skill 与 SDK 独立维护和发布；版本对应规则由各自验收明确记录。
