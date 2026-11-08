#!/usr/bin/env node
/**
 * Offline ElevenLabs TTS generator for Neon Rush police dialogue.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node scripts/generate-police-voices.mjs
 *   node scripts/generate-police-voices.mjs --force          # regenerate existing
 *   node scripts/generate-police-voices.mjs --test           # pronounce one line, then exit
 *   node scripts/generate-police-voices.mjs --roman          # prefer Roman Urdu TTS text
 *   node scripts/generate-police-voices.mjs --model=eleven_multilingual_v2
 *
 * Env:
 *   ELEVENLABS_API_KEY   (required) — never commit this
 *   ELEVENLABS_VOICE_ID  (required) — male Urdu-capable voice
 *   ELEVENLABS_MODEL_ID  (optional) — default tries eleven_v4, then multilingual v2
 *
 * Output: public/audio/police/*.mp3
 */

import { mkdir, writeFile, access, readFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'police')
const MANIFEST = path.join(OUT_DIR, 'manifest.json')

const API_BASE = 'https://api.elevenlabs.io/v1'

/** Subtitle (Nastaliq) + TTS text. Roman used when --roman or model struggles with script. */
export const POLICE_VOICE_LINES = [
  {
    id: 'start',
    file: 'start.mp3',
    subtitle: 'اوئے رک جا! کہاں بھاگ رہا ہے؟',
    tts: 'اوئے رک جا! کہاں بھاگ رہا ہے؟',
    ttsRoman: 'Oye ruk ja! Kahan bhaag raha hai?',
    style: 'urgent shout while running, funny Pakistani police officer',
  },
  {
    id: 'chase',
    file: 'chase.mp3',
    subtitle: 'تجھے قانون کی قسم، رک جا!',
    tts: 'تجھے قانون کی قسم، رک جا!',
    ttsRoman: 'Tujhe kanoon ki qasam, ruk ja!',
    style: 'breathless chase warning, dramatic but comedic',
  },
  {
    id: 'near-miss',
    file: 'near-miss.mp3',
    subtitle: 'اوئے ہوئے! بچ گیا تُو!',
    tts: 'اوئے ہوئے! بچ گیا تُو!',
    ttsRoman: 'Oye hoye! Bach gaya tu!',
    style: 'surprised near-miss reaction',
  },
  {
    id: 'close-chase',
    file: 'close-chase.mp3',
    subtitle: 'بس بیٹا، اب پکڑا گیا!',
    tts: 'بس بیٹا، اب پکڑا گیا!',
    ttsRoman: 'Bas beta, ab pakra gaya!',
    style: 'confident close chase taunt, slightly breathless',
  },
  {
    id: 'jetpack',
    file: 'jetpack.mp3',
    subtitle: 'اوئے! یہ اُڑ بھی سکتا ہے؟!',
    tts: 'اوئے! یہ اُڑ بھی سکتا ہے؟!',
    ttsRoman: 'Oye! Yeh urr bhi sakta hai?!',
    style: 'shocked disbelief at jetpack flight',
  },
  {
    id: 'arrest',
    file: 'arrest.mp3',
    subtitle: 'چل بیٹا، اب تھانے چلتے ہیں!',
    tts: 'چل بیٹا، اب تھانے چلتے ہیں!',
    ttsRoman: 'Chal beta, ab thanay chalte hain!',
    style: 'triumphant funny arrest line',
  },
  {
    id: 'extra-duty',
    file: 'extra-duty.mp3',
    subtitle: 'اوئے! میری ڈیوٹی ختم ہونے والی ہے!',
    tts: 'اوئے! میری ڈیوٹی ختم ہونے والی ہے!',
    ttsRoman: 'Oye! Meri duty khatam hone wali hai!',
    style: 'complaining funny side line while chasing',
  },
  {
    id: 'extra-breath',
    file: 'extra-breath.mp3',
    subtitle: 'رک جا یار، سانس پھول گئی ہے!',
    tts: 'رک جا یار، سانس پھول گئی ہے!',
    ttsRoman: 'Ruk ja yar, saans phool gayi hai!',
    style: 'exhausted breathless plea while running',
  },
]

const DEFAULT_MODELS = ['eleven_v4', 'eleven_multilingual_v2', 'eleven_turbo_v2_5']

