# Flow Diagram 用户指南

[English](flow-diagram-guide.md) · [文档地图](../README.md)

Flow Diagram 帮助编程助手根据描述、文档或代码创作可编辑的系统与流程图解。说明希望读者理解什么，助手会制作、检查并交付最终选定图解。

默认交付可编辑 JSON、离线 HTML 页面和报告。需要图片时，可要求导出 SVG、PNG 或 GIF。HTML 播放器演示图中定义的状态和变化，不执行所描述的业务流程。

## 文档入口和任务分流

| 任务 | 阅读入口 |
| --- | --- |
| 安装 Skill | [安装到宿主](#2-安装到宿主) |
| 创建图解 | [创建第一张图解](#3-创建第一张图解) |
| 设置项目默认值 | [项目偏好、用途与展示尺寸](#31-项目偏好用途与展示尺寸) |
| 根据文档或代码创作 | [根据指定资料创作](#4-根据指定资料创作) |
| 查找交付文件 | [查看产物和检查结果](#5-查看产物和检查结果) |
| 修改图解 | [修订已有图解](#6-修订已有图解) |
| 导出图片 | [按需导出 SVG、PNG 或 GIF](#7-按需导出-svgpng-或-gif) |
| 检查已有 JSON | [只校验，或直接使用命令行](#8-只校验或直接使用命令行) |
| 恢复失败任务 | [故障恢复](../../skills/flow-diagram/references/troubleshooting.md) |

## 适合哪些任务

- **演示文稿素材：**制作架构、流程和状态图，导出为 SVG、PNG 或 GIF。
- **网页讲解：**制作可暂停、回看的离线 HTML 图解。
- **教学与培训：**分步解释请求过程、数据流和任务生命周期。
- **评审与复盘：**根据资料展示结构全貌和交互过程。

你可以指定分层架构图、逻辑流程图等类型，也可以让助手根据讲解目标选择。需要起稿参考时，可浏览[示例库](../../skills/flow-diagram/examples/README.md)。

Skill 生成图解素材，不生成 PPTX 文件或 PowerPoint 原生形状。需要在应用中嵌入播放器时，使用 [FlowSVG SDK](https://github.com/yokingma/FlowSVG)。

## 1. 准备环境

- 安装 Node.js 20+ 和 npm，运行助手的环境需要能找到这两个命令。
- 首次制作图解需要联网下载运行依赖，完整缓存可离线复用。
- PNG、GIF 和截图检查需要单独安装的 Chrome/Chromium 可执行文件；JSON、HTML 和 SVG 生成无需浏览器。

Skill 不会下载浏览器，也不会修改应用依赖。助手找不到 Chrome/Chromium 时，可提供其可执行文件路径。宿主的浏览器工具所用的浏览器，不一定能被本地 Node 命令调用。

## 2. 安装到宿主

选择一种安装方式。同时安装插件和独立 Skill 副本可能重复显示技能。命令不可用时，更新对应客户端，或使用 Skills CLI。

### Skills CLI

在需要使用 Skill 的项目中执行：

```sh
npx skills add yokingma/flow-diagram-skill
```

Skills CLI 根据环境识别或询问目标助手，默认安装到当前项目。通过 GitHub 安装需要 Git。

要为当前用户安装并跨项目使用，选择对应宿主：

```sh
# Codex
npx skills add yokingma/flow-diagram-skill --global --agent codex --yes

# Claude Code
npx skills add yokingma/flow-diagram-skill --global --agent claude-code --yes
```

项目级安装使用 `npx skills list` 查看，用 `npx skills update flow-diagram` 更新。全局安装请明确指定范围：

```sh
npx skills list --global
npx skills update flow-diagram --global
```

更新跟随仓库默认分支。需要固定版本时，使用下方的手动安装方式。

### Codex Plugin

使用支持 `codex plugin` 的 Codex 版本，在终端执行：

```sh
codex plugin marketplace add yokingma/flow-diagram-skill
codex plugin add flow-diagram@yokingma
codex plugin list --marketplace yokingma
```

确认 `flow-diagram` 已安装，再打开新的 Codex 会话，使用 `$flow-diagram` 调用。更新时，刷新 marketplace 并安装其中的当前插件：

```sh
codex plugin marketplace upgrade yokingma
codex plugin add flow-diagram@yokingma
```

### Claude Code Plugin

使用支持插件的 Claude Code 版本，在 Claude Code 内执行：

```text
/plugin marketplace add yokingma/flow-diagram-skill
/plugin install flow-diagram@yokingma
/reload-plugins
```

打开 `/plugin`，确认 `flow-diagram@yokingma` 已安装并启用。需要自动更新时，选择 `yokingma` marketplace 并启用 AutoUpdate。更新后重新加载插件。插件安装使用 `/flow-diagram:flow-diagram` 调用；直接安装 Skill 时使用 `/flow-diagram`。

### Kimi Code Plugin

使用支持插件的 Kimi Code 版本，在 Kimi Code 内执行：

```text
/plugins install https://github.com/yokingma/flow-diagram-skill
```

仓库中的 `kimi.plugin.json` 指定安装 `skills/flow-diagram/`。Kimi Code 确认安装成功后，要求它使用 flow-diagram skill。`/plugins` 不可用时，更新 Kimi Code，或使用 Skills CLI 并选择 Kimi Code。

### GitHub CLI

使用支持 [`gh skill install`](https://cli.github.com/manual/gh_skill_install) 的 GitHub CLI 版本：

```sh
gh skill install yokingma/flow-diagram-skill
```

按提示选择目标助手。非交互安装时，明确指定 Skill 和助手，默认安装到当前项目：

```sh
gh skill install yokingma/flow-diagram-skill flow-diagram --agent codex
```

Claude Code 将 `codex` 换成 `claude-code`。需要跨项目使用时，增加 `--scope user`。在所选助手中确认技能可用，使用 `gh skill update flow-diagram` 更新。未固定版本时，GitHub CLI 优先选择最新标签发布版本，其次才是默认分支；可用 `--pin <tag-or-commit>` 固定版本。

### 手动安装与固定源码

克隆仓库，或下载并解压源码 ZIP：

```sh
git clone https://github.com/yokingma/flow-diagram-skill.git
cd flow-diagram-skill
git rev-parse HEAD
```

需要固定发布版本时，先检出对应标签，例如 `v0.1.0`，再复制完整的 `skills/flow-diagram/` 目录，包括许可证和全部子目录：

| 宿主 | 当前项目 | 当前用户 | 调用方式 |
| --- | --- | --- | --- |
| Codex | `<project>/.agents/skills/flow-diagram/` | `~/.agents/skills/flow-diagram/` | `$flow-diagram` |
| Claude Code | `<project>/.claude/skills/flow-diagram/` | `~/.claude/skills/flow-diagram/` | `/flow-diagram` |

首次为当前用户安装 Codex Skill 时，在克隆的仓库中执行以下命令。目标 `flow-diagram` 目录必须尚不存在。

macOS/Linux：

```sh
mkdir -p "$HOME/.agents/skills"
cp -R skills/flow-diagram "$HOME/.agents/skills/flow-diagram"
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" prepare
```

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force -Path "$HOME/.agents/skills" | Out-Null
Copy-Item -Recurse -Path "skills/flow-diagram" -Destination "$HOME/.agents/skills/flow-diagram"
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-diagram/scripts/flowsvg.mjs" prepare
```

Claude Code 将 `.agents/skills` 换成 `.claude/skills`。项目级安装使用表中的项目路径。更新手动安装的 Skill 时，先备份安装目录，再用所选版本的完整副本替换。

在目标项目中打开助手并调用 Skill。Codex 未发现新 Skill 时，重启后检查；其他宿主可能需要重新加载，见[官方说明](#宿主官方说明)。

制作图解前，可以先要求检查环境：

```text
使用 flow-diagram skill 检查 Node、npm 和浏览器是否可用。
```

`doctor` 检查 Node、npm 和运行时缓存，浏览器另行检查。首次制作图解会自动准备运行依赖；使用 Skill 无需执行 `pnpm install` 或检出 SDK 源码。

## 3. 创建第一张图解

在 Codex 中发送：

```text
$flow-diagram
创建静态架构图：客户端调用 API 服务，API 服务查询数据库。
API 与数据库属于“订单平台”，客户端位于该边界之外。
使用中文标签和浅色主题，命名为 order-platform。
交付 JSON、离线 HTML，另外导出 SVG。
```

Claude Code 直接安装 Skill 时，将第一行换为 `/flow-diagram`；通过插件安装时，换为 `/flow-diagram:flow-diagram`。支持自动选择的宿主中，也可以直接说“使用 flow-diagram skill”。

说明对象、关系方向、分组边界和讲解目标。助手会询问影响含义的缺失信息；请求的效果不受支持时，会说明限制并请你选择替代方式。

需要动画时，说明先后顺序与状态变化：

```text
使用 flow-diagram skill 解释一次请求与响应。
客户端、API 与数据库全程可见。先展示全图，再依次演示请求、
数据库查询和响应，最后回到全图。命名为 request-response。
```

## 3.1. 项目偏好、用途与展示尺寸

已知受众、实际展示尺寸、背景和导出格式时，一并说明。用于演示文稿时，提供可用宽度和高度，以及标题、图例是否由幻灯片承载。导入幻灯片需请求 SVG 或 PNG，动画可用 GIF；默认 HTML 页面用于浏览器播放。

未说明用途时，助手从静态 Web 图解开始：未指定的选项默认采用 960 × 600 画布、720 CSS 像素展示宽度和浅色背景，明确要求和适用项目偏好优先。已知用于演示文稿时，即使缺少精确尺寸，也会保留幻灯片场景。助手会说明假定的尺寸和背景，便于你调整。

要保存项目默认值，可以说“以后本项目的架构图都用中文标签”或“评审交付默认包含 SVG”。偏好保存在工作目录或你指定项目根目录下的 `.diagrams/preferences.md`。当前请求优先；修订时保留修改范围以外的选择。

你可以要求修改、忘记某项偏好，或重置全部项目偏好。重置只删除偏好记录。一次性调整不会保存为以后默认值；已保存偏好发生冲突时，助手会说明冲突并继续处理，不套用该默认值。

## 3.2. 页面介绍与图内文字

离线 HTML 页面包含标题、简短介绍和图解播放器，字幕说明动画阶段。对象名称、关系和必要条件保留在图中，来源与检查结果放在报告中。

同时请求 HTML 和图片时，说明图片是独立使用，还是放进文章或幻灯片。页面标题和简介不包含在 SVG、PNG 或 GIF 导出中，因此独立图片可能需要自己的标题或图例。

保留配套的 HTML 和 JSON，以便后续修改时延续页面设计。自定义 HTML/CSS 或直接使用 CLI 时，见[可编辑 HTML 页面](../../skills/flow-diagram/references/tool-contract.md#editable-html-pages)和[继续编辑页面](../../skills/flow-diagram/references/tool-contract.md#continue-an-existing-page)。

## 4. 根据指定资料创作

指定允许读取的资料，以及必须保留的事实：

```text
使用 flow-diagram skill，只根据 docs/order-system.md 创建系统架构图。
保留原文中文名称，不添加文档未说明的依赖或部署数量。
记录资料来源，命名为 order-system。
```

分析代码仓库时，指定允许读取的目录或文件。助手保留来源事实，在改变关键关系、边界或含义前询问你。内容过密时，可以提出拆图或归并建议；缺失事实在澄清前保留为未知。

保留、归并和省略信息的例子见[来源保真](../../skills/flow-diagram/references/source-fidelity.md)。

## 5. 查看产物和检查结果

用浏览器打开交付的 HTML。成功制作名为 `order-platform` 的图解后，会得到：

```text
.diagrams/
  order-platform/
    diagram.json
    diagram.html
    report.json
    report.md
```

| 文件 | 用途 |
| --- | --- |
| `diagram.html` | 离线页面，支持播放、跳转和调速，初始暂停。 |
| `diagram.json` | 可编辑图解，用于修订和导出。 |
| `report.md` | 来源、已完成检查、警告和未完成事项。 |
| `report.json` | 同一份报告的结构化形式。 |

请求导出后，还会得到 `diagram.svg`、`diagram.png` 或 `diagram.gif`；命名批量图片保存在 `exports/` 中。

助手会检查生成文件，在浏览器和图片查看工具可用时按预期尺寸查看结果。交付说明会列出缺少的导出或检查。某项导出失败时，已完成文件仍可使用，并保留恢复材料。

成功交付后会清理临时草稿和截图。需要排查细节时，在交付前要求保留这些材料，包括任务的 `issues.md`；需要对比或回退时，在交付前要求保存版本检查点。

## 6. 修订已有图解

提供 JSON 路径和允许修改的范围：

```text
使用 flow-diagram skill 修订 ./.diagrams/order-platform/diagram.json。
将数据库标签改为“订单数据库”。
保留其余关系和分组，并延续 HTML 页面设计。
```

助手会更新图解并重新生成所需格式。替换结果无法完成时，会保留上一份完整交付。将配套 HTML、报告与 JSON 放在一起；需要增加或移除某种格式时明确说明。

调整视觉问题时，指出对象或区域。助手可以在保留含义的前提下修正间距、裁切和连线歧义；涉及事实或关键关系的修改会先询问你。

SDK 更新后，如果已有页面因不兼容而被拒绝，保留原文件，按 [SDK 升级恢复](../../skills/flow-diagram/references/troubleshooting.md#continuing-after-an-sdk-upgrade)处理。

## 7. 按需导出 SVG、PNG 或 GIF

指定格式；静态图片还需说明要展示的状态或时间点：

```text
使用 flow-diagram skill 读取 ./.diagrams/order-platform/diagram.json。
另外导出 0 毫秒时的 SVG。
```

PNG 需要浏览器，可以指定宽度和背景：

```text
导出这张图解在 0 毫秒时的透明背景 SVG 和 PNG。
PNG 宽度为 1440 像素，按 720 CSS 像素展示宽度，
分别在白色和深色背景上查看。
```

需要多张图片时，说明要展示的阶段。助手会选择对应时间点并导出命名文件。直接调用 CLI 的方法见[命名批量导出](../../skills/flow-diagram/references/export.md#named-batch-exports)。

添加 GIF 动画：

```text
使用 flow-diagram skill 读取 ./.diagrams/request-response/diagram.json。
另外导出 GIF，使用浅色主题并保留讲解字幕。
```

GIF 需要 Chrome/Chromium。可以指定尺寸、帧率和时间区间，限制见[导出选项](../../skills/flow-diagram/references/export.md)。请求的导出失败或取消时，已完成的 JSON、HTML 和图片仍可使用，助手会说明需要重试的部分。

## 8. 只校验，或直接使用命令行

检查 JSON，但不修改或导出：

```text
使用 flow-diagram skill，只校验 ./draft.json。
报告结构和编译诊断，保留输入文件，不导出文件，也不要自动修复。
```

只需视觉诊断时，可要求助手查看图解并报告问题。助手可能生成临时截图，但不会替换交付文件或修改来源。

也可以直接使用 CLI。将 `<skill-directory>` 换成绝对安装路径，`<task-id>` 换成新的任务标识，在希望保存输出的工作目录中执行：

```sh
node "<skill-directory>/scripts/flowsvg.mjs" doctor
node "<skill-directory>/scripts/flowsvg.mjs" author --input "<skill-directory>/examples/complete-project-architecture.json" --name project-architecture --theme dark --output ".diagrams/.work/project-architecture/<task-id>/history" --browser none
node "<skill-directory>/scripts/flowsvg.mjs" finalize --workspace ".diagrams/.work/project-architecture/<task-id>" --name project-architecture
```

这些命令生成架构示例，并将最终文件保存到 `.diagrams/project-architecture/`。`--browser none` 跳过截图检查。保存创作结果的命令返回摘要，通过其中的 `detailsPath` 读取完整报告；校验和测量直接返回结果。

使用 `--help` 查看选项。命令与报告见[工具参考](../../skills/flow-diagram/references/tool-contract.md)，文字尺寸见[内容测量](../../skills/flow-diagram/references/tool-contract.md#content-measurement)，重复静态布局见[布局计划](../../skills/flow-diagram/references/static-layout.md#layout-plan-workflow)。

## 9. 查看结果与按需正式复核

按实际使用尺寸检查标签、关系方向、分组边界和可读性。播放动画，检查顺序、字幕和节奏；需要修改时，向助手指出具体问题。

### 明确请求时的正式复核

需要可追溯复核时，可以要求助手针对交付文件和展示条件记录观察。普通创作和图片导出无需正式复核请求。

正式复核记录包含文件、已查看状态、展示尺寸和未解决问题。直接使用 CLI 复核时，见[复核输入](../../skills/flow-diagram/references/review-inputs.md)。

## 按需采集正式图片证据

复核需要保存 SVG 或 PNG 在特定宽度和背景下的截图时，可要求采集图片证据。助手可以对现有导出截图，并在查看后记录观察。命令和设置见[图片证据](../../skills/flow-diagram/references/artifact-evidence.md)。

## 宿主官方说明

宿主版本和组织策略可能影响 Skill 发现与本地命令访问。安装或调用方式不同时，参考宿主文档：

- [Codex：Agent Skills](https://developers.openai.com/codex/skills/)
- [Claude Code：Extend Claude with skills](https://code.claude.com/docs/en/skills)

## 窄屏中的动画讲解页面

较宽的图解可以横向滚动，标题和简介独立换行。使用播放控件暂停或回看阶段。需要移动端布局时，说明目标视口，以及是否接受横向滚动。

离线页面需要将脚本、样式、字体和图片保存在文件内。自定义页面使用内联资源或 data URL，不依赖外部资源。
