---
title: CutFlow · B 端 AI 短视频交付平台
summary: 面向本地商家重复生产数字人短视频的内容操作系统：把账号策略、脚本、素材、成片、发布、成本与效果复盘放进一条可审计、可复用的生产链路。
role: 联合创始人 · 产品与 AI 流水线负责人
period: 2026.05 - 至今
type: B 端 AI 内容生产平台
platform: Web Console · Production Pipeline
stack: FastAPI · Temporal · PostgreSQL · React · FFmpeg
order: 3
cover: /assets/project-covers/cutflow-flow.svg
coverAlt: CutFlow 以 Case 为长期边界，由 Temporal 编排脚本、声音、素材、数字人、渲染、质检和发布，并通过运营数据回流的系统结构图
coverCaption: CutFlow 系统结构图 · Case-first、Temporal 生产链与发布数据闭环
featured: true
hidden: false
tags:
  - AI 视频生产
  - B 端产品
  - Temporal
  - 多模型治理
  - 商业化
---

## 项目概览

[CutFlow](https://github.com/nanzhi84/CutFlow) 是一套面向本地服务商和商家账号的 AI 短视频交付平台。它解决的不是「偶尔生成一条看起来不错的视频」，而是更难的经营问题：**怎样围绕同一个账号，持续、稳定、可核算地生产内容，并让每轮结果回流到下一轮。**

我作为联合创始人负责产品定义、AI 视频生产流水线、B 端交付与商业化。项目曾稳定服务 2 个商家账号，月营业额约 **1.5 万元**，先通过真实付费验证了「账号定位 → 脚本 → 成片 → 发布 → 复盘」这条链路的价值，再把人工交付经验沉淀为系统。

## Case-first：让系统记住一个账号，而不是只记住一次任务

传统 AI 视频工具通常从一段 prompt 开始，生成结束后上下文也随之消失。CutFlow 把 **Case** 作为长期产品边界：

- 账号定位、品牌禁区、目标受众和内容策略进入 Case 上下文。
- 脚本、素材、音色、Prompt 版本和供应商配置都绑定到明确的生产事实。
- 每次成片、发布与效果数据回流到评分卡和复盘流程。
- 下一轮创作读取的是被验证过的账号经验，而不是重新从空白 prompt 猜测。

因此，CutFlow 更像一个内容操作系统，而不是一次性生成器。

## 数字人视频生产流水线

一条 `DigitalHumanVideo` 任务会生成可追踪的 `WorkflowRun`。当前主链包含 **19 个固定节点**，活动 Agent 链为 **20 个节点**，覆盖：

1. 输入校验与 Case 上下文加载；
2. 创作意图解析与脚本版本管理；
3. TTS 旁白、ASR / 强制对齐；
4. 人像、B-roll、BGM 与字幕样式规划；
5. 数字人 LipSync、帧级时间线和 FFmpeg 渲染；
6. 固定字幕带、BGM 混音、成片质检；
7. 封面、发布文案、发布包与最终运行报告。

系统同时保留两类责任边界：媒体 Agent 负责做需要语义判断的素材选择，字幕带、时长拟合、渲染和验证则交给确定性编排器。模型不会因为一次输出波动而绕过生产规则。

## 多模型能力如何被产品化

流水线需要 LLM、VLM、TTS、ASR、对口型、文生图和文生视频等多种外部能力。CutFlow 没有把这些 SDK 分散写进业务节点，而是通过 `ProviderGateway` 按能力路由：

- 节点只声明需要哪种能力，不直接绑定某一家模型。
- Provider Profile、Secret Store 和 Prompt Registry 分别管理供应商、密钥与提示词版本。
- 未配置真实 provider 时显式失败；只有本地 demo 或测试可以明确打开 sandbox fallback。
- 每次调用记录 token、耗时、预估 / 实际成本、模型与 Prompt 版本，便于追责和替换。
- 幂等键与 typed artifact 让重试能够复用已经完成的外部调用和媒体产物。

这套抽象的目的不是追求「接更多模型」，而是让供应商替换、价格变化和单点故障不再直接污染业务流程。

## 为重复交付设计的运营能力

CutFlow 把成本和成品率当作一等产品对象，而不是上线后再补日志：

- 11 项单片成本指标覆盖成片、质检通过、发布、重试、浪费和按 provider / model / prompt 归因。
- 11 项成品率漏斗追踪从任务进入、各阶段完成，到质检、人工确认和发布的转化。
- 预算阈值、余额监控、熔断和告警在调用前后参与决策。
- 内容哈希、节点输入和 artifact manifest 共同决定哪些结果可以安全复用。
- 素材 ledger 会降低近期反复使用素材的权重，减少连续视频里的画面重复。
- 降级、返工和人工审批都写入审计事件，不允许静默吞掉失败。

## 工程架构

- **FastAPI + OpenAPI** 是 API 与 React 控制台的契约事实源。
- **Temporal** 承载长流程、重试、取消、恢复和多 worker 编排；API 只负责准入与控制。
- **PostgreSQL / SQLAlchemy** 保存业务事实，**对象存储**保存媒体与中间产物。
- **Redis** 只用于多副本下的限流、实时事件 fanout 和协调，不被当作业务真源。
- **FFmpeg / FFprobe** 负责转码、裁切、对齐、时间线渲染、字幕与 BGM 混合及输出验证。
- **ProviderGateway + Prompt Registry** 管理多模型调用和提示词生命周期。
- **OceanEngine / XLSX connector** 将外部效果数据带回复盘链路。

## 我的工作

我把线下交付中反复发生的判断拆成产品规则、Agent 决策和确定性节点，并推动它们形成可以长期运营的系统：

- 从本地商家痛点、交付报价和内容节奏出发定义产品边界；
- 设计 Case、脚本、素材、成片、发布与复盘之间的数据关系；
- 拆分模型适合做的语义判断与系统必须保证的确定性不变量；
- 建立成本、成品率、复用、预算和供应商治理，使 AI 能力可被商业交付。

项目地址：[GitHub · nanzhi84/CutFlow](https://github.com/nanzhi84/CutFlow)
