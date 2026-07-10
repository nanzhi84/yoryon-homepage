---
title: "Claude 里 subagent 和 agent teams 的区别"
description: "从上下文隔离、通信拓扑、协调方式到成本，拆解 Claude 里 subagent 和 agent teams 的区别与选型。"
pubDate: 2026-07-09
createdAt: 2026-07-09T00:00:00+08:00
updatedDate: 2026-07-09
category: Tech
tags:
  - "AI"
  - "Claude"
  - "Agent"
readingTime: 7 min read
featured: false
draft: false
---
Claude 官方文档把并行工作拆成两套机制：subagent 和 agent teams。subagent 在 Claude Agent SDK 和 Claude Code 里都已稳定可用，agent teams 只在 Claude Code 里提供，而且默认关闭，属于实验特性。两套机制都能让多个 agent 同时干活，区别在于这些 agent 之间要不要互相通信。

### subagent：主 agent 派出的独立实例

subagent 是主 agent 临时派出去处理某个子任务的独立 agent 实例。它在一个全新的对话里运行，不带主 agent 的对话历史，不带主 agent 的系统提示词，也不带预加载的 skill。唯一从父到子的通道，是调用时传进去的那段 prompt 字符串。所以子任务需要的文件路径、报错信息、已经定好的决策，都得直接写进这段 prompt。

subagent 跑完之后，中间所有的工具调用和结果都留在它自己的上下文里，只有最后一条消息作为结果返回给父 agent。父 agent 拿到的是一份浓缩摘要，不是这个 subagent 读过的每个文件。

在 Claude Agent SDK 里，subagent 用 `agents` 参数定义。一个定义至少要有 `description`（告诉 Claude 什么时候该用它）和 `prompt`（它的系统提示词），可选 `tools`（限制它能用哪些工具）、`model`（覆盖默认模型）等字段。

```typescript
agents: {
  "code-reviewer": {
    description: "代码审查专家，用于质量、安全、可维护性审查。",
    prompt: "你是代码审查专家，重点找安全漏洞、性能问题和规范偏差……",
    tools: ["Read", "Grep", "Glob"],  // 只读，不能改文件
    model: "sonnet"
  }
}
```

Claude 根据 `description` 自动判断要不要派这个 subagent，也可以在 prompt 里点名"用 code-reviewer 审查这个模块"来强制调用。调用走的是 Agent 工具（这个工具在 v2.1.63 之前叫 Task）。

subagent 之间不通信。每个 subagent 只把结果报告回主 agent，彼此看不见对方。多个 subagent 可以并发跑，几个独立子任务的总耗时是最慢那个，而不是逐个相加。

### agent teams：一组对等的 Claude Code 会话

agent teams 让多个 Claude Code 实例作为一个团队协作。其中一个会话是 team lead，负责派活、分任务、汇总结果；其余是 teammate，每个都是完整独立的 Claude Code 会话，在各自的上下文窗口里工作。

和 subagent 的关键差别：teammate 之间可以直接通信，你也可以绕过 lead，直接给某个 teammate 发消息、追加指令、纠偏。

