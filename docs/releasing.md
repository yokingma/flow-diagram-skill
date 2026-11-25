# 发布指导

[项目说明](../README.md) · [中文用户指南](guides/flow-diagram-guide.zh-CN.md) · [维护指南](development/flow-diagram-maintenance.md) · [文档索引](README.md)

本文说明如何向 GitHub 和腾讯 WorkBuddy 开放平台发布 Flow Diagram Skill。两种发布共用候选提交、验收记录和安装单元。发布到 WorkBuddy 前，需要完成平台要求的入驻、主体认证和开发者资料。

## 发布边界

- 本仓库发布的是 `skills/flow-diagram/` Skill 安装单元。根目录是开发、测试和维护工具，不作为 Skill 压缩包上传。
- FlowSVG SDK 独立发布。发布 Skill 不发布 SDK，也不会替用户升级 SDK。
- `skills/flow-diagram/runtime/` 中的 manifest、npm lock 和包版本属于运行时合同；只有 SDK 合同同时变更时才更新它们。
- 发布说明只能声明已经执行并留有证据的环境、检查和实际查看范围。配置了 CI 或写入文档，不等于已经执行。

## 1. 准备候选版本

1. 在干净的候选提交上工作。检查 `git status --short`、`git remote -v` 和当前分支，确认远程仓库和目标提交正确。如果本地已有同名版本标签，检查其目标提交、SDK 基线、远程标签和 Release 状态。仅本地且尚未发布的标签可以在记录原标签对象和目标提交后校正；已发布标签保持不变，后续修订使用新版本。
2. 更新根目录 `package.json` 和 `CHANGELOG.md` 中的 Skill 分发版本，核对 README 与用户指南中的安装和下载说明。Skill 分发版本、工具版本、图解格式版本和 SDK 运行时基线分别管理，只有对应合同变化时才修改。
3. 检查根目录 `LICENSE` 与 `skills/flow-diagram/LICENSE`，并核对第三方包的许可证和来源说明。
4. 检查安装单元内部的相对链接、脚本导入、元数据、示例和 runtime 资源。复制到独立目录后，安装单元必须脱离本仓库运行。
5. 在验收记录中写入候选提交、分发版本、运行时基线、操作系统、Node/npm、浏览器和未执行的检查。

完成候选验收并获得维护者授权后，创建正式标签或提交平台审核；已发布版本的后续修订沿用同一验收流程。

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
  resources/
  runtime/
