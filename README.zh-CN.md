# Flow Diagram

基于 [FlowSVG（流形）](https://github.com/yokingma/FlowSVG)，从自然语言、文档或代码创作可编辑系统与流程图解的 Agent Skill。将静态说明或动画演示交付为自包含离线 HTML，同时保留可编辑 JSON 与检查报告；按需导出 SVG、PNG 或 GIF。

[English](README.md) · [安装](#安装) · [用户指南](docs/guides/flow-diagram-guide.zh-CN.md) · [示例](skills/flow-diagram/examples/README.md) · [贡献说明](CONTRIBUTING.md)

## 典型示例

以下为 FlowSVG SDK 上游 showcase 的演示动图，分别展示请求流程、部署架构和模型推理。可访问[在线演示](https://yokingma.github.io/FlowSVG/)交互播放；[图片来源与版本](docs/images/flowsvg/README.md)记录素材出处。

### 请求与响应

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/request-response.gif" alt="客户端与服务之间的请求和响应动画" width="700"></p>

### Web 服务部署

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/web-service-deployment.gif" alt="包含两个应用副本的 Web 服务部署" width="700"></p>

### LLM 推理

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/llm-inference.gif" alt="包含 Transformer 层与 KV Cache 复用的 LLM 推理过程" width="700"></p>

## 安装

在需要使用 Skill 的项目中执行：

```sh
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram
```

[Skills CLI](https://github.com/vercel-labs/skills) 根据环境识别或询问目标助手，默认安装到当前项目。如果希望当前用户在多个项目中使用，选择以下一条命令：

```sh
# Codex
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram --agent codex --global

# Claude Code
npx skills add https://github.com/yokingma/flow-diagram-skill --skill flow-diagram --agent claude-code --global
```

需要 **Node.js 20+ 与 npm**，通过 GitHub 安装还需要 Git。助手须支持 Skill 和本地 Node 命令。首次制作图解会将锁定的运行时包安装到隔离缓存，需要访问 npm registry；缓存完整后可离线复用，不改变用户应用的依赖。

**PNG、GIF 与浏览器检查还需要单独安装的 Chrome/Chromium 可执行文件。** 生成 JSON、HTML 与 SVG 无需浏览器，Skill 不自动下载浏览器。

Codex 未发现新 Skill 时，重启后检查。手动安装、Windows、更新与固定版本源码的步骤见[安装指南](docs/guides/flow-diagram-guide.zh-CN.md#2-安装到宿主)。使用 Skill 无需执行 `pnpm install`，也无需 SDK 源码仓库。

## 开始使用

在 Codex 中发送：

```text
$flow-diagram
创建静态架构图：客户端调用 API 服务，API 服务查询数据库。
API 与数据库属于“订单平台”，客户端位于该边界之外。
使用中文标签和浅色主题，命名为 order-platform。
交付默认 JSON、离线 HTML，另外导出 SVG。
```

Claude Code 将第一行换为 `/flow-diagram`。

需要动画时，说明先后顺序与状态变化，例如：

```text
使用 flow-diagram skill 解释一次请求与响应。
客户端、API 与数据库全程可见。先展示全图，再依次演示请求到达 API、
查询数据库、向客户端返回响应，最后回到全图。
```

根据资料创作时，指定允许读取的文件或目录。已知受众、实际展示尺寸和导出格式时，一并说明。助手会询问影响含义或展示的缺口；明确要求后，可保存项目设计偏好。

## 交付内容

成功收尾后，用浏览器打开 `.diagrams/order-platform/diagram.html`。页面可离线使用，包含播放控件，初始状态为暂停。

| 文件 | 用途 |
| --- | --- |
| `diagram.html` | 离线讲解页面与播放器 |
| `diagram.json` | 可编辑图解，用于修订与导出 |
| `report.json`、`report.md` | 来源、已完成检查、警告与未完成事项 |
| `diagram.svg` | 本例明确请求的静态导出 |

SVG、PNG 与 GIF 均为可选导出。HTML 页面的正文位于图外，不包含在图片导出中。保留 HTML、JSON 与报告，以便后续编辑时保留页面设计。成功收尾默认清理本次任务的草稿和截图；需要保留历史时提前提出。失败任务保留恢复文件。

## 适用范围

- 系统架构与边界、请求响应、重试、状态变化和分阶段处理。
- 根据指定资料制作图解，记录来源与内容取舍。
- 修订、只读校验、布局诊断与交付文件检查。
- 离线讲解、网页插图和演示文稿图片素材；不生成 PPTX 或 PowerPoint 原生形状。

## 基于 FlowSVG

[FlowSVG（流形）](https://github.com/yokingma/FlowSVG) 是面向系统和流程解释的开源 TypeScript 图解 SDK。用同一份可编辑 JSON 或 TypeScript 文档描述节点、连线、分组、场景和节拍，由 SDK 校验、渲染、播放状态变化，并导出离线 HTML、SVG、PNG 或 GIF。“可执行”指作者定义的视觉状态与过渡，不执行所解释的业务流程。

本 **Skill** 指导助手读取资料、设计讲解方式、创作与修订图解、规划布局、检查结果，最后交付文件与报告；**FlowSVG SDK** 提供底层渲染与播放能力。需要将图解嵌入应用时，可直接使用 SDK 的原生浏览器、React、Vue 或 Web Component 集成，见 [SDK 仓库](https://github.com/yokingma/FlowSVG)与 [npm 包](https://www.npmjs.com/package/flowsvg)。

### 运行时依赖

Skill 在隔离缓存中准备以下锁定的软件包：

| 软件包 | 版本 | 用途 |
| --- | --- | --- |
| `flowsvg` | `0.2.2` | 图解校验、内容测量、几何诊断、渲染、播放与导出 |
| `playwright-core` | `1.58.2` | 控制已准备的浏览器，执行检查及 PNG、GIF 生成；不包含浏览器程序 |
| `gifenc` | `1.0.3` | GIF 编码，通过 `flowsvg` 间接安装 |

[运行时 manifest](skills/flow-diagram/runtime/manifest.json)记录精确 SDK 基线；[运行时依赖清单](skills/flow-diagram/runtime/package.json)与[锁文件](skills/flow-diagram/runtime/package-lock.json)定义依赖版本和完整性。上游 SDK 发布新版本不会自动升级 Skill。React、Vue 属于 SDK 的可选集成，使用本 Skill 无需安装它们。用户需要的 Node/npm 与浏览器环境见[安装](#安装)。

## 当前状态

项目处于实验阶段，`0.1.0` 为首个独立发布候选版本；发布与验证要求见[发布流程](docs/releasing.md)。安装命令跟随仓库默认分支。

平台与助手宿主的验证范围仍有限，Windows 控制台 Ctrl+C 验收及 Claude Code 图解任务验证尚未完成。详见[已知平台限制与验证要求](docs/development/flow-diagram-maintenance.md#ci-and-platform-evidence)；各候选版本的已验证环境应在发布说明中列明。

文件生成、程序检查与实际视觉复核分别记录。缺少浏览器或图片查看能力时，依赖这些能力的检查保持未完成。

## 开发

使用 Node 20+ 与 pnpm `10.12.1`：

```sh
pnpm install --frozen-lockfile
pnpm test
```

未设置 `FLOWSVG_TEST_BROWSER` 时会跳过依赖浏览器的测试。浏览器与消费者验收步骤见[贡献说明](CONTRIBUTING.md)；维护、架构决策与发布记录从[文档导航](docs/README.md)进入。

## 许可

采用 [MIT 许可证](LICENSE)，保留 copyright © 2026 zac_ma。可单独分发的 Skill 内含同一份[许可证](skills/flow-diagram/LICENSE)。从 FlowSVG 提取的来源见[来源与许可说明](CONTRIBUTING.md#source-and-license-attribution)。第三方运行时包保留各自许可证。