agent teams 默认关闭，属于实验特性。要打开，得在环境变量或 settings.json 里设 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`。

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

打开之后，用自然语言描述任务和你想要的 teammate，Claude 会 spawn 出对应的会话并协调工作。一个团队由四部分组成：team lead（主会话），teammate（干活的独立会话），task list（共享任务列表），mailbox（agent 之间的消息系统）。

### 上下文和通信

这是两者的核心差别。

subagent 是星型结构。主 agent 在中心，派出若干 subagent，每个 subagent 干完把结果单向返回中心，全程不和其它 subagent 说话。所有协调逻辑都装在主 agent 自己的上下文里。

agent teams 是网状结构，外加一块共享任务板。teammate 之间通过 mailbox 直接互发消息，消息自动送达，lead 不用主动轮询。所有 agent 还共享一份任务列表，能看到彼此的任务状态、认领可用的活。SendMessage 和任务管理工具对每个 teammate 永远可用，即使它的其它工具被限制了。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" font-family="-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<defs>
      <marker id="d1blue" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="#2563eb"/></marker>
      <marker id="d1orange" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="#ea580c"/></marker>
    </defs>
<rect x="0" y="0" width="1000" height="600" fill="#ffffff"/>
<line x1="500" y1="60" x2="500" y2="560" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="6 6"/>
<text x="250" y="42" text-anchor="middle" font-size="20" font-weight="800" fill="#1d4ed8">subagent</text>
<text x="250" y="66" text-anchor="middle" font-size="13.5" fill="#475569">星型，只向中心汇报结果</text>
<line x1="228.8" y1="205.8" x2="138.5" y2="379.5" stroke="#93c5fd" stroke-width="1.8" stroke-dasharray="5 5" marker-end="url(#d1blue)"/>
<line x1="138.5" y1="379.5" x2="228.8" y2="205.8" stroke="#2563eb" stroke-width="2.4" marker-end="url(#d1blue)"/>
<line x1="250.0" y1="211.0" x2="250.0" y2="375.0" stroke="#93c5fd" stroke-width="1.8" stroke-dasharray="5 5" marker-end="url(#d1blue)"/>
<line x1="250.0" y1="375.0" x2="250.0" y2="211.0" stroke="#2563eb" stroke-width="2.4" marker-end="url(#d1blue)"/>
<line x1="271.2" y1="205.8" x2="361.5" y2="379.5" stroke="#93c5fd" stroke-width="1.8" stroke-dasharray="5 5" marker-end="url(#d1blue)"/>
<line x1="361.5" y1="379.5" x2="271.2" y2="205.8" stroke="#2563eb" stroke-width="2.4" marker-end="url(#d1blue)"/>
<circle cx="250" cy="165" r="46" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5"/><text x="250" y="161" text-anchor="middle" font-size="17" font-weight="700" fill="#0f172a">主 agent</text><text x="250" y="181" text-anchor="middle" font-size="12.5" fill="#475569">编排 + 汇总</text>
<circle cx="120" cy="415" r="40" fill="#ffffff" stroke="#2563eb" stroke-width="2.5"/><text x="120" y="421" text-anchor="middle" font-size="16" font-weight="700" fill="#0f172a">sub 1</text>
<circle cx="250" cy="415" r="40" fill="#ffffff" stroke="#2563eb" stroke-width="2.5"/><text x="250" y="421" text-anchor="middle" font-size="16" font-weight="700" fill="#0f172a">sub 2</text>
<circle cx="380" cy="415" r="40" fill="#ffffff" stroke="#2563eb" stroke-width="2.5"/><text x="380" y="421" text-anchor="middle" font-size="16" font-weight="700" fill="#0f172a">sub 3</text>
<text x="250" y="490" text-anchor="middle" font-size="12.5" fill="#64748b">虚线派发，实线单向返回摘要</text>
<text x="250" y="512" text-anchor="middle" font-size="12.5" font-weight="600" fill="#dc2626">subagent 之间没有连线，彼此看不见</text>
<text x="750" y="42" text-anchor="middle" font-size="20" font-weight="800" fill="#c2410c">agent teams</text>
<text x="750" y="66" text-anchor="middle" font-size="13.5" fill="#475569">网状，teammate 互相通信 + 共享任务板</text>
<line x1="668.0" y1="320.0" x2="710.0" y2="320.0" stroke="#ea580c" stroke-width="2.2"/>
<line x1="668.0" y1="320.0" x2="832.0" y2="320.0" stroke="#ea580c" stroke-width="2.2"/>
<line x1="790.0" y1="320.0" x2="832.0" y2="320.0" stroke="#ea580c" stroke-width="2.2"/>
<line x1="723.2" y1="187.4" x2="651.3" y2="287.5" stroke="#fb923c" stroke-width="1.8" stroke-dasharray="4 5"/>
<line x1="750.0" y1="196.0" x2="750.0" y2="280.0" stroke="#fb923c" stroke-width="1.8" stroke-dasharray="4 5"/>
<line x1="776.8" y1="187.4" x2="848.7" y2="287.5" stroke="#fb923c" stroke-width="1.8" stroke-dasharray="4 5"/>
<rect x="585" y="440" width="330" height="62" rx="10" fill="#fff7ed" stroke="#ea580c" stroke-width="2.2"/>
<text x="750.0" y="466" text-anchor="middle" font-size="14" font-weight="700" fill="#c2410c">共享任务列表 + mailbox</text>
<text x="750.0" y="486" text-anchor="middle" font-size="12" fill="#9a3412">自认领 · 依赖解锁 · 消息自动送达</text>
<line x1="628.0" y1="360.0" x2="628.0" y2="440.0" stroke="#fdba74" stroke-width="1.5" stroke-dasharray="3 4"/>
<line x1="750.0" y1="360.0" x2="750.0" y2="440.0" stroke="#fdba74" stroke-width="1.5" stroke-dasharray="3 4"/>
<line x1="872.0" y1="360.0" x2="872.0" y2="440.0" stroke="#fdba74" stroke-width="1.5" stroke-dasharray="3 4"/>
<circle cx="750" cy="150" r="46" fill="#fff7ed" stroke="#ea580c" stroke-width="2.5"/><text x="750" y="146" text-anchor="middle" font-size="17" font-weight="700" fill="#0f172a">lead</text><text x="750" y="166" text-anchor="middle" font-size="12.5" fill="#475569">派活 + 汇总</text>
<circle cx="628" cy="320" r="40" fill="#ffffff" stroke="#ea580c" stroke-width="2.5"/><text x="628" y="326" text-anchor="middle" font-size="16" font-weight="700" fill="#0f172a">mate 1</text>
<circle cx="750" cy="320" r="40" fill="#ffffff" stroke="#ea580c" stroke-width="2.5"/><text x="750" y="326" text-anchor="middle" font-size="16" font-weight="700" fill="#0f172a">mate 2</text>
<circle cx="872" cy="320" r="40" fill="#ffffff" stroke="#ea580c" stroke-width="2.5"/><text x="872" y="326" text-anchor="middle" font-size="16" font-weight="700" fill="#0f172a">mate 3</text>
</svg>

两边的上下文起点其实一样：都是全新的上下文窗口，都不继承主会话的对话历史。teammate 会像一个普通会话那样加载项目的 CLAUDE.md、MCP server 和 skill，再加上 lead 给它的 spawn prompt。区别不在起点，在于跑起来之后信息往哪流。subagent 的信息只能往中心汇；teammate 的信息在对等节点之间横向流动。

### 协调发生在哪里

subagent 的协调全在父 agent 的上下文里。父 agent 决定派几个、派给谁、拿到结果怎么拼，子 agent 不参与编排。

agent teams 把协调外置成了一份磁盘上的共享任务列表。任务有三个状态：待处理、进行中、已完成，而且任务之间可以互相依赖，一个有未解依赖的任务在依赖完成前不能被认领。lead 可以显式指派，teammate 也可以在干完一件后自己认领下一件没人领、没被阻塞的活。多个 teammate 同时抢同一个任务时，用文件锁避免冲突。

一个 teammate 完成了别人依赖的任务后，被阻塞的任务会自动解锁，不需要人工干预。

### 生命周期和交互

subagent 是一次性派发：派出去、跑完、返回摘要。它可以被 resume，返回结果里带一个 `agentId`，配合 session resume 就能让它带着完整历史接着干。但在它跑的过程中，你没法插进去和它对话。

teammate 是一个持久、可寻址的会话。在 lead 的终端里，teammate 列在一个 agent 面板中，选中按回车就能打开它的 transcript 直接发消息。对复杂或有风险的任务，还能要求 teammate 先出 plan、经 lead 审批再动手，审批没过就打回去改。

### 成本

两套机制的 token 成本不在一个量级。subagent 把结果浓缩后才返回主上下文，中间读过的东西不进主会话，所以成本相对可控。agent teams 里每个 teammate 都是一个独立的 Claude 实例，各自维护完整的上下文窗口，token 用量随活跃 teammate 数量线性增长。官方文档给的经验值是，teammate 在 plan mode 下大约用掉标准会话 7 倍的 token。

官方也给了几条压成本的做法：teammate 用 Sonnet 而不是 Opus，团队规模保持小，spawn prompt 写得聚焦，活干完就让对应 teammate 关掉，因为每个活着的 teammate 在退出前会一直烧 token。

### 怎么选

判断口径只有一句：这些并行的 worker 需不需要互相沟通。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 560" font-family="-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<defs>
      <marker id="d2a" markerWidth="10" markerHeight="10" refX="7.5" refY="3.4" orient="auto"><path d="M0,0 L7.5,3.4 L0,6.8 Z" fill="#64748b"/></marker>
    </defs>
<rect x="0" y="0" width="1000" height="560" fill="#ffffff"/>
<text x="500" y="40" text-anchor="middle" font-size="20" font-weight="800" fill="#0f172a">怎么选</text>
<rect x="390" y="62" width="220" height="46" rx="10" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/>
<text x="500" y="90" text-anchor="middle" font-size="14.5" font-weight="600" fill="#334155">要让多个 worker 并行</text>
<line x1="500" y1="108" x2="500" y2="150" stroke="#64748b" stroke-width="2" marker-end="url(#d2a)"/>
<polygon points="500,158 650,220 500,282 350,220" fill="#fefce8" stroke="#ca8a04" stroke-width="2.4"/>
<text x="500" y="214" text-anchor="middle" font-size="14.5" font-weight="700" fill="#854d0e">worker 之间要不要</text>
<text x="500" y="235" text-anchor="middle" font-size="14.5" font-weight="700" fill="#854d0e">互相沟通 / 挑战？</text>
<line x1="350" y1="220" x2="255" y2="220" stroke="#64748b" stroke-width="2"/>
<line x1="255" y1="220" x2="255" y2="320" stroke="#64748b" stroke-width="2" marker-end="url(#d2a)"/>
<text x="300" y="210" text-anchor="middle" font-size="13.5" font-weight="700" fill="#dc2626">不用</text>
<line x1="650" y1="220" x2="745" y2="220" stroke="#64748b" stroke-width="2"/>
<line x1="745" y1="220" x2="745" y2="320" stroke="#64748b" stroke-width="2" marker-end="url(#d2a)"/>
<text x="700" y="210" text-anchor="middle" font-size="13.5" font-weight="700" fill="#16a34a">要</text>
<rect x="70" y="320" width="370" height="150" rx="12" fill="#eff6ff" stroke="#2563eb" stroke-width="2.4"/>
<text x="90" y="352" font-size="17" font-weight="800" fill="#1d4ed8">用 subagent</text>
<text x="90" y="380" font-size="13.5" fill="#334155">· 聚焦任务，只要结果</text>
<text x="90" y="404" font-size="13.5" fill="#334155">· 跑测试 / 检索文档 / 分析日志</text>
<text x="90" y="428" font-size="13.5" fill="#334155">· 冗长输出留在子上下文，只回摘要</text>
<text x="90" y="452" font-size="13.5" fill="#334155">· 成本相对可控</text>
<rect x="560" y="320" width="370" height="150" rx="12" fill="#fff7ed" stroke="#ea580c" stroke-width="2.4"/>
<text x="580" y="352" font-size="17" font-weight="800" fill="#c2410c">用 agent teams</text>
<text x="580" y="380" font-size="13.5" fill="#334155">· 研究评审 / 竞争假设调试 / 跨层协作</text>
<text x="580" y="404" font-size="13.5" fill="#334155">· teammate 互发消息 + 共享任务板</text>
<text x="580" y="428" font-size="13.5" fill="#334155">· 各占一块，可互相挑战</text>
<text x="580" y="452" font-size="13.5" fill="#334155">· 成本约 7× 单会话（plan mode）</text>
<rect x="70" y="498" width="860" height="42" rx="10" fill="#fef2f2" stroke="#fca5a5" stroke-width="1.8"/>
<text x="500" y="524" text-anchor="middle" font-size="13.5" font-weight="600" fill="#b91c1c">顺序任务 · 要改同一个文件 · 依赖关系多 → 单会话或 subagent 更省更稳</text>
</svg>

需要结果、不需要过程的聚焦任务，用 subagent。比如跑测试、检索文档、分析日志这类会产出大量中间输出的活，交给 subagent，冗长的输出留在它自己的上下文里，只有摘要回到主会话。

需要 worker 之间讨论、互相挑战、自行协调的复杂工作，用 agent teams。官方列的强场景是：研究和评审（多个 teammate 从不同角度同时查，再互相印证），新模块或新功能（各占一块互不踩脚），带竞争假设的调试（每个 teammate 验一种理论、并试图推翻别人的），跨层协作（前端、后端、测试各归一个 teammate）。

反过来，顺序任务、要改同一个文件、依赖关系很多的活，不适合 agent teams。这类情况单会话或 subagent 更省、更稳。团队规模上，官方建议从 3 到 5 个 teammate 起步，每个 teammate 手上留 5 到 6 个任务，规模再大协调开销上升、边际收益递减。

### 当前的边界

agent teams 还是实验特性，有几条硬限制写在文档里：

- 一个 session 只能有一个 team，不能跨 session 共享。
- teammate 不能再 spawn 自己的 teammate，只有 lead 能管团队。
- 主会话一旦是 lead 就一直是 lead，不能把某个 teammate 提成 lead。
- in-process 的 teammate 不支持 session 恢复，`/resume` 和 `/rewind` 之后 lead 可能会去给已经不存在的 teammate 发消息。
