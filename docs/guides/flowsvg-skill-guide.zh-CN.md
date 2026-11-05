# Flow SVG Diagram 用户指南

[English](flowsvg-skill-guide.md) · [文档地图](../README.md)

**Flow SVG Diagram：面向系统和流程解释的可执行图表 Skill。一次编写，支持播放、嵌入、检查和导出。**

Skill 负责创作图解文档并指导检查；FlowSVG SDK 负责渲染和播放，应用内嵌使用 SDK 集成方式。“可执行”指播放作者定义的视觉状态与变化，不代表执行图中描述的系统或业务流程。

这份指南说明如何在支持 skill 的编程助手中安装和使用 Flow SVG Diagram。你用自然语言描述图解，助手先根据阅读问题选择表达模型，再组织来源支持的内容、编写图解 JSON、调用工具和解释检查结果。默认交付一个最终选定图解，包含可编辑 JSON、带播放控件的离线 HTML 和创作报告；草稿与检查截图只在任务期间保留，成功收尾后清理；只有明确要求时才保留完整历史。


首个独立 Skill 版本为准备中的 `0.1.0`。从 [flow-svg-diagram-skills](https://github.com/yokingma/flow-svg-diagram-skills) 获取源码，再按下文安装完整目录。需要可复现安装时，选择已有的发布标签或记录源码提交；manifest 中的版本号本身不证明 release 已发布。精确 SDK 基线仍为 `flowsvg@0.2.2`；升级需要维护者显式更新 manifest、lockfile 并重新独立验收，用户运行时不跟随 npm `latest`。

SDK API 的权威来源是[来源快照中的 SDK 手册](https://github.com/yokingma/FlowSVG/blob/86bb7ad29484d7deb63142c1df84c6944a7c0eb4/docs/guides/sdk-guide.zh-CN.md)；Skill 执行所需 references 随安装单元提供，不依赖在线手册。

## 文档入口和任务分流

本指南面向用户，覆盖安装、创作、修订、校验和导出。[SKILL.md](../../skills/flow-svg-diagram/SKILL.md) 面向执行任务的 Agent；测试、安装单元边界和验收范围见[维护指南](../development/flowsvg-skill-maintenance.md)。用户指南留在项目 `docs/` 中，安装和执行 skill 时无需复制本指南。按任务选择下一步：

| 任务 | 下一步 | 完成标准 |
| --- | --- | --- |
| 新建图解 | 阅读[创建第一张图解](#3-创建第一张图解)，再按需要加载语义模式和展示用途 reference | 报告链接最终选定图解的 JSON、HTML、检查结果和未解决事项 |
| 根据资料创作 | 阅读[根据指定资料创作](#4-根据指定资料创作)和[来源保真与信息取舍](../../skills/flow-svg-diagram/references/source-fidelity.md) | `sources.json` 与报告记录允许读取的来源和取舍 |
| 修订或诊断 | 阅读[修订已有图解](#6-修订已有图解)和[诊断与修订决定](../../skills/flow-svg-diagram/references/diagnostics-and-revisions.md) | 新版本明确父版本，保留原始警告并记录你的决定 |
| 导出静态图或 GIF | 阅读[按需导出 SVG、PNG 或 GIF](#7-按需导出-svgpng-或-gif)和[导出说明](../../skills/flow-svg-diagram/references/export.md) | 报告逐项说明请求格式是否完成；缺浏览器时明确未完成 |
| 只校验或环境失败 | 阅读[只校验，或直接使用命令行](#8-只校验或直接使用命令行)或[故障恢复](../../skills/flow-svg-diagram/references/troubleshooting.md) | 校验报告为 `validated`，或保留失败报告并给出下一步 |

## 适合哪些任务

- **演示文稿素材：**制作架构、流程和状态变化图解，按需导出 SVG、PNG 或 GIF，供 PPT 等演示软件使用。
- **网页讲解：**为技术文档或产品说明制作可暂停、回看的图解，交付离线 HTML；应用内嵌播放器使用 SDK 集成方式。
- **教学与培训：**分步解释请求过程、数据流和任务生命周期。
- **评审与复盘：**结合结构全貌，解释方案中的交互或有资料依据的故障过程。

说明目标读者、展示尺寸和需要的输出格式，有助于助手安排信息密度和演示节奏。默认仍交付 JSON 和离线 HTML；需要 SVG、PNG 或 GIF 时明确提出。skill 生成图解素材，不生成 PPTX 或 PowerPoint 原生形状；导入和播放效果取决于演示软件。

助手根据使用场景，采用[视觉设计方法](../../skills/flow-svg-diagram/references/visual-design.md)协调文字、间距、色彩、容器、标签、连线和动画。工具检查与 AI 检查提供证据和观察，最终设计效果由你判断。报告中的质量通过状态描述已记录的检查与覆盖范围。

随包的[语义模式指南](../../skills/flow-svg-diagram/references/semantic-patterns.md)覆盖请求响应、重试与状态迁移、汇聚与瓶颈、分阶段数据处理、带边界的系统架构和分层架构教学设定。示例是明确标记的教学设定，可用于起稿；真实业务关系仍须依据你的资料。[展示用途指南](../../skills/flow-svg-diagram/references/delivery-contexts.md)说明 PPT 静态素材、Web 正文插图和离线交互 HTML 的尺寸与检查范围。工具没有正式用途 preset 字段或命令行 preset；文档中的尺寸只是起始建议。SVG、PNG 和 GIF 都可按需导出，PNG 与 GIF 需要可启动的 Chrome/Chromium。

需要练习分层架构时，可从[分层架构教学示例](../../skills/flow-svg-diagram/examples/layered-architecture.json)开始。示例在每层保留多列、组内标题留白、层间带标签连线和治理侧栏。层序不等于调用时间顺序，分组不自动代表部署或信任边界，虚线治理说明也不增加未声明的运行时依赖。先对 draft 运行 `measure --input` 并写出独立的新草稿，再用新草稿创作；示例中的行高、列间距和连线标签净空是根据本示例字体验证的起点，不是通用布局参数。

如果静态图在文案变化后需要重复计算几何，请使用[布局计划工作流](../../skills/flow-svg-diagram/references/static-layout.md#layout-plan-workflow)。Agent 负责语义结构、对象归属、顺序和覆盖；布局策略只为已有 ID 计算坐标。不规则场景可以继续直接维护坐标。布局计划只改变几何，不推断含义，也不会消除 warning。[布局辅助教学草稿](../../skills/flow-svg-diagram/examples/layout-assistance.json)和[计划](../../skills/flow-svg-diagram/examples/layout-assistance-plan.json)使用虚构教学数据，其中的间距不是通用承诺。测量得到的高度是自动布局下限；`overrides[id].height` 始终精确，低于估算值时保留 `text-overflow` warning。

工作流要求静态草稿和显式计划。`measure` 会返回当前高度、所需高度、变化量和确定性估算行数；行数来自公开 SDK 基线，不是浏览器像素或正式 SVG/PNG 证据。之后运行 `layout --input <draft> --plan <layout-plan.json> --output <new-draft.json>`，再对新草稿运行 `validate`，然后进入 author。布局结果是草稿，不是版本或质量批准。正式 SVG/PNG 审查使用 `evidence` 读取已有文件，按需通过 `--artifact-preview-settings` 指定展示条件，查看每张 evidence 图片，再通过 `review --artifact-review` 显式指定主体和 evidence 来源。普通 preview 和 HTML review 只覆盖各自的采样 surface，不能覆盖正式图片。

分层结构与侧栏、带返回路径的分支流程、重复长内容卡片，可在排布前选择[组合设计配方](../../skills/flow-svg-diagram/references/visual-design.md#composition-recipes)。[渲染陷阱提示](../../skills/flow-svg-diagram/references/rendering-gotchas.md)按条件给出预防方法；[配方示例检查](../../skills/flow-svg-diagram/examples/README.md)区分设计起点与能力演示。改用其他展示宽度后需要重新查看。在[创建任务文件](../../skills/flow-svg-diagram/references/tool-contract.md#task-workspace)时确定日志等材料是否需要在收尾后保留。

## 1. 准备环境

- 安装 Node.js 20 或更高版本及 npm。运行助手的环境需要能找到 `node` 和 `npm`。
- 首次准备运行依赖时需要联网获取锁定的 npm 包；完整缓存准备好后可离线复用，npm 仍需保留。
- 截图检查、PNG 导出和 GIF 导出需要本机可启动的 Chrome/Chromium。JSON、HTML 和 SVG 生成不要求浏览器。

skill 包含浏览器控制库，不包含浏览器程序，也不会自动下载浏览器。宿主自带浏览器工具，不一定代表 skill 能找到对应的可执行文件；必要时向助手提供 Chrome/Chromium 路径。

直接使用命令行时，可运行 `node <skill-directory>/scripts/flowsvg.mjs --help`，或在 `author`、`validate`、`measure` 后追加 `--help` 查看当前选项。若只需要集中检查少数关键状态，可用 `author --samples <count>` 选择较小的确定性采样计划；报告会列出省略的候选点。

## 2. 安装到宿主

普通安装推荐从任意项目使用 Skills CLI：

```sh
npx skills add yokingma/flow-svg-diagram-skills
```

CLI 会发现随仓库提供的 `flow-svg-diagram` Skill，并在交互过程中询问要安装哪个 Skill 以及目标 Agent。若要无交互地安装到当前用户的 Codex 全局目录，执行：

```sh
npx skills add yokingma/flow-svg-diagram-skills --global --agent codex --yes
```

不加 `--global` 时安装到当前项目。`npx skills list`、`npx skills check` 和 `npx skills update flow-svg-diagram` 可管理 CLI 创建的安装。shorthand 默认跟随仓库分支；需要可复现安装时请使用 release tag 或固定提交。使用 Skill 只需 Node 与 npm，无需安装仓库的 pnpm 开发依赖。

手动安装或本地开发时，再克隆独立仓库或下载源码 ZIP，并将完整的 `skills/flow-svg-diagram/` 文件夹复制到下列位置之一。保留 `LICENSE`，以及 `SKILL.md`、`agents/`、`scripts/`、`references/`、`examples/` 和 `runtime/` 的相对位置，包括 runtime manifest 和 lockfile。`agents/openai.yaml` 配置 Codex 中的显示名称和简介，调用名为 `$flow-svg-diagram`。只复制 `SKILL.md` 无法运行工具。

| 宿主 | 仅当前项目可用 | 当前用户的多个项目可用 | 显式调用 |
| --- | --- | --- | --- |
| Codex CLI / IDE 扩展 | `<项目>/.agents/skills/flow-svg-diagram/` | `~/.agents/skills/flow-svg-diagram/` | `$flow-svg-diagram`；也可通过 `/skills` 查找 |
| Claude Code | `<项目>/.claude/skills/flow-svg-diagram/` | `~/.claude/skills/flow-svg-diagram/` | `/flow-svg-diagram` |

首次为当前用户安装时，在克隆目录执行。以下命令要求目标 `flow-svg-diagram` 目录尚不存在。

macOS/Linux（Codex）：

```sh
mkdir -p "$HOME/.agents/skills"
cp -R skills/flow-svg-diagram "$HOME/.agents/skills/flow-svg-diagram"
node "$HOME/.agents/skills/flow-svg-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-svg-diagram/scripts/flowsvg.mjs" prepare
```

Windows PowerShell（Codex；仅为安装示例，不作为 Windows 验收证据）：

```powershell
New-Item -ItemType Directory -Force -Path "$HOME/.agents/skills" | Out-Null
Copy-Item -Recurse -Path "skills/flow-svg-diagram" -Destination "$HOME/.agents/skills/flow-svg-diagram"
node "$HOME/.agents/skills/flow-svg-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-svg-diagram/scripts/flowsvg.mjs" prepare
```

Claude Code 将 `.agents/skills` 换为 `.claude/skills`。仅为某项目安装时，使用表格中的目标项目路径。更新时先备份安装目录，再用所选版本的完整目录替换；合并复制可能残留已删除的脚本或参考资料。

`~` 表示用户主目录，Windows 上通常是 `C:\Users\<用户名>`。其他宿主使用其已有的 skill 安装方式，并确保助手能读取该目录和执行 Node 命令。上述路径来自宿主官方文档，不表示已在所有宿主实测。

安装后，在目标项目或工作目录中打开宿主，显式选择 `flow-svg-diagram`。Codex 未显示新安装的 skill 时，重启 Codex 后再查找。其他宿主按其技能发现或重新加载说明处理。

先让助手检查环境：

```text
使用 flow-svg-diagram skill，检查当前环境能否运行。说明 Node、npm 和浏览器的状态。
```

`doctor` 检查 Node、npm 和缓存，不检查浏览器；浏览器可用性需另外核对，并在实际截图或 GIF 任务中确认。首次创作时工具会自动准备隔离依赖，无需给当前项目安装 FlowSVG 或修改项目依赖清单。

## 3. 创建第一张图解

在 Codex 中可发送：

```text
$flow-svg-diagram
创建一张静态架构图：客户端请求 API 服务，API 服务查询数据库。
API 服务和数据库属于“订单平台”，客户端位于平台外。
保留中文标签，使用浅色主题。图解命名为 order-platform，输出到当前工作目录。
```

在 Claude Code 中，将第一行改为 `/flow-svg-diagram`，其他要求保持一致。也可直接说明“使用 flow-svg-diagram skill”，由支持自动选择的宿主识别。

请求中最好包含要表达的对象、关系方向、分组边界和演示目的。需求明确时助手直接完成初次布局；关系方向、边界、删减或聚合等关键含义不明确时，助手会先询问。助手会检查主要路径、接入口、标签、目标尺寸下的内容和实际画面；没有浏览器或查看能力时明确记录未执行。来源范围明确且没有语义歧义的简单任务无需额外确认。能力不足时，助手会解释限制并请你选择替代表达。

如果图解用于演示文稿，可追加具体约束：

```text
这张图用于 16:9 的技术评审 PPT，请使用简短中文标签，确保投影时易读。
额外导出静态 SVG。我会将 SVG 导入演示软件，不需要生成 PPTX。
```

对于流程或状态变化，可以明确要求动画：

```text
使用 flow-svg-diagram skill，演示客户端向 API 服务发送请求，API 服务返回响应。
先展示全图，再依次演示请求和响应，最后回到全图。
图解命名为 request-response，默认交付 JSON 和离线 HTML。
```

## 3.1. 设计偏好、用途与展示尺寸

新建和修订草稿会在五步流程前执行[项目偏好初始化](../../skills/flow-svg-diagram/references/preferences.md)。助手从当前工作目录或你明确指定的项目根读取 `.diagrams/.preferences.json`，复用已有选择，仅询问相关缺口；纯导出、校验和诊断保持原流程。修订时保留原图设计，除非本次要求明确改变它。

你可以选择“仅本次”或“保存以后复用”。只有明确要求保存，才持久化风格、配色、字体、密度或参考方向。可以用 `defaults: true` 保存跟随默认的选择，并同时保存明确覆盖项。用途、尺寸、事实、关系、导出格式和布局仍属于本次任务。这是助手管理的项目文件，不是 CLI 设置或用户级配置。新建时，本次要求优先于项目约定、已保存偏好和 Skill 默认值；具体文件契约与操作规则以链接参考为准。

可以单独说“把这个配色保存为项目偏好”“把项目密度改为疏朗”或“重置项目偏好”。重置只删除偏好文件。配置无效时保留原文件、不采用其中的值，助手说明问题后允许使用本次临时选择继续；保存或重置失败会明确报告。

用途未知且你明确选择默认值或要求直接制作时，起点为 Web 静态构图：960×600 画布、假定 720 CSS px 展示宽度，以及浅色背景；已有偏好可以覆盖外观。默认交付仍为 JSON、暂停离线 HTML 和报告，SVG/PNG 仍需提出请求。未回复不等于选择默认值。保存视觉默认不等于把所有后续任务的用途都选为 Web。

PPT 素材请说明整页还是局部占位、可用宽度**和高度**、背景，以及标题和页脚由幻灯片还是素材承载。已知 PPT 用途继续使用该上下文，缺少精确尺寸时记录假设。目标尺寸查看只覆盖相应条件，真实 PowerPoint/WPS 集成单独记录。动画请明确浏览器 HTML 播放还是显式请求 GIF；MP4、PPTX 和原生 PowerPoint 动画不在本技能导出能力内。

需要导入幻灯片的图片时，请指定 SVG 或 PNG；否则会将格式选择纳入首次上下文询问。选择默认文件只产生 HTML、JSON 和报告，不隐含可导入幻灯片的图片。

[读者问题选择表](../../skills/flow-svg-diagram/references/semantic-patterns.md#choose-by-the-readers-question)用于选择能力全景、来源映射或流程等结构。[教学配方](../../skills/flow-svg-diagram/examples/README.md#presentation-recipe-checks)包含无连线能力全景、中文来源与业务卡片、全图常显的并行流动动画。复用组织方式时，替换为自己的事实和展示尺寸。

## 3.2. 页面介绍与图内文字

新建或修订 HTML 讲解时，助手先规划内容归属，再确定图形几何。整体标题、介绍和全局说明采用普通 HTML 排版；对象名称、关系条件和关键状态保留在图内。比较卡片仍可保留解释该对象所需的正文。你可以在请求中指定页面标题、介绍、补充说明和预期阅读宽度。

助手围绕内嵌播放器编写页面 HTML/CSS，默认按“介绍、播放器、补充说明”阅读，并根据资料调整。最终仍交付一个可离线打开的自包含 HTML，以及可编辑图解 JSON 和报告，无需额外页面源文件。已有图解导入、纯导出和校验保留原有输入及入口。

直接使用工具时，将安装包内的 [HTML 页面起始文件](../../skills/flow-svg-diagram/examples/html-page.html)复制到任务工作区，编辑外围内容与 CSS，再在常规图解输入及输出参数之外传入 `author --html <page.html>`。保留其中的受管播放区域。已经填充的播放区域必须匹配图解 JSON 的确切字节、主题和 SDK；页面无效或不匹配时明确报错。报告记录页面来源与最终文件的哈希，检查覆盖实际外层页面和内嵌控件。浏览器截图不等于实际视觉批准。完整规则见安装包内的[页面输入契约](../../skills/flow-svg-diagram/references/tool-contract.md#editable-html-pages)。

独立 SVG/PNG 需要单独判断上下文：仅出现在 HTML 中的正文不会包含在导出图片里。缺少浏览器时，文件可以已交付，但页面检查仍未执行。

## 4. 根据指定资料创作

指定资料路径和允许读取的范围，能让助手保留来源并避免补造业务事实：

```text
使用 flow-svg-diagram skill，仅根据 docs/order-system.md 创建系统架构图。
允许读取范围只有这个文件。保留资料中的中文名称，不补充资料未说明的依赖或部署数量。
记录来源，图解命名为 order-system。
```

内容过密时，助手会提出拆图或聚合方案。合并对象、删除关系或改动含义前，需要你决定；节点数量本身不构成删减授权。交付说明会分别列出保留、合并、省略和未知内容，并关联来源与实际决定。完整教学案例见[来源保真与信息取舍](../../skills/flow-svg-diagram/references/source-fidelity.md)。

分析代码仓库时，同样给出目录或文件范围。来源记录用于说明图解依据；工具保存来源元数据，但不会根据元数据自行抓取文件或 URL。

## 5. 查看产物和检查结果

默认输出位于执行任务时的工作目录。新图解首次成功运行通常得到：

```text
.diagrams/
  order-platform/
    diagram.json
    diagram.html
    report.json
    report.md
```

请求并成功导出后增加 `diagram.svg`、`diagram.png` 或 `diagram.gif`；命名批量图片位于 `exports/`。简短报告记录来源元数据、检查、警告、视觉观察和最终文件哈希。失败任务保留工作目录，只登记实际保存的文件，不保证有 HTML 或全部产物。

助手创建的草稿、临时辅助脚本、测量及复核输入统一保存在 `.diagrams/.work/<diagram-name>/<task-id>/`，迭代时优先使用无需浏览器的校验，避免反复截图。全部请求文件就绪后，`finalize` 发布最终选定图解到 `.diagrams/<diagram-name>/`，并只清理本次任务目录。失败或取消的任务保留工作文件；如需保留完整历史或调试证据，请明确提出。已有来源文件、其他任务和旧历史不在清理范围内。

| 文件 | 使用方式 |
| --- | --- |
| `diagram.html` | 用浏览器打开；默认暂停，可通过控件播放、拖动时间线和调整速度。单文件可离线分享。 |
| `diagram.json` | 后续修订或重新导出的可编辑图解文档。 |
| `report.md` | 阅读实际检查、警告、交付文件和未完成事项。 |
| `report.json` | 同一创作报告的结构化事实记录，供工具或后续任务读取。 |

任务期间，创作、校验、重试和复核记录使用临时版本。成功收尾后清理这些版本和截图；最终报告使用相对文件路径，保留复核事实，不链接已删除的证据。后续修订读取最终 JSON，在新的任务目录中执行。

文件交付与质量检查分别记录。有可用浏览器时，创作工具会打开实际交付的 `diagram.html`，记录文件哈希、初始暂停、离线行为、播放和采样状态。这些程序事实不代表助手已经查看截图；实际查看列出的状态后，使用 `review --from <来源版本> --name <同名图解> --output <同一历史根> --html-review <json>` 记录查看范围。生成截图不代表助手已查看。没有浏览器或宿主无法查看图片时，HTML/图片检查保持未执行并明确记录。

## 6. 修订已有图解

给出最终 JSON 路径、图解名，并说明允许的改动：

```text
使用 flow-svg-diagram skill，修订 ./.diagrams/order-platform/diagram.json。
将数据库标签改为“订单数据库”，其他关系和分组保持不变。
完整修订结果就绪后，再发布到最终目录。
```

最终 JSON 在新的任务中读取。如果你明确保留了工作目录，并要继续未完成的任务，请同时指定该目录中的父版本。

助手发现重叠、裁切、缺字或语义问题后，会解释影响与候选方案，在选择会改变含义时请你决定；已经授权的机械修正直接执行。例如：

```text
这处重叠是有意设计，请保留布局，并在新版本中记录我的决定和原始警告。
```

```text
采用你提出的右移方案，仅移动节点 cache，其他内容保持不变。
以刚才报告中发现问题的版本为父版本，创建新版本。
```

工具在有限时间点检查既有四类布局风险，以及连线穿过无关节点、标签与无关节点重叠、标签之间重叠三类 SDK 几何风险。另有 `LABEL_VERTICAL_RUN`，保守提示连线标签中连续的极短自动换行；显式换行与各段内新增的自动换行分别处理。诊断不需要浏览器，文字基线和边界使用确定性估算，不能代替实际尺寸的视觉检查。

新决定通过报告中的 `sourceRevision` 和 `issueId` 选中单条警告；不同对象对、文字字段、行或采样时间各自保留决定范围。源 JSON 字节、SDK 基线或主题变化后，原决定不会成为对新警告的授权。历史无标识记录原样保留，需要先重新诊断才能对它提交新的精确决定。详见[诊断与修订决定](../../skills/flow-svg-diagram/references/diagnostics-and-revisions.md)。

记录“有意设计”不会删除原始警告或自动完成质量验收。任务期间保留修正、重试和追加导出的临时版本，包括失败版本；成功收尾后默认清理，明确要求保留历史时除外。

## 7. 按需导出 SVG、PNG 或 GIF

静态 SVG 是指定时点的画面：

```text
使用 flow-svg-diagram skill，读取 ./.diagrams/order-platform/diagram.json。
额外导出 0 毫秒的 SVG，发布完整的最终文件集。
```

PNG 可明确指定宽度和透明背景，需要可用浏览器。默认不生成 PNG。缺少浏览器时会保留成功的 JSON、HTML 和 SVG，PNG 请求保持未完成：

```text
使用 flow-svg-diagram skill，读取 ./.diagrams/order-platform/diagram.json，导出透明 SVG 和 PNG。
时间点使用报告中的 0 毫秒，PNG 宽度为 1440 像素。
按正文 720 CSS 像素宽度，分别放到白色和深色背景上生成正式产物审查图，并实际查看。
```

正式图片的证据独立于时间线采样截图。助手先按原始产物版本生成目标尺寸审查图，再用独立 `review --artifact-review` 追加实际查看。`--from` 选择图解主体；证据来源不同时，用 `--evidence-from` 显式选择。复核不会重新制作图解或打开浏览器；不同尺寸和承载背景分别登记。详见[正式图片证据](../../skills/flow-svg-diagram/references/artifact-evidence.md)。

批量静态图片使用独立导出清单。清单绑定图解原始字节的哈希和实际 SDK 的版本、完整性，并为每个时点指定名称和 SVG/PNG 格式。助手先读取编译节拍并请你确认选帧，再创建清单；源字节或 SDK 改变后重新确认，不自动替换绑定。

```text
使用 flow-svg-diagram skill，读取 ./.diagrams/article/diagram.json，按实际编译节拍确认两张静态画面。
在新版本中用导出清单生成命名的 SVG 和 PNG，共用透明背景和 1440 像素 PNG 宽度。
清单保存在任务目录中；分别报告每项结果，失败项在收尾前重试。
```

详见[命名批量导出](../../skills/flow-svg-diagram/references/export.md#named-batch-exports)。只查看其中一张图片，不表示已查看其他时点、格式或展示尺寸。

GIF 需要明确请求和可用浏览器：

```text
使用 flow-svg-diagram skill，读取 ./.diagrams/request-response/diagram.json。
额外导出 GIF。使用浅色主题，保留说明文字。
浏览器使用当前环境可用的 Chrome/Chromium；找不到时先说明情况。
```

需要指定浏览器时，在请求中提供可执行文件的绝对路径。工具会以无头模式启动独立进程；浏览器选择详见[浏览器准备](../../skills/flow-svg-diagram/references/visual-checks.md#prepared-browser)。

GIF 失败或取消后，已完成的 JSON/HTML/SVG 仍可使用，但 GIF 请求保持未完成。调整时段、尺寸、帧率或说明文字等取舍，由你决定后再重试。参数和限制详见[导出说明](../../skills/flow-svg-diagram/references/export.md)。

## 8. 只校验，或直接使用命令行

只检查已有 JSON，可向助手提出：

```text
使用 flow-svg-diagram skill，仅校验 ./draft.json，报告结构、编译和布局诊断。
保留输入，不导出 HTML、SVG、PNG 或 GIF，也不自动修复。
```

`validate --input <draft.json>` 返回结构化诊断、输入字节身份和实际 SDK 基线，不创建历史目录、快照或交付文件。`revision` 为 null，`validation.snapshotCreated` 为 false。保留工作草稿；需要留存诊断时，将 stdout 重定向到任务目录。只有检查明确已保存版本时，才使用 `validate --from <revision> --name <name> --output <task-workspace>/history`。正式告警决定必须引用已保存的 `author` 报告；草稿诊断不能提供持久化的 `sourceRevision`。

也可在终端调用安装单元的唯一命令入口。下面的 `<skill-directory>` 必须替换为安装目录的绝对路径；先切换到希望保存输出的工作目录，并将 `<task-id>` 替换为本次运行的新任务 ID。

```text
node "<skill-directory>/scripts/flowsvg.mjs" doctor
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/architecture.json" --name architecture --output ".diagrams/.work/architecture/<task-id>/history" --browser none
node "<skill-directory>/scripts/flowsvg.mjs" finalize --workspace ".diagrams/.work/architecture/<task-id>" --name architecture --from v001
```

第二条命令使用随包示例，生成临时 JSON、HTML 和报告；第三条发布最终文件并清理本次任务目录。`--browser none` 显式跳过截图，便于先验证不依赖浏览器的交付。直接运行命令不会代替助手的语义分析或实际视觉判断。随包架构教学示例保留已知的关系标签与分组重叠告警；应阅读报告并按授权范围处理，不能把这次命令验证当成无告警的设计模板。

完整参数、隔离缓存和报告字段见[工具合同](../../skills/flow-svg-diagram/references/tool-contract.md)。环境准备、取消或导出失败见[故障恢复](../../skills/flow-svg-diagram/references/troubleshooting.md)。

## 9. 必需质量覆盖

报告将 `completion.delivery` 与 `completion.quality` 分开记录。`qualityCoverage` 列出字段、编译和布局检查、实际 `diagram.html` 状态，以及每个请求的 SVG/PNG 展示条件。未指定尺寸时，图片使用原生尺寸和解析后的主题背景。文件齐备时可以交付，但缺少浏览器或实际查看时质量保持 `incomplete`；未解决或暂缓的问题为 `needs-user-decision`。仅记录审查的后续版本会继承父版本的请求格式和图片身份，不能让先前的静态文件从必需覆盖中消失。

提交预览、HTML 或正式 SVG/PNG 证据复核前，使用 `review-template` 从指定证据生成含真实 ID 和哈希的未查看模板。实际查看后再填写观察。详见[三类复核完整入参契约](../../skills/flow-svg-diagram/references/review-inputs.md)；无效提交会在分配版本或渲染之前失败。

HTML 与预览复核追加独立记录，不重制或复制图解文件。相同提交复用原记录；不同观察追加保存。最终交付重新核对证据，并保留部分覆盖和所有未解决问题；后续无问题观察不能抹除早先问题。详见[记录身份与完整入参](../../skills/flow-svg-diagram/references/review-inputs.md)。

正式图片复核记录保留产物与证据的独立来源、SDK、时点、镜头、导出背景、展示尺寸和承载背景。查看一个条件不覆盖其他条件。finalize 保留所有请求的 SVG/PNG 与命名批量文件，并再次核实来源；完全相同的复核不新增文件，后续观察仍保留历史问题。

## 按需采集正式图片证据

已有 SVG/PNG 使用 `evidence --from <revision> --name <name> --output <task-workspace>/history [--artifact-preview-settings <json>] --browser <prepared-executable>`。默认覆盖全部选定文件，后续请求累积展示条件。有效截图保留原身份复用，不准备运行时、不启动浏览器、不写文件；新截图初始未查看。将返回的 `evidence-<uuid>` 通过 `--evidence-from` 传给 `review-template` 和 `review`。缺图或截图损坏可以补采，源文件、原产物或身份元数据损坏必须先处理。详见[证据契约](../../skills/flow-svg-diagram/references/artifact-evidence.md)。

## 宿主官方说明

安装路径与显式调用方式核对于 2026-10-27。宿主版本或组织策略可能影响本地 skill 的可用性，按当前宿主文档处理。

- [Codex：Agent Skills](https://developers.openai.com/codex/skills/)
- [Claude Code：Extend Claude with skills](https://code.claude.com/docs/en/skills)
