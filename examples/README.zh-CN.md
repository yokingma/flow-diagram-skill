# 示例工作区

[English](README.md)

预览和维护[图解示例库](../skills/flow-diagram/examples/README.md)。完整案例来自 FlowSVG，专项练习展示单项创作能力。

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

添加、修改或删除源后重跑并刷新。命令替换 `examples/.preview/`，不监听文件也不启动服务器。渲染失败返回非零状态、报告源路径，不留下成功索引；修正输入后重建，并在浏览器中查看生成的图解。

生成器使用安装 CLI 锁定的隔离 SDK 基线，首次可从 npm 准备环境，缓存完整后支持离线复用。生成画廊不需要浏览器可执行文件，源字节保持不变。Git 跟踪[模板](gallery.html)、[生成器](../scripts/preview-examples.mjs)、JSON 快照与说明；生成 HTML、JSON 副本和报告在安装单元外忽略。

## 导入或修订候选

先区分来源：完整案例保持为上游快照；缺少合适上游素材的必要能力可采用小型 Skill 自有练习。自有练习以 JSON 为创作源，记录教学假设与参考资料，不声明上游字节一致性。

导入上游快照时，固定提交并从其 TypeScript 创作定义生成独立 JSON。来源提交、JSON 哈希、展示覆盖值、来源链接和许可先随候选说明保存，并链接[共用执行与查看条件](../skills/flow-diagram/examples/README.md#run-and-inspect)。上游宿主设置在 JSON 外，需显式核对主题。保留完整语义，再用 Skill 运行时校验并查看结果。

在 `examples/<name>/` 保留一份临时候选源、当前预览和精简英文说明，不混入已发布画廊。实质性发现集中记入一个临时 `issues.md`，生成预览和过程记录保持忽略。验证、选入、发布及后续快照更新遵循[示例维护流程](../docs/development/flow-diagram-maintenance.md#teaching-example-maintenance)，并应用已有用户授权。选定后再发布源文件和简短说明，将来源提交、JSON 哈希和展示覆盖值转入 `skills/flow-diagram/resources/teaching-sources.json`；所选源文件与元数据一致、安装链接可解析后完成。为用户图解改编时，使用[任务内草稿](../skills/flow-diagram/examples/README.md#adapt-an-example)。
