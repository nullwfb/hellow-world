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

1. 将仓库推送到 GitHub 后，在 **Settings → Pages** 中把 **Build and deployment** 设为 **GitHub Actions**（首次需授权 Pages）。
2. 推送到 `main` 分支会触发 `.github/workflows/deploy.yml`，用环境变量 `GITHUB_PAGES_BASE=/<仓库名>/` 构建，产物部署到项目站。

若用其它静态托管，按需设置 `GITHUB_PAGES_BASE`（Vite 的 `base`），或本地直接 `npm run build`（默认 `base: '/'`）。
