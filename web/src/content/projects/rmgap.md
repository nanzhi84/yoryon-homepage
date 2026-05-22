---
title: RMGAP 奖励模型偏好泛化评测基准
summary: 系统衡量奖励模型能否识别不同用户对同一任务的偏好差异，覆盖 Chat、Writing、Reasoning、Safety 四类场景。
role: 第一作者 · 评测设计与数据生产
period: 2025.09 - 2025.12
type: 研究项目（arXiv:2605.01831）
platform: 论文 · 开源数据与代码
stack: SGLang / PyTorch / 多模型评测
order: 2
tags:
  - RLHF
  - 奖励模型
  - 偏好对齐
  - 模型评测
  - 数据集
---

## 问题出发点

RLHF 在产品落地里默认了一个常被忽略的前提：**"用户偏好是统一的"**。但真实产品里，不同用户对同一任务往往有不同偏好。RMGAP 想回答的问题是：

> 当前主流奖励模型，能否识别同一任务下用户之间的偏好差异？

## 数据与评测设计

围绕 Chat、Writing、Reasoning、Safety 四类场景，构建一份偏好泛化评测集：

- **规模**：1,097 条评测实例、4,388 条风格化回复、13,164 条提示。
- **风格空间**：五维语言风格空间，用作偏好差异的可控变量。
- **数据生产**：7 个前沿 LLM 生成候选回复，多阶段流水线产出。
- **质量控制**：双评审 + 仲裁机制，控制偏好标签一致性。

## 评测结论

对 24 个主流奖励模型进行系统评测，提出三类指标：

- **Pairwise accuracy**
- **Best-of-N accuracy**
- **Ranking Consistency**

最优模型的 Best-of-N 准确率仅为 **49.27%**，说明现有奖励模型在「个性化偏好泛化」上仍有明显短板。代码与数据已开源：[nanzhi84/RMGAP](https://github.com/nanzhi84/RMGAP)。
