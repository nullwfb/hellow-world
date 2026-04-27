# 城市天气（Vite + React）

使用 [Open-Meteo](https://open-meteo.com/) 的地理编码与预报接口，**无需 API Key**。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub Pages

工作流会把 `dist` 推送到分支 **`gh-pages`**（使用 [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)）。

1. 合并/推送到 `main` 后等待 CI 成功。
2. 打开 **Settings → Pages** → **Build and deployment**：**Source** 选 **Deploy from a branch**（不要选仅 GitHub Actions 那一项，否则易与“未启用”冲突）。
3. **Branch** 选 `gh-pages`，目录选 **`/ (root)`** → Save。

若用其它静态托管，按需设置 `GITHUB_PAGES_BASE`（Vite 的 `base`）；本地 `npm run build` 时默认 `base: '/'`。
