# Flow SVG Diagram

通过 AI 编程助手创作可编辑的系统与流程图解。描述关系或提供来源资料，即可生成静态或动画图解，并获得离线播放文件和检查报告。

[English](README.md) · [用户指南](docs/guides/flowsvg-skill-guide.zh-CN.md) · [示例](skills/flow-svg-diagram/examples/README.md) · [文档导航](docs/README.md)

## 可以做什么

- 解释系统架构、请求响应、重试、状态变化和分阶段处理。
- 从指定文件或代码仓库资料创作图解，记录来源与用户决定。
- 修订可编辑 JSON，校验已有图解，检查布局诊断。
- 交付在图外排版介绍、内嵌播放控件的离线 HTML，按需导出 SVG、PNG 或 GIF。

本仓维护 **Skill** 的创作、布局计划、检查、复核与交付流程。[FlowSVG SDK](https://github.com/yokingma/FlowSVG) 维护图解模型、渲染、播放、导出 API 与应用嵌入。Skill 在隔离缓存中使用公开 npm 包 `flowsvg@0.2.2`，无需 SDK 源码仓库，也无需给用户应用添加 SDK 依赖。“可执行”指播放图解定义的视觉状态，不代表执行所解释的业务。

## 环境要求

- 支持 Skill、可执行本地 Node 命令的助手，例如 Codex 或 Claude Code。
- Node.js 20+ 与 npm。首次准备运行时需要访问 npm registry；缓存完整后可离线复用。
- PNG、GIF 与浏览器检查需要单独准备 Chrome/Chromium 可执行文件。生成 JSON、HTML 与 SVG 无需浏览器，Skill 不自动下载浏览器。

## 安装

推荐使用 Skills CLI 安装。在任意项目中执行：

```sh
npx skills add yokingma/flow-svg-diagram-skills
```

CLI 会发现 `skills/flow-svg-diagram/SKILL.md`，并在交互过程中让你选择 Skill 和目标 Agent。若要无交互地安装到当前用户的 Codex 全局目录，执行：

```sh
npx skills add yokingma/flow-svg-diagram-skills --global --agent codex --yes
```

不加 `--global` 时，Skill 安装到当前项目。可用 `npx skills list`、`npx skills check` 和 `npx skills update flow-svg-diagram` 查看与更新受 CLI 管理的安装。shorthand 默认使用仓库分支；需要可复现时请使用 release tag 或固定提交。

本地开发或需要手动固定源码时，再克隆仓库并复制完整的 [`skills/flow-svg-diagram/`](skills/flow-svg-diagram/) 目录。保留包括 `LICENSE`、脚本、参考资料、示例与运行时锁文件在内的所有文件。在克隆目录中，首次为当前用户安装 Codex Skill 的 macOS/Linux 命令如下：

```sh
mkdir -p "$HOME/.agents/skills"
cp -R skills/flow-svg-diagram "$HOME/.agents/skills/flow-svg-diagram"
node "$HOME/.agents/skills/flow-svg-diagram/scripts/flowsvg.mjs" doctor
node "$HOME/.agents/skills/flow-svg-diagram/scripts/flowsvg.mjs" prepare
```

仅在目标目录尚不存在时使用上述复制命令。更新时先备份，再替换整个安装目录，避免已删除文件残留。[安装指南](docs/guides/flowsvg-skill-guide.zh-CN.md#2-安装到宿主)包含项目级路径、Claude Code 与 PowerShell 步骤。Codex 未发现新 Skill 时重启后检查。使用 Skill 无需执行 `pnpm install`。

## 创建第一张图解

在 Codex 中发送：

```text
$flow-svg-diagram
创建静态架构图：客户端调用 API 服务，API 服务查询数据库。
API 与数据库属于“订单平台”，客户端位于该边界之外。
使用中文标签和浅色主题，命名为 order-platform。
交付默认 JSON、离线 HTML，另外导出 SVG。
```

Claude Code 将第一行换为 `/flow-svg-diagram`。需要动画时，明确说明先后顺序与状态变化。指定资料创作、修订、导出与直接调用 CLI 的方法见[用户指南](docs/guides/flowsvg-skill-guide.zh-CN.md)。

成功收尾后，选定结果保存在工作目录下：

```text
.diagrams/order-platform/
  diagram.json
  diagram.html
  diagram.svg       # 本例明确请求
  report.json
  report.md
```

用浏览器打开 `diagram.html` 离线查看与播放，保留 `diagram.json` 供后续编辑。报告分别说明文件交付、已完成检查与未解决问题。成功收尾默认清理本次任务的草稿和截图；需要完整历史时提前提出。失败任务保留恢复文件。

## 当前状态与限制

项目仍处于实验阶段，`0.1.0` 为准备中的首个独立版本。Skill 版本、工具报告版本与 SDK 版本分别管理。需要可复现安装时，选择发布标签或记录源码提交；本页不表示发布标签已经存在。


生成文件与程序检查不代表实际视觉复核。缺少浏览器或图片查看能力时，检查覆盖保持未完成。Skill 交付图解资产，不生成 PPTX 或 PowerPoint 原生形状。

## 开发与贡献

使用 Node 20+ 与 `packageManager` 指定的 pnpm `10.12.1`：

```sh
pnpm install --frozen-lockfile
pnpm test
```

浏览器用例仅在 `FLOWSVG_TEST_BROWSER` 指向已准备好的 Chrome/Chromium 时运行，否则明确跳过。独立的完整消费者验收还需要真实 Node 18 可执行文件，以验证不受支持运行时的拒绝行为：

```sh
pnpm verify:consumer --browser "/path/to/chrome" --node18 "/path/to/node18" --output acceptance/evidence.json
```

参阅[贡献说明](CONTRIBUTING.md)、[维护指南](docs/development/flowsvg-skill-maintenance.md)、[实现约定](PATTERNS.md)、[变更记录](CHANGELOG.md)与[发布流程](docs/releasing.md)。仓库开发依赖使用根目录 pnpm 锁；安装后的 Skill 使用独立 npm 运行时锁。

## 许可与来源

采用 [MIT 许可证](LICENSE)，保留 copyright © 2026 zac_ma。可单独分发的 Skill 内含同一份[许可证](skills/flow-svg-diagram/LICENSE)。本项目从 FlowSVG 提取；[快照来源](docs/snapshot-provenance.md)记录来源提交、归属与运行时身份。第三方运行时包保留各自许可证。
