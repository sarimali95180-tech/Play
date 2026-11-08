/**
 * Repeatable Phase-13 performance / sim integrity checks (no invented FPS).
 * Run: node scripts/perf-checks.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

function walk(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name)
    if (name.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function kb(n) {
  return `${(n / 1024).toFixed(1)} KB`
}

console.log('=== NEON RUSH Phase 13 — asset & code checks ===\n')

const publicFiles = walk(join(root, 'public'))
  .map((p) => ({ path: p.replace(root, ''), size: statSync(p).size }))
  .sort((a, b) => b.size - a.size)

console.log('Largest public assets:')
for (const f of publicFiles.slice(0, 12)) {
  console.log(`  ${kb(f.size).padStart(10)}  ${f.path}`)
}

const glbs = publicFiles.filter((f) => f.path.endsWith('.glb'))
const remotes = []
for (const file of ['src/game/ShepherdDog.jsx', 'src/game/dialogue.js', 'src/game/audio.js']) {
  const text = readFileSync(join(root, file), 'utf8')
  const hits = text.match(/https?:\/\/[^\s'"`]+/g) || []
  for (const h of hits) {
    if (!h.includes('127.0.0.1') && !h.includes('localhost')) remotes.push(`${file}: ${h}`)
  }
}

console.log(`\nGLB count: ${glbs.length} (characters are procedural; dog is GLB)`)
console.log(`Remote asset URLs in gameplay loaders: ${remotes.length ? remotes.join(', ') : 'none'}`)

const mustExist = [
  'src/game/perf.js',
  'src/ui/PerfOverlay.jsx',
  'src/game/Scene.jsx',
  'src/game/Traffic.jsx',
]
for (const f of mustExist) {
  assert.ok(statSync(join(root, f)).size > 0, `missing ${f}`)
}

const scene = readFileSync(join(root, 'src/game/Scene.jsx'), 'utf8')
assert.match(scene, /FIXED/, 'fixed-step simulator missing')
assert.match(scene, /PerfOverlayBridge/, 'dev perf bridge missing')

const traffic = readFileSync(join(root, 'src/game/Traffic.jsx'), 'utf8')
assert.match(traffic, /Mount only the active kind/, 'vehicle mesh explosion fix missing')
assert.doesNotMatch(
  traffic,
  /\['car', 'taxi', 'bus', 'truck', 'police'\]\.map/,
  'still mounting all 5 vehicle variants per slot',
)

const input = readFileSync(join(root, 'src/game/useInput.js'), 'utf8')
assert.match(input, /applySwipe/, 'early swipe fire missing')

const world = readFileSync(join(root, 'src/game/world.js'), 'utf8')
assert.match(world, /Throttle HUD/, 'catching HUD throttle missing')

console.log('\nStructural checks: OK')
console.log('Note: FPS before/after requires a real phone — not invented here.')
console.log('Phone test: open Network URL, Settings → Graphics Auto/Low, watch DEV FPS overlay locally.')
