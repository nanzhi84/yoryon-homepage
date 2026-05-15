---
title: AI Agent 工作流产品化实践
summary: 把代码审查、问题定位、数据采集与内容生产等高频任务，拆解为可复用的标准化 AI 协作 Skill。
role: 流程设计者 · 个人工具构建
period: 2025.12 - 至今
type: 个人长期项目
platform: Codex · Cursor · Claude Code
stack: Skill · Prompt · Agent 工作流
order: 3
tags:
  - Agent 工作流
  - Prompt 工程
  - AI 协作
  - 个人效率
---

## 出发点

长期跟进并高频使用 Codex、Cursor、Claude Code、Antigravity 等 AI 编程与 Agent 工具后，重复任务的边际收益开始递减。把它们拆成「标准输入 → 执行步骤 → 校验点 → 交付物」的标准流程，是放大 AI 协作产出的关键。

## 已沉淀的 Skill

- **self-iterating-review**：fresh-context 多轮代码审查循环，避免单轮审查的盲点。
- **network-capture**：浏览器请求复现的标准化流程，统一数据采集入口。
- **DRTyping**：类型化数据处理与转换。
- **wechat-writer**（私有）：公众号写作发布全流程，覆盖选题、结构、封面与排版。

## 设计原则

- **保留人工判断节点**：复审循环、可复现输入、结构化输出。
- **失败兜底**：AI 不可靠时不让核心流程崩塌。
- **结构化交付**：稳定性与可复查性优先于"快速但混乱"。
