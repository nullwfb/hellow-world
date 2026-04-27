import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// GitHub Pages 在部分访问路径会走 404.html；与 index 相同才能加载 SPA
const here = dirname(fileURLToPath(import.meta.url))
const dist = join(here, '..', 'dist')
await mkdir(dist, { recursive: true })
await copyFile(join(dist, 'index.html'), join(dist, '404.html'))
