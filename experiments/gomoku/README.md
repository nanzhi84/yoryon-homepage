# 五子棋 AI 对战

纯前端五子棋游戏，AI 在浏览器里用 Minimax + Alpha-Beta 剪枝运行，不需要数据库和后端。

## 技术栈

- React + TypeScript
- Vite
- SVG 棋盘
- Web Worker AI
- Vitest
- GitHub Pages + GitHub Actions

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 部署

在 `yoryon_homepage` 根目录执行构建后，游戏会输出到 `web/dist/gomoku`，随主站一起发布到 `https://yoryon.com/gomoku/`。