```

从已审查的候选提交构造副本或压缩包，不直接修改 `skills/flow-diagram/`。包含安装单元中的全部受版本控制文件，尤其是 `runtime/package-lock.json`、`runtime/manifest.json`、`agents/openai.yaml`、参考文档、示例和脚本。排除 `node_modules`、运行时缓存、`.diagrams/`、`.scratch/`、本地日志、浏览器截图和私人证据。

在仓库外解压或复制发布包，重新运行安装单元的 `doctor`、浏览器无关 `author` 和 `finalize`，再计算压缩包校验值。记录包名、候选提交、文件清单、大小、校验值和验证结果。只有经过同样验证的压缩包才能上传或附加到发布页。

## 4. 发布到 GitHub

1. 确认候选提交、验收记录、变更说明和已知限制已经审阅。
2. 按项目约定创建 `v<Skill 分发版本>` 标签，确认标签指向完成验收的最终候选提交，再创建 GitHub Release。Release notes 写明安装目录、Node/npm 要求、SDK 基线、主要变化、已验证环境、未完成检查和证据链接。
3. 只有经过同样验收的独立压缩包才能作为 Release 附件，并记录其校验值。
4. 发布后在退出登录的浏览器中检查公开仓库、标签、Release 页面和下载链接。用干净项目重演 README 中的安装命令，确认默认分支或标签包含预期安装单元。
5. 发布状态确认后，核对 README、用户指南、维护指南和 CHANGELOG 中的版本、标签和下载说明与正式发布一致；后续修订不得覆盖已发布记录。

GitHub 源码公开、Skill 安装包可下载和 Skill 在宿主中可运行是三个独立事实，分别记录。

## 5. 发布到 WorkBuddy 开放平台

### 5.1 准备 WorkBuddy 技能副本

WorkBuddy 官方技能规范明确要求 `SKILL.md`，并给出以下 frontmatter 字段：

| 字段 | 官方要求 | 本项目准备方式 |
| --- | --- | --- |
| `name` | 必填，技能标识 | 固定与安装目录 `flow-diagram/` 一致；配置覆盖不一致时拒绝打包 |
| `display_name` | 必填，中文展示名称 | 在发布副本中补齐 |
| `display_name_en` | 必填，英文展示名称 | 在发布副本中补齐 |
| `description` | 必填，说明用途和触发词 | 面向 Agent，覆盖创作、修订、继续任务、验证、诊断、导出和项目偏好管理的独立请求 |
| `description_zh` | 必填，市场详情页中文介绍 | 面向用户，简述能力和运行前提 |
| `description_en` | 必填，市场详情页英文介绍 | 与中文介绍的能力、运行前提一致 |
| `version` | 必填，技能版本 | 以 `--version` 或根 `package.json` 为准，配置文件不能覆盖 |
| `author` | 必填，合作方名称 | 使用已确认的发布主体名称 |
| `examples_zh` / `examples_en` | 选填，详情页“试试这样用”的案例 | 中英文案例逐项对应；每条包含新对话发起任务所需的请求，不依赖前一条案例 |
| `allowed-tools` | 选填，工具白名单 | 只有平台要求且已验证时填写 |

本仓库当前 `SKILL.md` 面向通用 Skill 宿主。发布 WorkBuddy 时，在副本中补齐平台字段，并在每个指向 `references/` 的 Markdown 相对链接后加入官方 `@references/<文件>.md` 加载指令；原链接和源文件保持不变。平台字段由 `scripts/package-workbuddy-skill.mjs` 从 `scripts/workbuddy-release.json` 注入。打包前核对发布主体、名称、描述、案例和版本。

WorkBuddy 上传解析器在 2026-11-25 返回了目录限制：Skill 包仅支持 `根目录/二级目录/文件`。此限制来自实际上传反馈，官方技能页面未明确列出。安装源目录直接遵循此限制：示例与说明都位于 `examples/`，使用 `complete-`、`capabilities-` 文件名前缀保留分类，分类索引为 `complete-README.md` 和 `capabilities-README.md`。发布包使用相同路径；打包器仅调整 `SKILL.md` 的平台元数据与引用指令，逐字节复制其他文件。源路径超限或包内 Markdown 链接失效时，打包器在写出产物前失败。

官方示例中的 YAML 拼写和格式问题不应照抄：冒号后保留空格，字段名以平台字段表和实际解析结果为准。

#### 规范对照审查记录

本节把官方页面要求逐项映射到 `pnpm release:workbuddy` 的发布产物，便于每次发布直接对照复审。审查日期 2026-11-24，对照页面 <https://open.workbuddy.cn/docs/skill>；页面未来变化以每次发布前实际打开为准，不在本节固化。

| 官方要求 | 发布产物现状 | 结论 |
| --- | --- | --- |
| `SKILL.md` 必须 | zip 根层级 `flow-diagram/SKILL.md` | ✅ 合规 |
| frontmatter 8 个必填字段 | 脚本合并源字段与 `scripts/workbuddy-release.json` 后逐项校验，缺一即失败；产物经独立 YAML 解析复核无缺失 | ✅ 合规 |
| `examples_zh` / `examples_en`（选填） | 各 4 条，`- "..."` 列表格式与官方示例一致 | ✅ 合规 |
| `allowed-tools`（选填） | 不输出；技能经 Bash 执行 `node`，平台若要求工具白名单需在配置中补充并实测 | ⚠️ 决策点 |
| YAML 格式（冒号后空格、无拼写错误） | 生成器统一 `key: "value"` 双引号标量、官方字段序；官方示例中 `display_name_en:切…`、`exmaple` 等拼写问题不照抄 | ✅ 合规 |
| `version` 与发布版本一致 | 默认取根 `package.json`，可 `--version` 覆盖；`release-manifest.json` 记录实际值 | ✅ 合规 |
| 包根目录为 `{skill-name}/` | zip 内全部路径以 `flow-diagram/` 开头 | ✅ 合规 |
| `references/`、`scripts/` 可选子资源 | 均存在且被 `SKILL.md` 引用；打包前脚本校验引用的相对路径全部在包内 | ✅ 合规 |
| `templates/` 可选子资源 | 本技能无模板目录（属可选） | ✅ 合规 |
| 子资源引用方式 `@references/xxx.md` | 发布副本在 `references/` Markdown 链接后生成对应 `@references/<文件>.md` 指令；源 `SKILL.md` 保持通用链接 | ✅ 符合官方文档用法；首次上传仍须确认平台实际加载 |
| 额外顶层目录（`runtime/`、`examples/`、`resources/`、`agents/`） | 官方目录说明只列三类子资源；页面未禁止其他目录。首次上传因更深的示例目录被拒绝，尚未确认修正包的整体解析结果 | ❓ 待重新上传确认 |
| 上传解析反馈：仅支持 `根目录/二级目录/文件`（2026-11-25） | 原包有 24 个示例路径超限；现安装源文件直接使用分类前缀，打包器保留路径并拒绝超限目录 | 本地预检通过；待重新上传 |
| zip 内无 `node_modules`、缓存、任务工作区、私人证据 | 仅从 `HEAD` 枚举安装单元文件；安装单元、发布配置值必须与 `HEAD` 一致；默认版本来源有未提交改动时拒绝打包 | ✅ 合规 |

复审要点：

- 每次发布前重新打开官方页面，核对上表第一列是否有新增或变更要求；有变化时先更新脚本或配置再出包。
- 每次平台提交后，记录解析结果并更新待确认项；审核退回时记录退回原因对应的行。目录限制已由首次上传错误确认，修正包仍需重新上传验证。
- 官方页面未声明字段长度、zip 大小上限、图标与后台表单字段；出现平台反馈时在本节追加新的对照行并标注日期，不删改历史结论。

### 5.2 打包和提交

1. 核对安装 `examples/` 仅含已选成品源及简短教学说明，`resources/` 仅含必需辅助资源与对应来源记录；候选、开发练习、截图、运行日志和过程版本留在安装包之外。
2. 运行 `node scripts/package-workbuddy-skill.mjs`（或 `pnpm release:workbuddy`）生成发布副本与 zip。脚本要求安装单元已提交且干净，`scripts/workbuddy-release.json` 的发布字段与 `HEAD` 相同（注释可本地更新）；默认读取版本时，也要求 `package.json` 已提交且干净。技能 `name` 必须匹配安装目录，配置不能覆盖；版本以 `--version` 或 `package.json` 为准，配置不能覆盖。只从 `HEAD` 枚举普通文件，拒绝未跟踪文件和符号链接；按 §5.1 改写副本 `SKILL.md` 的元数据与引用指令，保留其他文件的路径和字节。产物为 `{name}/` 根目录的 zip、副本 `SKILL.md` 和 `release-manifest.json`（候选提交、打包器 SHA-256、文件清单、大小、zip SHA-256）。文件清单同时记录包内 `path` 和安装单元内原始 `sourcePath`。可用 `--config`、`--output` 覆盖其他默认值。
3. 在仓库外解压 zip，确认每条文件路径最多为 `{name}/子目录/文件`。使用与源目录相同的示例路径运行 `doctor`、浏览器无关 `author` 和 `finalize`；核对包内链接、来源 `scope`、图解 JSON 字节、manifest 文件清单、候选提交、打包器摘要和 zip 校验值。本地预检不通过时不要上传。
4. 记录 zip 文件名、候选提交、WorkBuddy 元数据变更、文件清单和校验值。
5. 在开放平台的技能资产入口上传 zip，按当期页面填写展示信息、能力配置和其他表单项。
6. 等待平台解析结果。解析失败时，先检查 `SKILL.md`、zip 内层级、引用路径和子资源，再按平台联系渠道反馈。
7. 审核通过并上线后，使用公开入口安装技能，在对话中调用一个最小示例，记录安装、调用和结果页面的实际状态。

官方明确要求 `SKILL.md` 和所引用的子资源目录；实际上传反馈还确认了上述两级目录限制。图标字段、发布向导字段、审核时长、其他限制、分发范围和付费设置，以 WorkBuddy 当期页面和解析结果为准；不要把未确认字段写入源 `SKILL.md`。

## 6. 更新和失败处理

- **源代码或 Skill 内容更新**：创建新的候选提交，重新执行验收、构包和校验；不要覆盖已发布包的证据。
- **运行时或 SDK 更新**：先完成维护指南中的 [SDK 升级流程](development/flow-diagram-maintenance.md#sdk-baseline-upgrade)，再按本文准备发布候选。
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
