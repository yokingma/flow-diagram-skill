# 发布指导

[项目说明](../README.md) · [中文用户指南](guides/flow-diagram-guide.zh-CN.md) · [维护指南](development/flow-diagram-maintenance.md) · [文档索引](README.md)

本文是 Flow Diagram Skill 的项目级发布指导，覆盖 GitHub 源码分发和腾讯 WorkBuddy 开放平台上架。两种发布共用候选提交、验收记录和安装单元。WorkBuddy 的入驻、主体认证和开发者资料已由发布者完成，本文只处理技能资产。

## 发布边界

- 本仓库发布的是 `skills/flow-diagram/` Skill 安装单元。根目录是开发、测试和维护工具，不作为 Skill 压缩包上传。
- FlowSVG SDK 独立发布。发布 Skill 不发布 SDK，也不会替用户升级 SDK。
- `skills/flow-diagram/runtime/` 中的 manifest、npm lock 和包版本属于运行时合同；只有 SDK 合同同时变更时才更新它们。
- 发布说明只能声明已经执行并留有证据的环境、检查和实际查看范围。配置了 CI 或写入文档，不等于已经执行。

## 1. 准备候选版本

1. 在干净的候选提交上工作。检查 `git status --short`、`git remote -v` 和当前分支，确认远程仓库和目标提交正确。
2. 更新根目录 `package.json`、`CHANGELOG.md`、中英文 README 与用户指南中的 Skill 分发版本。Skill 分发版本、工具版本、图解格式版本和 SDK 运行时基线分别管理，只有对应合同变化时才修改。
3. 检查根目录 `LICENSE` 与 `skills/flow-diagram/LICENSE`，并核对第三方包的许可证和来源说明。
4. 检查安装单元内部的相对链接、脚本导入、元数据、示例和 runtime 资源。复制到独立目录后，安装单元必须脱离本仓库运行。
5. 在验收记录中写入候选提交、分发版本、运行时基线、操作系统、Node/npm、浏览器和未执行的检查。

当前 Skill 仍是独立发布候选版本。只有完成候选验收并获得维护者授权后，才能创建正式标签或提交平台审核。

## 2. 验收候选版本

从干净检出开始：

```sh
pnpm install --frozen-lockfile
pnpm test
```

需要浏览器和 Node 18 拒绝测试时，提供已准备好的浏览器和真实 Node 18 可执行文件：

```sh
FLOWSVG_TEST_BROWSER="/path/to/chrome" \
FLOWSVG_TEST_NODE18="/path/to/node18" \
pnpm test:skill --maxWorkers=1

pnpm verify:consumer \
  --browser "/path/to/chrome" \
  --node18 "/path/to/node18" \
  --output acceptance/evidence.json
```

没有浏览器时可以运行部分测试，但必须记录跳过的用例。每个声称支持的平台和运行时都要有对应的实际执行记录。代表性 HTML、SVG、PNG 或 GIF 需要单独记录实际查看的文件、展示尺寸、背景、时间点和覆盖限制。

验收至少应确认：

- 完整测试和消费者门禁通过，或明确记录失败、跳过和未执行项目。
- 独立复制的 `skills/flow-diagram/` 可以准备 runtime，并运行 `doctor`、浏览器无关的 `author` 和 `finalize` 流程。
- 默认交付、静态导出、动画导出、审查记录、证据记录和失败恢复符合当前合同。
- README、用户指南、示例、维护文档和安装单元内的链接都能解析。
- 实际查看结论与程序检查、文件交付状态分开记录。

## 3. 构造 Skill 发布包

安装单元的目录结构如下：

```text
flow-diagram/
  LICENSE
  SKILL.md
  agents/
  scripts/
  references/
  examples/
  runtime/
```

从已审查的候选提交构造副本或压缩包，不直接修改 `skills/flow-diagram/`。包含安装单元中的全部受版本控制文件，尤其是 `runtime/package-lock.json`、`runtime/manifest.json`、`agents/openai.yaml`、参考文档、示例和脚本。排除 `node_modules`、运行时缓存、`.diagrams/`、`.scratch/`、本地日志、浏览器截图和私人证据。

在仓库外解压或复制发布包，重新运行安装单元的 `doctor`、浏览器无关 `author` 和 `finalize`，再计算压缩包校验值。记录包名、候选提交、文件清单、大小、校验值和验证结果。只有经过同样验证的压缩包才能上传或附加到发布页。

## 4. 发布到 GitHub

1. 确认候选提交、验收记录、变更说明和已知限制已经审阅。
2. 按项目约定创建 `v<Skill 分发版本>` 标签并创建 GitHub Release。Release notes 写明安装目录、Node/npm 要求、SDK 基线、主要变化、已验证环境、未完成检查和证据链接。
3. 只有经过同样验收的独立压缩包才能作为 Release 附件，并记录其校验值。
4. 发布后在退出登录的浏览器中检查公开仓库、标签、Release 页面和下载链接。用干净项目重演 README 中的安装命令，确认默认分支或标签包含预期安装单元。
5. 发布状态确认后，再同步 README、用户指南、维护指南和 CHANGELOG 中的候选版本措辞。

