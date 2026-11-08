#!/usr/bin/env node
/**
 * Optional dog SFX generator via ElevenLabs Sound Effects API.
 * If the API is unavailable or unconfigured, keep Mixkit-licensed files
 * already in public/audio/dog/ (see public/audio/dog/LICENSE.txt).
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... node scripts/generate-dog-sfx.mjs
 *   node scripts/generate-dog-sfx.mjs --force
 *
 * Env:
 *   ELEVENLABS_API_KEY (required for generation)
 */

import { mkdir, writeFile, access, readFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'dog')
const API_URL = 'https://api.elevenlabs.io/v1/sound-generation'

const CLIPS = [
  {
    file: 'bark-short.mp3',
    prompt: 'Short sharp dog bark, German shepherd, outdoor chase, realistic, no music',
    duration: 0.6,
  },
  {
    file: 'bark-angry.mp3',
    prompt: 'Angry aggressive dog bark, German shepherd, close, realistic, no music',
    duration: 0.9,
  },
  {
    file: 'bark-close.mp3',
    prompt: 'Very close intense dog bark and snarl, German shepherd, realistic, no music',
    duration: 0.8,
  },
  {
    file: 'dog-running.mp3',
    prompt: 'Dog paws running on asphalt, panting, light collar jingle, loopable, no bark, no music',
    duration: 1.5,
  },
]

function parseArgs(argv) {
  return { force: argv.includes('--force') || argv.includes('-f') }
}

async function loadDotEnv() {
  try {
    const text = await readFile(path.join(ROOT, '.env'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 0) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    /* no .env */
  }
}

async function exists(file) {
  try {
    await access(file, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

function isMp3Buffer(buf) {
  if (!buf || buf.length < 4) return false
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true
  return false
}

async function generateSfx(apiKey, clip) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: clip.prompt,
      duration_seconds: clip.duration,
      prompt_influence: 0.35,
    }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.detail?.message || JSON.stringify(j?.detail || j)
    } catch {
      detail = await res.text().catch(() => '')
    }
    const err = new Error(detail || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (!isMp3Buffer(buf) || buf.length < 400) {
    throw new Error('Invalid audio response for ' + clip.file)
  }
  return buf
}

async function main() {
  await loadDotEnv()
  const { force } = parseArgs(process.argv)
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  if (!apiKey) {
    console.error(`
ERROR: Missing ELEVENLABS_API_KEY for sound-effects generation.

Licensed Mixkit dog MP3s are already in public/audio/dog/.
This script is optional — only needed if you want AI-generated replacements.
`)
    process.exit(1)
  }

  await mkdir(OUT_DIR, { recursive: true })
  let generated = 0
  let skipped = 0

  for (const clip of CLIPS) {
    const outPath = path.join(OUT_DIR, clip.file)
    if (!force && (await exists(outPath))) {
      console.log(`skip  ${clip.file}`)
      skipped += 1
      continue
    }
    process.stdout.write(`gen   ${clip.file} … `)
    try {
      const buf = await generateSfx(apiKey, clip)
      await writeFile(outPath, buf)
      console.log(`${buf.length} bytes`)
      generated += 1
    } catch (e) {
      console.log('FAILED')
      console.error(e.message)
      console.error(
        '\nKeeping existing Mixkit files if present. Sound Effects API may require a paid plan.',
      )
      process.exit(1)
    }
  }

  console.log(`\nDone. generated=${generated} skipped=${skipped}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
