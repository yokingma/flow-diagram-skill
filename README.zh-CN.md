# Flow SVG Diagram

面向系统和流程解释的可执行图表 Skill。一次编写，支持播放、嵌入、检查和导出。

[English](README.md) · [中文用户指南](docs/guides/flowsvg-skill-guide.zh-CN.md) · [文档导航](docs/README.md)

本仓维护 Skill 的创作、布局计划、检查、复核和交付流程。[FlowSVG SDK](https://github.com/yokingma/FlowSVG) 维护图解模型、渲染、播放和导出 API，供应用集成。Skill 通过公开 npm 包使用精确锁定的 `flowsvg@0.2.2`，无需 SDK 源码或本地兄弟仓库。“可执行”指播放图解定义的视觉状态，不代表执行所解释的业务。

## 从本地快照安装

将完整的 [`skills/flow-svg-diagram`](skills/flow-svg-diagram/) 目录复制到助手的 skill 安装位置。保留 `SKILL.md`、`agents/`、`scripts/`、`references/`、`examples/` 和 `runtime/`。调用名为 `flow-svg-diagram`；各宿主位置与调用方式见[安装指南](docs/guides/flowsvg-skill-guide.zh-CN.md#2-安装到宿主)。

需要 Node 20+ 与 npm。从选定工作目录执行：

```sh
node /absolute/path/to/flow-svg-diagram/scripts/flowsvg.mjs doctor
node /absolute/path/to/flow-svg-diagram/scripts/flowsvg.mjs prepare
```

默认交付可编辑 JSON、离线 HTML 与报告。可按需导出 SVG、PNG 或 GIF；PNG、GIF 与浏览器检查需要已准备好的 Chrome，工具不自动下载浏览器。运行时缓存与用户应用依赖隔离。


## 维护

```sh
pnpm install --frozen-lockfile
pnpm test
```

开发锁文件与安装单元的运行时 npm 锁分别维护。维护方法见[维护指南](docs/development/flowsvg-skill-maintenance.md)，实现约定见 [PATTERNS](PATTERNS.md)，独立版本记录见 [CHANGELOG](CHANGELOG.md)。完整的 27 个 Skill 回归文件位于 `tests/`，夹具和 GIF 解码测试依赖由本仓维护。设置 `FLOWSVG_TEST_BROWSER` 为已准备好的 Chrome 路径后可运行浏览器用例；未设置时会明确跳过这些用例。完整消费者验收使用 `pnpm verify:consumer --browser "/path/to/chrome" --node18 "/path/to/node18" --output acceptance/evidence.json`。CI 配置及实际本地范围见[维护指南](docs/development/flowsvg-skill-maintenance.md#ci-and-platform-evidence)；跨平台 CI 尚未执行，Windows Ctrl+C 验收仍未完成。