function parseArgs(argv) {
  const opts = {
    force: false,
    test: false,
    roman: false,
    model: process.env.ELEVENLABS_MODEL_ID || '',
    only: '',
  }
  for (const a of argv.slice(2)) {
    if (a === '--force' || a === '-f') opts.force = true
    else if (a === '--test') opts.test = true
    else if (a === '--roman') opts.roman = true
    else if (a.startsWith('--model=')) opts.model = a.slice('--model='.length)
    else if (a.startsWith('--only=')) opts.only = a.slice('--only='.length)
  }
  return opts
}

function loadDotEnv() {
  // Lightweight .env loader — never prints secret values
  return readFile(path.join(ROOT, '.env'), 'utf8')
    .then((text) => {
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
    })
    .catch(() => {})
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
  // ID3 tag or MPEG frame sync
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return true
  return false
}

async function ttsRequest({ apiKey, voiceId, modelId, text, style }) {
  const url = `${API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`
  const body = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.42,
      similarity_boost: 0.75,
      style: 0.55,
      use_speaker_boost: true,
    },
  }
  // Optional style prompt for models that support it
  if (style) body.pronunciation_dictionary_locators = undefined

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify(body),
  })

  const contentType = res.headers.get('content-type') || ''
  if (!res.ok) {
    let detail = ''
    try {
      const j = await res.json()
      detail = j?.detail?.message || j?.detail?.status || JSON.stringify(j?.detail || j)
    } catch {
      try {
        detail = await res.text()
      } catch {
        detail = ''
      }
    }
    const err = new Error(detail || `HTTP ${res.status}`)
    err.status = res.status
    err.detail = detail
    if (/quota|credit|payment|insufficient/i.test(String(detail)) || res.status === 402) {
      err.code = 'INSUFFICIENT_CREDITS'
    } else if (res.status === 401 || res.status === 403) {
      err.code = 'AUTH'
    } else if (res.status === 404) {
      err.code = 'VOICE_OR_MODEL'
    } else {
      err.code = 'API'
    }
    throw err
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (!isMp3Buffer(buf) && !contentType.includes('audio')) {
    throw Object.assign(new Error('Invalid audio response (not MP3)'), { code: 'INVALID_AUDIO' })
  }
  if (buf.length < 800) {
    throw Object.assign(new Error('Audio response too small — likely invalid'), {
      code: 'INVALID_AUDIO',
    })
  }
  return buf
}

