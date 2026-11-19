#!/usr/bin/env node
/**
 * 发布前自检：node tools/check.mjs
 * 零依赖。检查 SEO 元信息、绝对路径、外链 rel、图片 alt、站内死链。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://pogo.gay'

function walk (dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'tools' || e.name === 'node_modules') continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const files = walk(ROOT)
const htmlFiles = files.filter((f) => f.endsWith('.html'))
const exists = new Set(files.map((f) => '/' + path.relative(ROOT, f).split(path.sep).join('/')))

const problems = []
const add = (file, msg) => problems.push(path.relative(ROOT, file) + ': ' + msg)

/** 把站内 URL 映射到磁盘路径，返回 null 表示外链 */
function toFile (url) {
  if (!url || /^(https?:|mailto:|tel:|javascript:|#|data:)/.test(url)) return null
  const clean = url.split('#')[0].split('?')[0]
  if (!clean) return null
  let p = clean
  if (!p.startsWith('/')) p = '/' + p
  p = path.posix.normalize(p)
  if (p.startsWith('/..')) return p
  const candidates = [p]
  if (p.endsWith('/')) candidates.push(p + 'index.html')
  if (!path.extname(p)) candidates.push(p + '/index.html', p + '.html')
  for (const c of candidates) if (exists.has(c)) return c
  return p
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8')
  const is404 = path.basename(file) === '404.html'
  const where = path.relative(ROOT, file)

  // 1. 基本元信息
  if (!is404) {
    if (!/<title>[^<]{2,}<\/title>/.test(html)) add(file, '缺 <title>')
    if (!/<meta name="description" content="[^"]{10,}"/.test(html)) add(file, '缺 meta description')
    if (!/<link rel="canonical" href="https:\/\/pogo\.gay/.test(html)) add(file, '缺 canonical 或域名不对')
    if (!/property="og:title"/.test(html)) add(file, '缺 og:title')
    if (!/name="twitter:card"/.test(html)) add(file, '缺 twitter:card')
    if (!/application\/ld\+json/.test(html)) add(file, '缺 JSON-LD')
  }

  // 2. 绝对路径（404 页也必须绝对，否则深路径加载不到样式）
  const relAsset = html.match(/["']\.\.?\/[^"']*\.(css|js|png|webp|svg|ico)["']/g)
  if (relAsset) add(file, '相对资源路径: ' + relAsset.join(' '))

  // 2.5 模板占位符残留（render 没替换干净的痕迹）
  const leftover = html.match(/\{\{[A-Z0-9_]+\}\}/g)
  if (leftover) add(file, '模板占位符未替换: ' + leftover.join(' '))

  // 3. 旧域名 / 旧主题类名残留
  if (html.includes('tf-pogo.github.io')) add(file, '残留 tf-pogo.github.io')
  if (/<i class="ri-/.test(html)) add(file, '残留 remixicon <i>')
  if (/remixicon/.test(html)) add(file, '残留 remixicon 引用')

  // 4. 外链 rel
  const blanks = html.match(/<a[^>]*target="_blank"[^>]*>/g) || []
  for (const a of blanks) if (!/rel="[^"]*noopener/.test(a)) add(file, '外链缺 rel=noopener: ' + a.slice(0, 70))

  // 5. 图片
  const imgs = html.match(/<img[^>]*>/g) || []
  for (const img of imgs) {
    if (!/\salt="[^"]*"/.test(img)) add(file, 'img 缺 alt: ' + img.slice(0, 60))
    if (!/\swidth="\d+"/.test(img) || !/\sheight="\d+"/.test(img)) add(file, 'img 缺 width/height: ' + img.slice(0, 60))
  }

  // 6. 站内死链
  const hrefs = [...html.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1])
  for (const h of hrefs) {
    const f = toFile(h)
    if (f && !exists.has(f)) add(file, '死链: ' + h)
  }
  const srcs = [...html.matchAll(/\ssrc="([^"]+)"/g)].map((m) => m[1])
  for (const s of srcs) {
    const f = toFile(s)
    if (f && !exists.has(f)) add(file, '缺资源: ' + s)
  }

  // 7. 结构
  const h1 = (html.match(/<h1[\s>]/g) || []).length
  if (h1 !== 1) add(file, 'h1 数量 = ' + h1 + '（应为 1）')
  if (!/<html lang="zh-CN">/.test(html)) add(file, '缺少/错误的 html lang')
}

// 8. 站点级文件
for (const need of ['/robots.txt', '/sitemap.xml', '/atom.xml', '/site.webmanifest', '/CNAME']) {
  if (!exists.has(need)) problems.push('缺站点文件 ' + need)
}
if (!fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8').includes(SITE + '/sitemap.xml')) {
  problems.push('robots.txt 未指向 sitemap')
}

if (problems.length) {
  console.log('✗ 发现 ' + problems.length + ' 个问题：')
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
} else {
  console.log('✓ 自检通过：' + htmlFiles.length + ' 个 HTML 页面，无死链、无相对路径、元信息完整。')
}
