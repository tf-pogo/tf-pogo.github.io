#!/usr/bin/env node
/**
 * pogo.gay 构建脚本（零依赖，node tools/build.mjs）
 *
 * 1) 全站 <head> 注入：canonical / OG / twitter / theme-color / 防闪 / JSON-LD
 * 2) remixicon 图标字体 -> 内联 SVG sprite（不依赖 CDN）
 * 3) 从 post/<slug>/index.html 的 pogo:* meta 生成首页列表、archives、tags、sitemap、atom
 *
 * 新文章模板（放在 post/<slug>/index.html 的 <head> 里）：
 *   <meta name="pogo:kind" content="post">
 *   <meta name="pogo:date" content="2026-06-08">
 *   <meta name="pogo:tags" content="成绩复盘,高考冲刺">
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://pogo.gay'
const SITE_NAME = 'Pogo个人主页'
const AUTHOR = 'Pogo'
const OG_IMAGE = SITE + '/images/og-cover-1200x630.webp'
const SAME_AS = [
  'https://space.bilibili.com/502798845',
  'https://www.youtube.com/channel/UCNw0HE2nqO0UhuviqCkYinQ',
  'https://t.me/19164173149',
  'https://github.com/tf-pogo',
  'https://x.com/pity45087346'
]
const SPRITE = path.join(ROOT, 'assets', 'sprite.svg')
const TPL = path.join(ROOT, 'tools', 'templates')
const SKIP_SLUGS = ['about']

const read = (p) => fs.readFileSync(p, 'utf8')
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const stripTags = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
// 注意：键名可含数字（H1/TAGS2），漏掉 0-9 会让 {{H1}} 原样留在页面上
const render = (tpl, vars) => tpl.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
const tpl = (name) => read(path.join(TPL, name))
const sprite = fs.existsSync(SPRITE) ? read(SPRITE).trim() : ''

/* ---------- 文章元数据 ---------- */
function collect () {
  const dir = path.join(ROOT, 'post')
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter((name) => fs.existsSync(path.join(dir, name, 'index.html')))
    .filter((name) => SKIP_SLUGS.indexOf(name) === -1)
    .map((name) => {
      const file = path.join(dir, name, 'index.html')
      const html = read(file)
      if (/name="pogo:kind"\s+content="page"/.test(html)) return null
      const titleRaw = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || name
      const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || titleRaw
      const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''
      const dateMeta = (html.match(/<meta name="pogo:date" content="([^"]*)"/) || [])[1]
      const date = dateMeta || (html.match(/(20\d{2}-\d{2}-\d{2})/) || [])[1] || '2026-01-01'
      const tags = ((html.match(/<meta name="pogo:tags" content="([^"]*)"/) || [])[1] || '')
        .split(',').map((t) => t.trim()).filter(Boolean)
      return {
        slug: name, file: file,
        path: '/post/' + name + '/',
        url: SITE + '/post/' + name + '/',
        title: stripTags(titleRaw).replace(/\s*-\s*Pogo个人主页$/, ''),
        heading: stripTags(h1), desc: desc, date: date, tags: tags,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/* ---------- head 注入 ---------- */
function headHtml (page, isPost) {
  const jsonld = isPost
    ? { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: page.title,
        description: page.desc, datePublished: page.date, dateModified: page.date,
        url: page.url, mainEntityOfPage: page.url, inLanguage: 'zh-CN', image: OG_IMAGE,
        author: { '@type': 'Person', name: AUTHOR, url: SITE + '/' },
        publisher: { '@type': 'Person', name: AUTHOR },
        keywords: (page.tags || []).join(',') }
    : { '@context': 'https://schema.org', '@graph': [
        { '@type': 'WebSite', '@id': SITE + '/#website', name: SITE_NAME, url: SITE + '/',
          inLanguage: 'zh-CN', image: OG_IMAGE, description: page.desc },
        { '@type': 'Person', '@id': SITE + '/#person', name: AUTHOR, url: SITE + '/',
          image: SITE + '/images/icon-512.webp', sameAs: SAME_AS }
      ] }
  return render(tpl('head.html'), {
    CANONICAL: page.url,
    SITE_NAME: SITE_NAME,
    SITE: SITE,
    OGTYPE: isPost ? 'article' : 'website',
    TITLE: esc(page.title),
    DESC: esc(page.desc),
    OG_IMAGE: OG_IMAGE,
    OG_ALT: esc(isPost ? page.title : SITE_NAME),
    JSONLD: JSON.stringify(jsonld),
  })
}

/* ---------- 单页处理 ---------- */
const ICON_RE = /<i class="(ri-[a-z0-9-]+)"([^>]*)><\/i>/g
function upgradePage (file, page, isPost) {
  let html = read(file)
  html = html.replace(/<!--build:head-->[\s\S]*?<!--\/build:head-->\s*/, '')
  html = html.replace(/[ \t]*<link[^>]*remixicon[^>]*>\s*\n?/g, '')
  html = html.replace(/[ \t]*<link[^>]*rel="shortcut icon"[^>]*>\s*\n?/g, '')
  html = html.replace(ICON_RE, (m, cls) =>
    '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-' + cls.slice(3) + '"></use></svg>')
  html = html.replace(/https?:\/\/tf-pogo\.github\.io\/images\/avatar\.png[^"']*/g, '/images/avatar-256.webp')
  html = html.replace(/src="(?:\.\.\/)*images\/avatar\.png[^"]*"/g, 'src="/images/avatar-256.webp" width="256" height="256"')
  html = html.replace(/target="_blank"(?!\s+rel=)/g, 'target="_blank" rel="noopener noreferrer"')
  html = html.replace('</head>', headHtml(page, isPost) + '\n</head>')
  if (sprite) {
    // 先移除上一次注入的 sprite，保证重复构建不会叠加
    html = html.replace(/<!--build:sprite-->[\s\S]*?<!--\/build:sprite-->\s*/, '')
    html = html.replace(/<body([^>]*)>\s*/,
      (m, attrs) => '<body' + attrs + '>\n<!--build:sprite-->\n' + sprite + '\n<!--/build:sprite-->\n')
  }
  write(file, html)
}

/* ---------- 生成物 ---------- */
const card = (p) => render(tpl('card.html'), {
  PATH: p.path, HEADING: esc(p.heading), DATE: p.date,
  TAGS: p.tags.map(esc).join(' · ') || '未分类',
})

function genArchives (posts) {
  const years = []
  const seen = {}
  posts.forEach((p) => { const y = p.date.slice(0, 4); if (!seen[y]) { seen[y] = 1; years.push(y) } })
  const body = years.map((y) => {
    const list = posts.filter((p) => p.date.slice(0, 4) === y).map(card).join('\n\n')
    return '            <h2 class="year-title">' + y + '</h2>\n\n' + list
  }).join('\n\n')
  return render(tpl('layout.html'), {
    TITLE: '文章归档', DESC: 'Pogo 的文章归档 — 所有足迹都在这里',
    CLASS: 'archive-container', H1: '文章归档', SUB: '这里记录了我的所有足迹 👣',
    SPRITE: sprite, BODY: '        <div class="post-container">\n\n' + body + '\n\n        </div>',
  })
}

function genTags (posts) {
  const map = new Map()
  posts.forEach((p) => p.tags.forEach((t) => { if (!map.has(t)) map.set(t, []); map.get(t).push(p) }))
  const blocks = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length).map((kv) => {
    const tag = kv[0]; const list = kv[1]
    return '        <section class="tag-section">\n' +
      '            <h3><svg class="ico" aria-hidden="true" focusable="false"><use href="#i-price-tag-3-line"></use></svg> ' +
      esc(tag) + ' <span class="count">' + list.length + '</span></h3>\n' +
      '            <div class="post-container">\n' + list.map(card).join('\n') + '\n            </div>\n' +
      '        </section>'
  }).join('\n\n')
  return render(tpl('layout.html'), {
    TITLE: '标签', DESC: 'Pogo 的标签云 — 按标签浏览文章',
    CLASS: 'tags-container', H1: '标签', SUB: '按标签浏览感兴趣的内容 🏷️',
    SPRITE: sprite, BODY: blocks || '        <p>还没有标签。</p>',
  })
}

function genSitemap (pages) {
  const urls = pages.map((p) =>
    '  <url>\n    <loc>' + p.url + '</loc>\n    <lastmod>' + p.date + '</lastmod>\n' +
    '    <changefreq>' + (p.path === '/' ? 'daily' : 'monthly') + '</changefreq>\n' +
    '    <priority>' + (p.path === '/' ? '1.0' : '0.7') + '</priority>\n  </url>').join('\n')
  return render(tpl('sitemap.xml'), { URLS: urls })
}

function genAtom (posts) {
  const updated = posts[0] ? posts[0].date + 'T00:00:00+08:00' : '2026-01-01T00:00:00+08:00'
  const entries = posts.map((p) => render(tpl('atom-entry.xml'), {
    HEADING: p.heading, URL: p.url, DATE: p.date, SITE: SITE, DESC: p.desc,
    CATEGORIES: p.tags.map((t) => '    <category term="' + esc(t) + '"/>').join('\n'),
  })).join('')
  return render(tpl('atom.xml'), { SITE: SITE, SITE_NAME: SITE_NAME, UPDATED: updated, ENTRIES: entries })
}

/* ---------- 主流程 ---------- */
const posts = collect()
if (!posts.length) { console.error('没有找到 post/*/index.html'); process.exit(1) }

const home = { path: '/', url: SITE + '/', title: SITE_NAME,
  desc: '破狗 Pogo 的个人主页 —— 高考复盘、折腾记录与日常。', date: posts[0].date,
  file: path.join(ROOT, 'index.html') }
const archives = { path: '/archives/', url: SITE + '/archives/', title: '文章归档',
  desc: 'Pogo 的文章归档 — 所有足迹都在这里', date: posts[0].date,
  file: path.join(ROOT, 'archives', 'index.html') }
const tagsPage = { path: '/tags/', url: SITE + '/tags/', title: '标签',
  desc: 'Pogo 的标签云 — 按标签浏览文章', date: posts[0].date,
  file: path.join(ROOT, 'tags', 'index.html') }

const about = { path: '/post/about/', url: SITE + '/post/about/', title: '关于我',
  desc: '关于破狗 Pogo —— 一个刚高考完、爱折腾的中学生。', date: posts[0].date,
  file: path.join(ROOT, 'post', 'about', 'index.html') }

const postPages = posts.map((p) => ({
  path: p.path, url: p.url, title: p.title, desc: p.desc, date: p.date, file: p.file,
}))

upgradePage(home.file, home, false)
posts.forEach((p) => upgradePage(p.file, p, true))
if (fs.existsSync(about.file)) upgradePage(about.file, about, false)

write(archives.file, genArchives(posts))
write(tagsPage.file, genTags(posts))
upgradePage(archives.file, archives, false)
upgradePage(tagsPage.file, tagsPage, false)

let homeHtml = read(home.file)
if (homeHtml.indexOf('<!--posts:start-->') !== -1) {
  homeHtml = homeHtml.replace(/<!--posts:start-->[\s\S]*?<!--posts:end-->/,
    '<!--posts:start-->\n' + posts.map(card).join('\n\n') + '\n<!--posts:end-->')
  write(home.file, homeHtml)
}

write(path.join(ROOT, 'sitemap.xml'), genSitemap([home].concat(postPages, [archives, tagsPage, about])))
write(path.join(ROOT, 'atom.xml'), genAtom(posts))
write(path.join(ROOT, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n')
write(path.join(ROOT, 'site.webmanifest'), JSON.stringify({
  name: SITE_NAME, short_name: 'Pogo', start_url: '/', display: 'standalone',
  background_color: '#e8f0fe', theme_color: '#007AFF', lang: 'zh-CN',
  icons: [
    { src: '/images/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/images/icon-512.webp', sizes: '512x512', type: 'image/webp' },
  ],
}, null, 2) + '\n')
write(path.join(ROOT, 'scripts', 'posts.js'), 'window.articleList = ' + JSON.stringify(
  posts.map((p) => ({ title: p.heading, date: p.date, desc: p.desc, link: p.path, tags: p.tags })), null, 2) + '\n')

console.log('✓ 处理页面 ' + (postPages.length + 3) + ' 个，文章 ' + posts.length + ' 篇')
console.log('✓ 生成 archives / tags / sitemap.xml / atom.xml / robots.txt / site.webmanifest / scripts/posts.js')