async function resolveModel(apiKey, preferred) {
  if (preferred) return preferred
  // Probe which models exist; prefer eleven_v4 then multilingual
  try {
    const res = await fetch(`${API_BASE}/models`, {
      headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
    })
    if (res.ok) {
      const models = await res.json()
      const ids = new Set((models || []).map((m) => m.model_id || m.modelId || m.id))
      for (const id of DEFAULT_MODELS) {
        if (ids.has(id)) return id
      }
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_MODELS[1] // eleven_multilingual_v2 — widely available
}

async function generateOne(line, { apiKey, voiceId, modelId, roman, outPath }) {
  const text = roman ? line.ttsRoman : line.tts
  const buf = await ttsRequest({
    apiKey,
    voiceId,
    modelId,
    text,
    style: line.style,
  })
  try {
    await writeFile(outPath, buf)
  } catch (e) {
    throw Object.assign(new Error(`File write failed: ${outPath} — ${e.message}`), {
      code: 'WRITE',
    })
  }
  return { bytes: buf.length, text }
}

async function main() {
  await loadDotEnv()
  const opts = parseArgs(process.argv)
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim()

  if (!apiKey) {
    console.error(`
ERROR: Missing ELEVENLABS_API_KEY.

Add to .env (gitignored):
  ELEVENLABS_API_KEY=your_key_here
  ELEVENLABS_VOICE_ID=your_voice_id_here
  ELEVENLABS_MODEL_ID=eleven_multilingual_v2   # optional; eleven_v4 used if available

Then run:
  npm run generate:voices

Or drop manually recorded MP3s into public/audio/police/ using the filenames
listed in scripts/generate-police-voices.mjs (start.mp3, chase.mp3, …).
`)
    process.exit(1)
  }
  if (!voiceId) {
    console.error(`
ERROR: Missing ELEVENLABS_VOICE_ID.

Pick a male Pakistani / Urdu-capable voice in the ElevenLabs dashboard
and set ELEVENLABS_VOICE_ID in .env.
`)
    process.exit(1)
  }

  await mkdir(OUT_DIR, { recursive: true })

  let modelId
  try {
    modelId = await resolveModel(apiKey, opts.model)
  } catch (e) {
    console.error('Failed to resolve model:', e.message)
    process.exit(1)
  }
  console.log(`Model: ${modelId}`)
  console.log(`Voice: ${voiceId.slice(0, 6)}…`)
  console.log(`TTS script: ${opts.roman ? 'Roman Urdu' : 'Nastaliq Urdu'}`)

  const lines = opts.only
    ? POLICE_VOICE_LINES.filter((l) => l.id === opts.only || l.file === opts.only)
    : POLICE_VOICE_LINES

  if (!lines.length) {
    console.error(`No lines match --only=${opts.only}`)
    process.exit(1)
  }

  // Pronunciation test before full batch
  if (opts.test || (!opts.only && !opts.force)) {
    const probe = lines[0]
    const probePath = path.join(OUT_DIR, `_probe-${probe.file}`)
    console.log(`\nPronunciation test: "${opts.roman ? probe.ttsRoman : probe.tts}"`)
    try {
      const result = await generateOne(probe, {
        apiKey,
        voiceId,
        modelId,
        roman: opts.roman,
        outPath: probePath,
      })
      console.log(`OK — wrote ${probePath} (${result.bytes} bytes)`)
      console.log(
        'Listen to the probe file. If Urdu sounds wrong, re-run with --roman.\n' +
          'If still unusable, record MP3s manually into public/audio/police/.',
      )
      if (opts.test) {
        console.log('Exiting after --test (no batch).')
        process.exit(0)
      }
    } catch (e) {
      handleApiError(e)
      process.exit(1)
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    modelId,
    roman: opts.roman,
    files: {},
  }

  let generated = 0
  let skipped = 0

  for (const line of lines) {
    const outPath = path.join(OUT_DIR, line.file)
    if (!opts.force && (await exists(outPath))) {
      console.log(`skip  ${line.file} (exists; use --force to regenerate)`)
      skipped += 1
      manifest.files[line.id] = {
        file: line.file,
        subtitle: line.subtitle,
        skipped: true,
      }
      continue
    }
    process.stdout.write(`gen   ${line.file} … `)
    try {
      const result = await generateOne(line, {
        apiKey,
        voiceId,
        modelId,
        roman: opts.roman,
        outPath,
      })
      console.log(`${result.bytes} bytes`)
      generated += 1
      manifest.files[line.id] = {
        file: line.file,
        subtitle: line.subtitle,
        ttsText: result.text,
        bytes: result.bytes,
      }
    } catch (e) {
      console.log('FAILED')
      handleApiError(e)
      process.exit(1)
    }
  }

  try {
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2))
  } catch (e) {
    console.error('Warning: could not write manifest.json:', e.message)
  }

  console.log(`\nDone. generated=${generated} skipped=${skipped} → ${OUT_DIR}`)
  console.log('Subtitles remain Nastaliq Urdu in-game regardless of TTS script.')
}

function handleApiError(e) {
  const code = e.code || 'API'
  if (code === 'INSUFFICIENT_CREDITS') {
    console.error('\nElevenLabs: insufficient credits / quota. Top up and retry.')
  } else if (code === 'AUTH') {
    console.error('\nElevenLabs: API key rejected. Check ELEVENLABS_API_KEY.')
  } else if (code === 'VOICE_OR_MODEL') {
    console.error('\nElevenLabs: voice or model not found. Check ELEVENLABS_VOICE_ID / --model.')
  } else if (code === 'INVALID_AUDIO') {
    console.error('\nElevenLabs: response was not valid MP3 audio.')
  } else if (code === 'WRITE') {
    console.error('\n' + e.message)
  } else {
    console.error(`\nElevenLabs API error: ${e.message}`)
  }
  console.error(
    '\nFallback: place manually recorded MP3s in public/audio/police/ with the expected filenames.',
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
