# 城市天气（Vite + React）

预报与兜底地理编码用 [Open-Meteo](https://open-meteo.com/)（**预报无需 Key**）。城市搜索可配合内置国内坐标与可选的 **高德 Web 服务 Key**（见下）。

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

## 行为说明

- 进入页面会 **自动定位** 并拉取天气；地点行使用 [BigDataCloud 客户端逆地理](https://api.bigdatacloud.net/)（`localityLanguage=zh`），结果经 **繁体→简体** 展示为 **市-区**；与天气 API **并行** 请求，失败则回退为经纬度。
- 城市搜索单选/单结果后也会 **再逆地理** 成市-区（与搜索地名可对照）。
- 可选 `VITE_AMAP_KEY` 仅用于 **高德输入提示**（城市联想）。
- **气温曲线** 为近约 48 小时，带下方 **Brush 拖动** 选时间窗，悬停/点击圆点看温度与天气（Recharts，懒加载分包）。

页脚含 **wuyouxiu开发** 署名。

若用其它静态托管，按需设置 `GITHUB_PAGES_BASE`；本地 `npm run build` 时默认 `base: '/'`。
