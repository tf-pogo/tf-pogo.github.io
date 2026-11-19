#!/usr/bin/env node
/**
 * 通过 GitHub REST API 提交并推送（不需要 github.com:443 可达，只需要 api.github.com）
 * 用法：
 *   node tools/push-api.mjs --dry                    只看会改什么
 *   GITHUB_TOKEN=ghp_xxx node tools/push-api.mjs      真推
 *   node tools/push-api.mjs ghp_xxx
 *
 * 原理：本地 git 的 blob sha 与 GitHub 的 blob sha 是同一算法，
 * 所以只上传有变化的文件，再用 base_tree 建一棵新树、一次 commit、移动分支指针。
 */
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OWNER = 'tf-pogo'
const REPO = 'tf-pogo.github.io'
const BRANCH = 'main'
const API = 'https://api.github.com'

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const TOKEN = process.env.GITHUB_TOKEN || args.find((a) => !a.startsWith('--')) || ''

async function api (method, url, body) {
  const res = await fetch(url.startsWith('http') ? url : API + url, {
    method,
    headers: Object.assign(
      { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'pogo-push' },
      TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {},
      body ? { 'Content-Type': 'application/json' } : {}
    ),
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
  if (!res.ok) {
    const err = new Error(method + ' ' + url + ' -> ' + res.status + ' ' + (data && data.message ? data.message : text.slice(0, 200)))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/** 本地 git 索引：path -> { mode, sha } */
function localFiles () {
  const out = execSync('git ls-files -s', { cwd: ROOT, encoding: 'utf8' })
  const map = new Map()
  for (const line of out.split('\n')) {
    if (!line.trim()) continue
    const m = line.match(/^(\d{6}) ([0-9a-f]{40}) \d+\t(.+)$/)
    if (m) map.set(m[3], { mode: m[1], sha: m[2] })
  }
  return map
}

const inner = async () => {
  const ref = await api('GET', '/repos/' + OWNER + '/' + REPO + '/git/ref/heads/' + BRANCH)
  const headSha = ref.object.sha
  const headCommit = await api('GET', '/repos/' + OWNER + '/' + REPO + '/git/commits/' + headSha)
  const baseTree = headCommit.tree.sha
  const remoteTree = await api('GET', '/repos/' + OWNER + '/' + REPO + '/git/trees/' + baseTree + '?recursive=1')
  const remote = new Map()
  for (const e of remoteTree.tree) if (e.type === 'blob') remote.set(e.path, { mode: e.mode, sha: e.sha })

  const local = localFiles()

  const added = []
  const changed = []
  const removed = []
  for (const [p, v] of local) {
    if (!remote.has(p)) added.push(p)
    else if (remote.get(p).sha !== v.sha) changed.push(p)
  }
  for (const p of remote.keys()) if (!local.has(p)) removed.push(p)

  console.log('远端 HEAD  ' + headSha.slice(0, 7) + '  树 ' + baseTree.slice(0, 7))
  console.log('本地文件   ' + local.size + '  远端文件 ' + remote.size)
  console.log('新增 ' + added.length + (added.length ? ':\n  ' + added.join('\n  ') : ''))
  console.log('修改 ' + changed.length + (changed.length ? ':\n  ' + changed.join('\n  ') : ''))
  console.log('删除 ' + removed.length + (removed.length ? ':\n  ' + removed.join('\n  ') : ''))

  if (!added.length && !changed.length && !removed.length) {
    console.log('\n✓ 远端已是最新，无需推送。')
    return
  }
  if (DRY) {
    console.log('\n(--dry：以上为将要提交的变更，未上传)')
    return
  }
  if (!TOKEN) {
    console.error('\n缺 token：GITHUB_TOKEN=ghp_xxx node tools/push-api.mjs')
    process.exit(1)
  }

  // 1) 上传有变化的 blob（并发 6）
  const dirty = added.concat(changed)
  const entries = []
  let done = 0
  for (let i = 0; i < dirty.length; i += 6) {
    const chunk = dirty.slice(i, i + 6)
    const blobs = await Promise.all(chunk.map(async (p) => {
      const buf = fs.readFileSync(path.join(ROOT, p))
      if (buf.length > 40 * 1024 * 1024) throw new Error('文件过大: ' + p)
      const b = await api('POST', '/repos/' + OWNER + '/' + REPO + '/git/blobs', {
        content: buf.toString('base64'), encoding: 'base64',
      })
      return { path: p, mode: local.get(p).mode, type: 'blob', sha: b.sha }
    }))
    entries.push(...blobs)
    done += chunk.length
    process.stdout.write('\r上传 ' + done + '/' + dirty.length)
  }
  if (dirty.length) process.stdout.write('\n')

  // 2) 删除：GitHub 支持在 tree 里把 sha 设为 null
  for (const p of removed) entries.push({ path: p, mode: '100644', type: 'blob', sha: null })

  // 3) 建树
  const tree = await api('POST', '/repos/' + OWNER + '/' + REPO + '/git/trees', { base_tree: baseTree, tree: entries })
  console.log('新树 ' + tree.sha.slice(0, 7))

  // 4) 提交
  const msg = '重构：修 404 / 图标 CDN / 图片体积，加静态化与 SEO\n\n' +
    '- 404 用绝对路径，深路径不再掉样式\n' +
    '- remixicon CDN -> 内联 SVG sprite（13 个图标，0 外链）\n' +
    '- 头像 256KB PNG -> 4.3KB webp；favicon 独立\n' +
    '- 首页列表/归档/标签/sitemap/atom 由 tools/build.mjs 生成\n' +
    '- 补 canonical/OG/Twitter/JSON-LD；无障碍与深色模式修正'
  const commit = await api('POST', '/repos/' + OWNER + '/' + REPO + '/git/commits', {
    message: msg, tree: tree.sha, parents: [headSha],
  })
  console.log('新提交 ' + commit.sha.slice(0, 7))

  // 5) 移动分支
  await api('PATCH', '/repos/' + OWNER + '/' + REPO + '/git/refs/heads/' + BRANCH, { sha: commit.sha, force: false })
  console.log('✓ 已推送到 ' + OWNER + '/' + REPO + ' ' + BRANCH)
  console.log('  https://github.com/' + OWNER + '/' + REPO + '/commit/' + commit.sha)
  console.log('  GitHub Pages 一般 1~2 分钟内生效：https://pogo.gay/')
}

inner().catch((e) => {
  console.error('\n✗ ' + e.message)
  if (e.status === 401) console.error('  token 无效或已过期')
  if (e.status === 403) console.error('  权限不足：token 需要 repo 的 Contents: Read and write')
  if (e.status === 404) console.error('  token 无权访问该仓库（或仓库名不对）')
  process.exit(1)
})
