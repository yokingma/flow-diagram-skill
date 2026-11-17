# Flow Diagram

基于 [FlowSVG（流形）](https://github.com/yokingma/FlowSVG)，从自然语言、文档或代码创作可编辑系统与流程图解的 Agent Skill。将静态说明或动画演示交付为自包含离线 HTML，同时保留可编辑 JSON 与检查报告；按需导出 SVG、PNG 或 GIF。

[English](README.md) · [安装](#安装) · [用户指南](docs/guides/flow-diagram-guide.zh-CN.md) · [示例](skills/flow-diagram/examples/README.md) · [贡献说明](CONTRIBUTING.md)

## 典型示例

用 FlowSVG 动画展示请求流程、部署架构与模型推理。[图片来源](docs/images/flowsvg/README.md)。

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/request-response.gif" alt="客户端与服务之间的请求和响应动画" width="700"></p>

<p align="center"><em>请求与响应：客户端与服务之间的调用过程。</em></p>

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/web-service-deployment.gif" alt="包含两个应用副本的 Web 服务部署" width="700"></p>

<p align="center"><em>Web 服务部署：展示两个应用副本及其运行边界。</em></p>

<p align="center"><img src="https://raw.githubusercontent.com/yokingma/FlowSVG/952826129edb0a8e0ff9704e7bbd10df6fc1bec3/packages/flowsvg/docs/images/llm-inference.gif" alt="包含 Transformer 层与 KV Cache 复用的 LLM 推理过程" width="700"></p>

<p align="center"><em>LLM 推理：展示 Transformer 层与 KV Cache 复用。</em></p>

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

描述希望读者理解什么，助手会选择图形类型、制作图解、检查结果并交付文件。你也可以直接指定分层架构图、逻辑流程图等类型。

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

根据资料创作时，指定允许读取的文件或目录。已知受众、实际展示尺寸和导出格式时，一并说明。助手会询问影响含义或展示的缺口；你明确说明以后在本项目继续采用的偏好，助手会保存。

## 交付内容

图解完成后，用浏览器打开 `.diagrams/order-platform/diagram.html`。页面可离线使用，包含播放控件，初始状态为暂停。

| 文件 | 用途 |
| --- | --- |
| `diagram.html` | 离线讲解页面与播放器 |
| `diagram.json` | 可编辑图解，用于修订与导出 |
| `report.json`、`report.md` | 来源、已完成检查、警告与未完成事项 |
| `diagram.svg` | 本例明确请求的静态导出 |

SVG、PNG 与 GIF 均为可选导出，页面标题和简介不包含在图片中。保留 HTML、JSON 与报告，以便后续修订。导出选项与故障恢复见[用户指南](docs/guides/flow-diagram-guide.zh-CN.md)。

## 适用范围

- 系统架构与边界、请求响应、重试、状态变化和分阶段处理。
- 根据指定资料制作图解，记录来源与内容取舍。
- 静态图与逐步动画，以及已有图解的修订和校验。
- 离线讲解、网页插图和演示文稿图片素材；不生成 PPTX 或 PowerPoint 原生形状。

## 基于 FlowSVG

[FlowSVG（流形）](https://github.com/yokingma/FlowSVG) 提供渲染、播放与导出能力，本 Skill 帮助助手将资料转化为清晰的图解。需要将图解嵌入应用时，可使用 SDK 的原生浏览器、React、Vue 或 Web Component 集成。

## 开发

使用 Node 20+ 与 pnpm `10.12.1`：

```sh
pnpm install --frozen-lockfile
pnpm test
```

测试和贡献方式见[贡献说明](CONTRIBUTING.md)，本地预览见[示例工作区](examples/README.zh-CN.md#预览示例库)，版本历史见[变更记录](CHANGELOG.md)。

## 许可

采用 [MIT 许可证](LICENSE)，保留 copyright © 2026 zac_ma。可单独分发的 Skill 内含同一份[许可证](skills/flow-diagram/LICENSE)。从 FlowSVG 提取的来源见[来源与许可说明](CONTRIBUTING.md#source-and-license-attribution)。第三方运行时包保留各自许可证。
