#!/usr/bin/env node
/**
 * Verifies police/dog MP3 presence and that they look like real MPEG audio.
 * Does not claim playback works in a browser — use the DEV AUDIO panel for that.
 */
import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const POLICE = [
  'start.mp3',
  'chase.mp3',
  'near-miss.mp3',
  'close-chase.mp3',
  'jetpack.mp3',
  'arrest.mp3',
  'extra-duty.mp3',
  'extra-breath.mp3',
]
const DOG = ['bark-short.mp3', 'bark-angry.mp3', 'bark-close.mp3', 'dog-running.mp3']

function isMp3(buf) {
  if (!buf || buf.length < 800) return false
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true
  return false
}

async function check(dir, files) {
  const out = []
  for (const f of files) {
    const p = path.join(dir, f)
    try {
      await access(p)
      const buf = await readFile(p)
      const ok = isMp3(buf)
      out.push({ file: f, exists: true, bytes: buf.length, validMp3: ok })
    } catch {
      out.push({ file: f, exists: false, bytes: 0, validMp3: false })
    }
  }
  return out
}

async function scanBundleForSecrets() {
  const dist = path.join(ROOT, 'dist')
  try {
    const files = await readdir(dist, { recursive: true })
    const hits = []
    for (const f of files) {
      if (!/\.(js|mjs|css|html|map)$/.test(f)) continue
      const text = await readFile(path.join(dist, f), 'utf8')
      if (/ELEVENLABS_API_KEY\s*=\s*['"][^'"]+['"]/.test(text)) hits.push(f)
      if (/xi-api-key['"]\s*:\s*['"][^'"]+['"]/.test(text)) hits.push(f)
      // Real-looking sk_ keys
      if (/sk_[a-zA-Z0-9]{20,}/.test(text)) hits.push(f)
    }
    return hits
  } catch {
    return null // no dist yet
  }
}

const police = await check(path.join(ROOT, 'public/audio/police'), POLICE)
const dog = await check(path.join(ROOT, 'public/audio/dog'), DOG)

console.log('=== Police voices ===')
for (const r of police) {
  console.log(
    `${r.exists && r.validMp3 ? 'OK  ' : 'MISS'} ${r.file} ${r.exists ? `(${r.bytes} bytes)` : ''}`,
  )
}
console.log('\n=== Dog SFX ===')
for (const r of dog) {
  console.log(
    `${r.exists && r.validMp3 ? 'OK  ' : 'MISS'} ${r.file} ${r.exists ? `(${r.bytes} bytes)` : ''}`,
  )
}

const secrets = await scanBundleForSecrets()
if (secrets === null) {
  console.log('\n(dist/ not built — skip secret scan)')
} else if (secrets.length) {
  console.log('\nWARNING: possible API key material in dist:', secrets)
} else {
  console.log('\nOK — no ElevenLabs API key patterns found in dist/')
}

const policeOk = police.filter((r) => r.exists && r.validMp3).length
const dogOk = dog.filter((r) => r.exists && r.validMp3).length
console.log(`\nSummary: police ${policeOk}/${POLICE.length}, dog ${dogOk}/${DOG.length}`)

if (dogOk < DOG.length) process.exitCode = 1
if (policeOk === 0) {
  console.log(
    '\nNo police MP3s yet. Set ELEVENLABS_API_KEY + ELEVENLABS_VOICE_ID in .env, then:\n  npm run generate:voices\nOr drop manual recordings into public/audio/police/.',
  )
  process.exitCode = 1
}
