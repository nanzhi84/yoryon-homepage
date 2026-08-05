---
title: Rushes · 本地优先的对话式视频剪辑 Agent
summary: 把专业剪辑动作收敛成可验证的对话操作：Agent 理解本机素材、引用稳定证据修改帧级时间线，用户确认预览后再导出成片。
role: 独立产品负责人（0 → 1）
period: 2026.06 - 至今
type: AI 原生创作工具
platform: Local-first Web App
stack: Go · React · Eino · SQLite · FFmpeg
links:
  - label: GitHub · nanzhi84/Rushes
    url: https://github.com/nanzhi84/Rushes
order: 1
cover: /assets/project-covers/rushes-flow.svg
coverAlt: Rushes 从本地素材与结构化证据进入 Agent 决策，再通过原子时间线、Reducer、FFmpeg 和质量门禁导出成片的架构图
coverCaption: Rushes 架构图 · 语义决策层与本地确定性执行层
featured: true
hidden: false
tags:
  - 视频剪辑 Agent
  - Local-first
  - Agent 工具设计
  - 事件溯源
  - FFmpeg
---

## 项目概览

[Rushes](https://github.com/nanzhi84/Rushes) 是一个本地优先的对话式视频剪辑 Agent。它服务于一类很常见但没有被传统剪辑软件很好覆盖的用户：**知道自己想要怎样的成片，却不熟悉轨道、关键帧、编解码和复杂剪辑界面。**

用户把素材导入本机后，可以直接描述「删掉重复的这句话」「去掉太长的气口」「这里盖一段相关 B-roll」等意图。Agent 先理解素材并检索证据，再对帧级时间线执行受约束的修改；系统渲染预览并完成黑帧、静帧、静音、响度等检查，只有在用户确认后才导出最终 MP4。

## 为什么是“本地优先”

视频素材体积大、隐私敏感，频繁上传云端也会显著放慢编辑反馈。Rushes 因此把素材、SQLite 数据库、时间线、渲染和导出都留在用户设备上；外部模型只接收任务需要的最小证据。

- 本地媒体通过 Range / HEAD 端点按需读取，不把整段视频塞进模型上下文。
- ASR 逐句索引、镜头理解和素材证据会持久化复用，避免每轮对话重复分析。
- 没有模型密钥时，本地导入、时间线、worker、渲染和 UI 仍然可运行，模型能力则明确进入降级路径。
- 初次启动生成强随机访问 token，限制本地 API 被其他页面误调用。

## 从意图到成片的闭环

Rushes 保留了一条清晰而完整的主线：

1. **导入**：登记本机视频、音频和图片，生成稳定素材 ID。
2. **理解**：ASR 建立逐句、逐词与气口索引；视觉模型和确定性传感器产出结构化镜头证据。
3. **对话编辑**：Eino ReAct Agent 根据当前阶段动态选择工具，读取证据后提交时间线操作。
4. **预览与质检**：FFmpeg 渲染指定 `timeline_id` 的快照，再分别检查解码、黑帧、静帧、静音、响度和画面有效性。
5. **确认与导出**：预览通过且用户确认后，使用同一版本时间线生成最终 MP4。

界面通过 domain SSE 与 turn-stream 实时呈现 Agent 回复、工具调用和后台任务进度；断线重连可以重放当前回合快照，用户不会因为刷新页面而失去正在进行的编辑。

## 可控的 Agent，而不是黑盒自动成片

这个项目最核心的产品判断，是不让模型直接操作路径、FFmpeg 命令或任意 JSON。模型只看见语义明确、边界收紧的工具：

- 通用写入只保留 `timeline.insert`、`timeline.delete`、`timeline.update` 和 `timeline.split`。
- 每次工具调用只提交一个原子操作，并独立生成一个可 Rewind 的时间线版本。
- 模型引用素材 ID、逐句 ID 和 `timeline_id`；失效目标返回 `stale_target`，系统不会猜测用户想改哪个新版本。
- 工具注册和执行前都有 PolicyGate，路径与底层命令等危险字段无法进入模型 schema。
- 删除长期记忆等破坏性动作进入确认流程，普通时间线编辑则保持可回退。

这样设计后，「对话式」不再意味着不可预测。用户能看到 Agent 改了什么、依据是什么，也可以回到任意历史版本。

## 工程架构

当前后端是一套面向生产语义重写的精简核心：

- **Go + chi** 提供 REST、OpenAPI、鉴权、SSE 和本地媒体服务。
- **CloudWeGo Eino** 承载 ReAct Agent，并按任务阶段动态绑定 22 个模型工具。
- **Reducer** 是唯一业务写路径：事件、物化表和侧行在同一个 SQLite 事务中提交。
- **SQLite WAL** 记录事件日志、读模型和任务状态；乐观锁保护并发编辑，稳定 merge key 保证 worker 重试幂等。
- **Go worker + FFmpeg** 通过 claim、lease 和 heartbeat 执行媒体任务；取消时终止整个进程组，并从 `-progress` 输出读取机器可解析进度。
- **React / Vite** 前端围绕素材、对话、时间线、预览与导出组织，而不是复刻传统专业剪辑软件的所有面板。

## 我在解决什么

Rushes 不是把聊天框贴在剪辑器旁边，而是在重新定义模型、确定性系统和人的责任边界：

- 人负责表达意图、判断效果和确认破坏性选择；
- Agent 负责把意图拆成受约束的原子编辑；
- 检索与传感器提供可复查证据；
- 时间线、版本、渲染和质检由确定性系统兜底。

这种边界让 AI 真正进入编辑主流程，同时保留专业工具最重要的可预测性、可回退性和成片质量。