GitHub 源码公开、Skill 安装包可下载和 Skill 在宿主中可运行是三个独立事实，分别记录。

## 5. 发布到 WorkBuddy 开放平台

### 5.1 准备 WorkBuddy 技能副本

WorkBuddy 官方技能规范明确要求 `SKILL.md`，并给出以下 frontmatter 字段：

| 字段 | 官方要求 | 本项目准备方式 |
| --- | --- | --- |
| `name` | 必填，技能标识 | 使用发布时确认的技能标识 |
| `display_name` | 必填，中文展示名称 | 在发布副本中补齐 |
| `display_name_en` | 必填，英文展示名称 | 在发布副本中补齐 |
| `description` | 必填，说明用途和触发词 | 写清图解创作、修订、验证、导出等触发场景 |
| `description_zh` | 必填，中文详情介绍 | 根据平台展示长度编写 |
| `description_en` | 必填，英文详情介绍 | 根据平台展示长度编写 |
| `version` | 必填，技能版本 | 与本次发布的 Skill 分发版本一致 |
| `author` | 必填，合作方名称 | 使用已确认的发布主体名称 |
| `examples_zh` / `examples_en` | 选填，使用案例 | 建议提供真实可演示的中英文案例 |
| `allowed-tools` | 选填，工具白名单 | 只有平台要求且已验证时填写 |

本仓库当前 `SKILL.md` 的 frontmatter 面向通用 Skill 宿主。发布 WorkBuddy 时，在发布副本中补齐平台字段，保留正文、脚本和参考资料的相对关系；不要为了平台字段直接改写源文件，除非维护者另行确认源合同也要改变。

官方示例中的 YAML 拼写和格式问题不应照抄：冒号后保留空格，字段名以平台字段表和实际解析结果为准。

### 5.2 打包和提交

1. 从已验收的安装单元副本生成 zip，保留 `SKILL.md`、`references/`、`scripts/`、`examples/`、`runtime/` 和平台允许的其他目录。
2. 检查 zip 内没有 `node_modules`、缓存、任务工作区、私人证据或无关仓库文件。
3. 记录 zip 文件名、候选提交、WorkBuddy 元数据变更、文件清单和校验值。
4. 在开放平台的技能资产入口上传 zip，按当期页面填写展示信息、能力配置和其他表单项。
5. 等待平台解析结果。解析失败时，先检查 `SKILL.md`、zip 内层级、引用路径和子资源，再按平台联系渠道反馈。
6. 审核通过并上线后，使用公开入口安装技能，在对话中调用一个最小示例，记录安装、调用和结果页面的实际状态。

官方只明确要求 `SKILL.md` 和所引用的子资源目录。zip 根目录层级、图标字段、发布向导字段、审核时长、限制、分发范围和付费设置，以 WorkBuddy 当期页面和解析结果为准；不要把未确认字段写入源 `SKILL.md`。

## 6. 更新和失败处理

- **源代码或 Skill 内容更新**：创建新的候选提交，重新执行验收、构包和校验；不要覆盖已发布包的证据。
- **运行时或 SDK 更新**：同步 runtime manifest、npm lock、实现、测试、指南和验收记录；历史报告、导出文件和查看证据继续绑定原身份。
- **压缩包解析失败**：保留失败包和平台提示，逐项检查必需文件、YAML、引用路径、目录层级和不支持的资源；修复后生成新包并重新计算校验值。
- **平台审核退回**：记录退回原因和页面状态，先判断是展示资料、技能元数据、内容合规还是运行行为，再在发布副本或源项目中按授权修正。
- **上线后调用失败**：保留版本、对话输入、返回结果和平台错误信息；先复现已发布版本，再决定是否创建修订版本。

每次重试都要区分“包文件变了”“源内容变了”和“平台状态变了”。不能用新包的成功结果覆盖旧包的失败记录。

## 7. 官方来源和证据边界

本文引用的 WorkBuddy 技能资产页面：

| 页面 | URL | 用途 |
| --- | --- | --- |
| 技能 | <https://open.workbuddy.cn/docs/skill> | 包结构、SKILL.md 和子资源 |
| 联系渠道 | <https://open.workbuddy.cn/docs/contact> | 解析或运营咨询 |

官方页面未覆盖的后台字段、审核时长、限制和解析细节不在本文中固化。发布前重新打开上述页面，记录页面日期和实际表单；平台页面、解析结果和人工审核意见优先于本文的历史记录。

发布记录应至少包含：候选提交、Skill 分发版本、SDK 基线、验收命令和结果、包校验值、平台提交时间、平台返回状态、实际上线调用结果，以及尚未执行的检查。
