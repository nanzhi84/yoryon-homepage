---
title: 手写数字串识别网页
summary: 纯静态前端上传手写数字照片，在浏览器内用 ONNX Runtime Web 运行 CRNN/CTC 模型识别数字串。
role: 模型训练与前端实现
period: "2026.05"
type: 个人模型应用
platform: Web · yoryon.com/digit-ocr
stack: PyTorch / ONNX Runtime Web / React / Vite
order: 4
tags:
  - 视觉模型
  - 浏览器推理
  - PyTorch
  - 静态网页
---

## 在线体验

[打开手写数字串识别 Demo](/digit-ocr/)

这个 Demo 不接数据库、不接后端。用户上传照片后，前端会在浏览器里完成裁剪、灰度化、笔迹增强、模型推理和 CTC 解码。

## 技术路线

- 使用 MNIST 与 NIST EMNIST Digits 构造多位数字串训练样本。
- PyTorch 训练轻量 CRNN/CTC 模型，支持 `20260521` 这类 8 位数字串。
- 导出 ONNX 后挂在静态站点中，由 ONNX Runtime Web 在浏览器端直接推理。
