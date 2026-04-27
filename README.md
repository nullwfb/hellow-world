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

## 打不开的排查

- **项目站地址** 一定是：`https://<你的用户名>.github.io/<仓库名>/`，本仓库名中间是 **ow**：`hellow-world`（不要写成 `hello-world`）。
- 若页面标题或文案像 **知乎**「**你来到了没有知识的荒原**」——那是 **误打开了 zhihu.com 或其它站点**，不是本应用；请核对浏览器地址栏是否为 `github.io` 开头。
- 等 **Settings → Pages** 保存后，部署可能要 **1～2 分钟** 再刷新；可先看仓库 **Actions** 是否已绿。

若用其它静态托管，按需设置 `GITHUB_PAGES_BASE`（Vite 的 `base`）；本地 `npm run build` 时默认 `base: '/'`。
