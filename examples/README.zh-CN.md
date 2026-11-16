# 示例工作区

[English](README.md)

在此维护供[安装示例库](../skills/flow-diagram/examples/README.md)使用的上游 showcase 固定快照。完整案例由 SDK Native、React、Vue demo 共用；必要能力示例也复用同一目录，此处不再维护重复开发练习。

## 预览示例库

在仓库根目录使用 Node 20+、npm 和 pnpm `10.12.1`：

```sh
pnpm examples:preview
```

在浏览器打开 `examples/.preview/index.html`。命令仅扫描两个明确目录，不递归：

| 画廊分区 | 源文件 |
| --- | --- |
| 完整案例 | `skills/flow-diagram/examples/complete/*.json` |
| SDK 必要能力 | `skills/flow-diagram/examples/capabilities/*.json` |

每张卡片链接源文件、相邻说明（如有）和完整离线播放器。完整文档也提供静态阅读阶段；导出后续画面前先阅读说明与当前编译结果。播放器按上游默认深色、速度 1、减少动效关闭启动，初始暂停；窄窗口可横向滚动图解。

添加、修改或删除源后重跑并刷新。命令替换 `examples/.preview/`，不监听文件也不启动服务器。渲染失败返回非零状态、报告源路径，不留下成功索引；修正输入后重建。生成成功不代表视觉质量。

生成器使用安装 CLI 锁定的隔离 SDK 基线，首次可从 npm 准备环境，缓存完整后支持离线复用。生成画廊不需要浏览器可执行文件，源字节保持不变。Git 跟踪[模板](gallery.html)、[生成器](../scripts/preview-examples.mjs)、JSON 快照与说明；生成 HTML、JSON 副本和报告在安装单元外忽略。

## 导入或修订候选

固定上游提交，从其 TypeScript 创作定义生成独立 JSON。相邻说明记录来源身份、许可、JSON 哈希及个别展示覆盖值，并链接[共用执行与查看条件](../skills/flow-diagram/examples/README.md#run-and-inspect)。上游宿主设置在 JSON 外，需显式核对主题。保留完整语义，用 Skill 锁定的公开运行时验证；上游验收不代表本次 Skill 验收。

在 `examples/<name>/` 保留一份临时候选源、当前预览和精简英文说明，不混入已发布画廊。实质性发现集中记入一个临时 `issues.md`，生成预览和过程记录保持忽略。验证、选入、发布及后续快照更新遵循[示例维护流程](../docs/development/flow-diagram-maintenance.md#teaching-example-maintenance)，并应用已有用户授权。为用户图解改编时，使用[任务内草稿](../skills/flow-diagram/examples/README.md#adapt-an-example)。
