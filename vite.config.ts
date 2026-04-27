import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 项目站需设置，例如 GITHUB_PAGES_BASE=/repo-name/（Vite 要求以 / 结尾）
const base = process.env.GITHUB_PAGES_BASE || '/'
const normalizedBase =
  base === '/' || base.endsWith('/') ? base : `${base}/`

export default defineConfig({
  plugins: [react()],
  base: normalizedBase,
})
