/**
 * Centralized police voice + dog bark manager.
 * Plays real MP3s from /audio/police and /audio/dog (Vite public/).
 * No on-screen subtitles — audio only.
 */

import { meta } from './meta'

/**
 * Bump this whenever you replace MP3 files so browsers / HTMLAudio
 * cannot keep serving a cached old clip for the same path.
 */
export const AUDIO_ASSET_VERSION = 'v2026-11-08-1349'

function assetUrl(path) {
  const clean = String(path).split('?')[0]
  return `${clean}?v=${AUDIO_ASSET_VERSION}`
}

/** Internal line labels (not shown on screen). */
export const POLICE_LINES = {
  start: 'اوئے رک جا! کہاں بھاگ رہا ہے؟',
  chase: 'رک جا، تجھے قانون کی قسم!',
  lawOath: 'رک جا، تجھے قانون کی قسم!',
  nearMiss: 'اوئے ہوئے! بچ گیا تُو!',
  close: 'بھاگو کتے، پکڑو اسے!',
  jetpack: 'اوئے! یہ اُڑ بھی سکتا ہے؟!',
  gameover: 'چل بیٹا، اب تھانے چلتے ہیں!',
  trainJump: 'اوئے! ٹرین پہ چڑھ گیا؟!',
  shield: 'اوئے! شیلڈ لگا لی تُو نے؟!',
  magnet: 'اوئے! سکّے کھینچ رہا ہے؟!',
  dogCommand: 'بھاگو کتے، پکڑو اسے!',
  extraDuty: 'اوئے! میری ڈیوٹی ختم ہونے والی ہے!',
  extraBreath: 'رک جا یار، سانس پھول گئی ہے!',
  tired: 'اوئے رک جا، میں تھک گیا ہوں!',
  complaint: 'یہ کیسا چور ہے یار؟!',
  almostCaught: 'تقریباً پکڑ لیا تھا!',
  escape: 'بھاگ گیا وی؟!',
  chaseFunny: 'اوئے مزے آ گئے بھاگ کے!',
  closeChase: 'قریب آ گیا ہے کتا!',
  veryClose: 'اب تو پکڑا جائے گا!',
  arrestFunny: 'چل بیٹا، مزاق ختم!',
  finalJoke: 'تھانے میں چائے پلاؤں گا!',
  carNearMiss: 'گاڑی سے بال بال بچا!',
}

/** Map gameplay keys → public MP3 paths (versioned to bust HTTP + element cache) */
export const POLICE_FILES = {
  start: assetUrl('/audio/police/start.mp3'),
  chase: assetUrl('/audio/police/chase.mp3'),
  /** Same clip — “ruk ja, tujhe qanoon ki qasam” */
  lawOath: assetUrl('/audio/police/chase.mp3'),
  nearMiss: assetUrl('/audio/police/near-miss.mp3'),
  close: assetUrl('/audio/police/dog-command.mp3'),
  jetpack: assetUrl('/audio/police/jetpack.mp3'),
  gameover: assetUrl('/audio/police/arrest.mp3'),
  arrest: assetUrl('/audio/police/arrest.mp3'),
  trainJump: assetUrl('/audio/police/train-jump.mp3'),
  shield: assetUrl('/audio/police/shield.mp3'),
  magnet: assetUrl('/audio/police/magnet.mp3'),
  dogCommand: assetUrl('/audio/police/dog-command.mp3'),
  extraDuty: assetUrl('/audio/police/extra-duty.mp3'),
  extraBreath: assetUrl('/audio/police/extra-breath.mp3'),
  tired: assetUrl('/audio/police/tired.mp3'),
  complaint: assetUrl('/audio/police/complaint.mp3'),
  almostCaught: assetUrl('/audio/police/almost-caught.mp3'),
  escape: assetUrl('/audio/police/escape.mp3'),
  chaseFunny: assetUrl('/audio/police/chase-funny.mp3'),
  closeChase: assetUrl('/audio/police/close-chase.mp3'),
  veryClose: assetUrl('/audio/police/very-close.mp3'),
  arrestFunny: assetUrl('/audio/police/arrest-funny.mp3'),
  finalJoke: assetUrl('/audio/police/final-joke.mp3'),
  carNearMiss: assetUrl('/audio/police/car-near-miss.mp3'),
}

/** After 1km, rotate these so the same obstacle VO does not repeat forever.
 * Arrest / gameover stay fixed — rotating them made the catch line feel random. */
const VOICE_VARIANTS = {
  nearMiss: ['nearMiss', 'carNearMiss', 'almostCaught', 'escape'],
  // lawOath / chase stay fixed on chase.mp3 (“رک جا، تجھے قانون کی قسم”)
  close: ['close', 'dogCommand', 'veryClose', 'closeChase'],
  dogCommand: ['dogCommand', 'close', 'veryClose'],
  trainJump: ['trainJump', 'escape', 'almostCaught'],
  extraDuty: ['extraDuty', 'tired', 'complaint', 'extraBreath'],
  extraBreath: ['extraBreath', 'tired', 'complaint', 'extraDuty'],
}

const VARIANT_UNLOCK_M = 1000

export const DOG_FILES = {
  short: assetUrl('/audio/dog/bark-short.mp3'),
  angry: assetUrl('/audio/dog/bark-angry.mp3'),
  close: assetUrl('/audio/dog/bark-close.mp3'),
  running: assetUrl('/audio/dog/dog-running.mp3'),
  arrest: assetUrl('/audio/dog/bark-arrest.mp3'),
}

const PRIORITY = {
  start: 40,
  chase: 20,
  lawOath: 35,
  nearMiss: 50,
  close: 45,
  dogCommand: 45,
  jetpack: 55,
  trainJump: 52,
  shield: 48,
  magnet: 48,
  gameover: 100,
  arrest: 100,
  extraDuty: 10,
  extraBreath: 10,
}

const COOLDOWN_SEC = {
  start: 0,
  chase: 10,
  lawOath: 14,
  nearMiss: 8,
  close: 10,
  dogCommand: 10,
  jetpack: 12,
  trainJump: 8,
  shield: 6,
  magnet: 6,
  gameover: 0,
  arrest: 0,
  extraDuty: 18,
  extraBreath: 16,
}

const EXTRA_KEYS = ['extraDuty', 'extraBreath', 'tired', 'complaint']

/** @type {Map<string, HTMLAudioElement>} */
const cache = new Map()
/** @type {Map<string, string>} */
const loadErrors = new Map()
let audioCtx = null
let unlocked = false
let masterMuted = false
let voiceVolume = 0.85
let sfxVolume = 0.7
let presence = 0.55
let spatialEnabled = true
let currentVoice = null
let currentVoiceKey = ''
let currentFilename = ''
let speaking = false
let lastKey = ''
let lastAt = 0
let lastBarkAt = 0
let lastBarkType = ''
let lastVariantByEvent = Object.create(null)
let runDistanceM = 0
let playbackError = ''
let runningDogEl = null

/** Keep voice variety in sync with run progress (called from world step). */
export function setVoiceRunDistance(meters) {
  runDistanceM = Math.max(0, Number(meters) || 0)
}

function pickVoiceClip(eventKey) {
  // Arrest always uses the same catch clip (never rotate funny/joke variants)
  if (eventKey === 'arrest' || eventKey === 'gameover') {
    const pick = 'gameover'
    return {
      key: 'gameover',
      pick,
      line: POLICE_LINES.gameover,
      url: POLICE_FILES.arrest || POLICE_FILES.gameover,
    }
  }
  const baseKey = eventKey
  const variants = VOICE_VARIANTS[baseKey]
  let pick = baseKey
  if (variants?.length > 1 && runDistanceM >= VARIANT_UNLOCK_M) {
    const last = lastVariantByEvent[baseKey]
    const pool = variants.filter((k) => k !== last)
    const choices = pool.length ? pool : variants
    pick = choices[(Math.random() * choices.length) | 0]
    lastVariantByEvent[baseKey] = pick
  }
  const line = POLICE_LINES[pick] || POLICE_LINES[baseKey]
  const url = POLICE_FILES[pick] || POLICE_FILES[baseKey] || POLICE_FILES[eventKey]
  return { key: baseKey, pick, line, url }
}

const status = {
  contextState: 'none',
  masterVolume: 1,
  voiceVolume,
  sfxVolume,
  currentFilename: '',
  loadErrors: [],
  playbackErrors: [],
  unlocked: false,
  missing: [],
  speaking: false,
  presence: 0.55,
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function sfxEnabled() {
  if (masterMuted) return false
  return meta.settings?.sfx !== false
}

function voiceGain() {
  const master = Math.max(0, Math.min(1, meta.settings?.sfxVol ?? sfxVolume))
  const voice = Math.max(0, Math.min(1, meta.settings?.voiceVol ?? voiceVolume))
  return Math.max(0.05, master * voice)
}

function barkGain() {
  const master = Math.max(0, Math.min(1, meta.settings?.sfxVol ?? sfxVolume))
  const bark = Math.max(0, Math.min(1, meta.settings?.barkVol ?? 0.75))
  return Math.max(0.05, master * bark)
}

function filenameOf(url) {
  const base = String(url).split('?')[0]
  return base.split('/').pop() || url
}

/**
 * Destroy every cached HTMLAudioElement and drop load errors.
 * Call after replacing MP3s on disk (or from the DEV AUDIO panel).
 */
export function clearAudioCache() {
  stopDialogue()
  stopDogBark()
  for (const el of cache.values()) {
    try {
      el.pause()
      el.removeAttribute('src')
      el.load()
    } catch {
      /* ignore */
    }
  }
  cache.clear()
  loadErrors.clear()
  playbackError = ''
  currentFilename = ''
  refreshStatus()
  if (typeof window !== 'undefined') {
    window.__nrAudioCacheClearedAt = Date.now()
    window.__nrAudioAssetVersion = AUDIO_ASSET_VERSION
  }
}

function ensureContext() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

function makeAudio(url) {
  const el = new Audio()
  el.preload = 'auto'
  // Bypass aggressive browser media cache for same-path replacements
  el.crossOrigin = 'anonymous'
  el.src = url
  el.addEventListener('error', () => {
    loadErrors.set(url, `Failed to load ${filenameOf(url)}`)
    refreshStatus()
  })
  return el
}

function getAudio(url) {
  if (typeof Audio === 'undefined') return null
  let el = cache.get(url)
  if (!el) {
    el = makeAudio(url)
    cache.set(url, el)
  }
  return el
}

function refreshStatus() {
  status.contextState = audioCtx?.state || 'none'
  status.masterVolume = masterMuted ? 0 : 1
  status.voiceVolume = voiceVolume
  status.sfxVolume = sfxVolume
  status.currentFilename = currentFilename
  status.loadErrors = [...loadErrors.entries()].map(([u, m]) => `${filenameOf(u)}: ${m}`)
  status.playbackErrors = playbackError ? [playbackError] : []
  status.unlocked = unlocked
  status.missing = [...loadErrors.keys()].map(filenameOf)
  status.speaking = speaking
  status.presence = presence
  if (typeof window !== 'undefined') window.__nrAudioStatus = { ...status }
}

export function preloadAudio({ bust = false } = {}) {
  if (typeof Audio === 'undefined') return Promise.resolve([])
  if (bust) clearAudioCache()
  const urls = [...new Set([...Object.values(POLICE_FILES), ...Object.values(DOG_FILES)])]
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          // Always recreate element on preload after clear; force network fetch
          let el = cache.get(url)
          if (!el) {
            el = makeAudio(url)
            cache.set(url, el)
          } else {
            try {
              el.src = url
              el.load()
            } catch {
              /* ignore */
            }
          }
          const onOk = () => {
            cleanup()
            loadErrors.delete(url)
            resolve({ url, ok: true })
          }
          const onErr = () => {
            cleanup()
            loadErrors.set(url, `Missing or invalid: ${filenameOf(url)}`)
            resolve({ url, ok: false })
          }
          const cleanup = () => {
            el.removeEventListener('canplaythrough', onOk)
            el.removeEventListener('error', onErr)
          }
          if (el.readyState >= 3 && !bust) {
            loadErrors.delete(url)
            return resolve({ url, ok: true })
          }
          el.addEventListener('canplaythrough', onOk, { once: true })
          el.addEventListener('error', onErr, { once: true })
          try {
            el.load()
          } catch {
            onErr()
          }
        }),
    ),
  ).then((results) => {
    refreshStatus()
    if (typeof window !== 'undefined') {
      window.__nrAudioAssetVersion = AUDIO_ASSET_VERSION
    }
    return results
  })
}

/**
 * Call from Play / user gesture. Unlocks AudioContext + primes HTMLAudio (Safari).
 */
export function unlockDialogue() {
  unlocked = true
  ensureContext()
  // Fresh load of versioned assets on every unlock (Play / AUDIO panel)
  void preloadAudio({ bust: true })
  const primes = []
  for (const el of cache.values()) {
    try {
      const wasMuted = el.muted
      el.muted = true
      const p = el.play()
      if (p && typeof p.then === 'function') {
        primes.push(
          p
            .then(() => {
              el.pause()
              el.currentTime = 0
              el.muted = wasMuted
            })
            .catch(() => {
              el.muted = wasMuted
            }),
        )
      } else {
        el.pause()
        el.muted = wasMuted
      }
    } catch {
      /* ignore */
    }
  }
  try {
    const beep = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
    )
    beep.volume = 0.01
    void beep.play().then(() => beep.pause()).catch(() => {})
  } catch {
    /* ignore */
  }
  refreshStatus()
  return Promise.allSettled(primes).then(() => {
    refreshStatus()
    return true
  })
}

export function setVoiceVolume(v) {
  voiceVolume = Math.max(0, Math.min(1, Number(v) || 0))
  if (currentVoice) currentVoice.volume = clampVoiceVol()
  refreshStatus()
}

export function setSfxVolume(v) {
  sfxVolume = Math.max(0, Math.min(1, Number(v) || 0))
  refreshStatus()
}

export function muteAll(on = true) {
  masterMuted = !!on
  if (masterMuted) {
    stopDialogue()
    stopDogBark()
  }
  refreshStatus()
}

export function setSpatialEnabled(on) {
  spatialEnabled = !!on
}

export function setChasePresence(value) {
  presence = Math.max(0.28, Math.min(1, Number(value) || 0.55))
  if (currentVoice) {
    currentVoice.volume = clampVoiceVol()
    applySpatial(currentVoice)
  }
  if (runningDogEl) {
    runningDogEl.volume = Math.min(1, clampBarkVol('running') * 0.55)
    applySpatial(runningDogEl)
  }
}

function clampVoiceVol() {
  const near = 0.58 + presence * 0.42
  return Math.min(1, voiceGain() * near)
}

function clampBarkVol(type) {
  const boost = type === 'arrest' ? 1.05 : type === 'close' || type === 'angry' ? 1 : 0.88
  const near = 0.52 + presence * 0.48
  return Math.min(1, barkGain() * near * boost)
}

/**
 * Positional feel via presence-scaled volume (behind/approaching chase).
 * Avoids MediaElementSource → destination graphs that go silent on Safari/iOS.
 * setSpatialEnabled(false) keeps a flatter volume curve.
 */
function applySpatial(el) {
  if (!el) return
  if (!spatialEnabled) {
    // Flatter non-spatial fallback — still audible
    if (el === currentVoice) el.volume = Math.min(1, voiceGain() * 0.9)
    return
  }
  // Volume already set by clampVoiceVol / clampBarkVol using presence
}

export function stopDialogue() {
  speaking = false
  if (currentVoice) {
    try {
      currentVoice.pause()
      currentVoice.currentTime = 0
    } catch {
      /* ignore */
    }
  }
  currentVoice = null
  currentVoiceKey = ''
  currentFilename = ''
  refreshStatus()
}

function stopDogRunning() {
  if (runningDogEl) {
    try {
      runningDogEl.pause()
      runningDogEl.currentTime = 0
      runningDogEl.loop = false
    } catch {
      /* ignore */
    }
    runningDogEl = null
  }
}

/**
 * @param {keyof typeof POLICE_LINES | 'arrest'} event
 * @param {{ force?: boolean, priority?: boolean }} [opts]
 */
export function playPoliceVoice(event, opts = {}) {
  const { key, line, url } = pickVoiceClip(event)
  if (!line || !url) return false
  if (!unlocked && !opts.force) return false
  if (!sfxEnabled() && !opts.force) return false

  const t = now()
  // After 1km, longer cooldown on same event so lines feel less spammy
  const coolMul = runDistanceM >= VARIANT_UNLOCK_M ? 1.35 : 1
  const cool = (COOLDOWN_SEC[key] ?? 12) * 1000 * coolMul
  const pri = PRIORITY[key] ?? 0
  const curPri = PRIORITY[currentVoiceKey] ?? 0

  if (!opts.force && !opts.priority) {
    if (speaking && pri <= curPri) return false
    if (key === lastKey && t - lastAt < cool) return false
    if (t - lastAt < 2200 && lastKey && PRIORITY[lastKey] >= pri && key !== 'gameover') {
      return false
    }
  }

  if (opts.priority || key === 'gameover' || pri > curPri) {
    stopDialogue()
  } else if (speaking) {
    return false
  }

  const el = getAudio(url)
  if (!el) {
    playbackError = 'Audio element unavailable'
    refreshStatus()
    return false
  }

  if (loadErrors.has(url) || el.error) {
    if (!loadErrors.has(url)) loadErrors.set(url, `Missing or invalid: ${url}`)
    playbackError = `Missing voice file: ${filenameOf(url)}`
    lastKey = key
    lastAt = t
    currentFilename = `${filenameOf(url)} (MISSING)`
    refreshStatus()
    return false
  }

  lastKey = key
  lastAt = t
  speaking = true
  currentVoice = el
  currentVoiceKey = key
  currentFilename = filenameOf(url)
  playbackError = ''

  try {
    el.pause()
    el.currentTime = 0
  } catch {
    /* ignore */
  }
  el.muted = false
  el.loop = false
  el.volume = clampVoiceVol()
  applySpatial(el)

  const onEnd = () => {
    if (currentVoice === el) {
      speaking = false
      currentVoice = null
      currentVoiceKey = ''
      currentFilename = ''
      refreshStatus()
    }
    el.removeEventListener('ended', onEnd)
  }
  el.addEventListener('ended', onEnd)

  const playPromise = el.play()
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise
      .then(() => {
        playbackError = ''
        refreshStatus()
      })
      .catch((err) => {
        speaking = false
        currentVoice = null
        currentVoiceKey = ''
        playbackError = `Playback blocked: ${err?.message || err}`
        refreshStatus()
      })
  }

  refreshStatus()
  return true
}

/** Back-compat for world.js */
export function playPoliceLine(key, opts = {}) {
  return playPoliceVoice(key, opts)
}

/**
 * Arrest VO then final German shepherd bark (sequential, realistic finale).
 */
export function playArrestFinale() {
  const started = playPoliceVoice('arrest', { priority: true, force: true })
  // Use the element that is actually speaking (same clip as arrest / gameover)
  const el = currentVoice || cache.get(POLICE_FILES.arrest) || cache.get(POLICE_FILES.gameover)
  if (!started || !el) {
    playDogBark('arrest')
    return started
  }
  let barked = false
  const barkOnce = () => {
    if (barked) return
    barked = true
    playDogBark('arrest')
  }
  el.addEventListener('ended', barkOnce, { once: true })
  // Fallback if 'ended' never fires (tab background / Safari quirks)
  setTimeout(barkOnce, Math.max(2200, (el.duration || 2.5) * 1000 + 120))
  return true
}

/**
 * @param {'short'|'angry'|'close'|'running'|'arrest'|number} typeOrUrgency
 */
export function playDogBark(typeOrUrgency = 'short') {
  if (!sfxEnabled()) return false
  if (!unlocked) return false

  let type = 'short'
  if (typeof typeOrUrgency === 'number') {
    const u = typeOrUrgency
    type = u >= 0.85 ? 'close' : u >= 0.55 ? 'angry' : 'short'
  } else if (typeof typeOrUrgency === 'string' && typeOrUrgency in DOG_FILES) {
    type = typeOrUrgency
  }

  const t = now()
  // Arrest bark always allowed (finale); others debounce to avoid spam
  if (type !== 'arrest') {
    if (t - lastBarkAt < 420 && lastBarkType === type) return false
    if (t - lastBarkAt < 220) return false
  }
  lastBarkAt = t
  lastBarkType = type

  const url = DOG_FILES[type]
  const el = getAudio(url)
  if (!el || loadErrors.has(url) || el.error) {
    if (url) loadErrors.set(url, `Missing or invalid: ${url}`)
    playbackError = `Missing dog SFX: ${filenameOf(url)}`
    refreshStatus()
    return false
  }

  if (type === 'running') {
    if (runningDogEl && !runningDogEl.paused) return true
    runningDogEl = el
    el.loop = true
    el.volume = Math.min(1, clampBarkVol(type) * 0.55)
    applySpatial(el)
    void el.play().catch((err) => {
      playbackError = `Dog running blocked: ${err?.message || err}`
      refreshStatus()
    })
    return true
  }

  try {
    el.pause()
    el.currentTime = 0
  } catch {
    /* ignore */
  }
  el.loop = false
  el.muted = false
  el.volume = clampBarkVol(type)
  applySpatial(el)
  const p = el.play()
  if (p && typeof p.catch === 'function') {
    p.catch((err) => {
      playbackError = `Bark blocked: ${err?.message || err}`
      refreshStatus()
    })
  }
  return true
}

export function stopDogBark() {
  stopDogRunning()
  for (const key of ['short', 'angry', 'close', 'arrest']) {
    const el = cache.get(DOG_FILES[key])
    if (!el) continue
    try {
      el.pause()
      el.currentTime = 0
    } catch {
      /* ignore */
    }
  }
}

export function maybePlayExtraLine() {
  if (!unlocked || speaking || !sfxEnabled()) return false
  const key = EXTRA_KEYS[(Math.random() * EXTRA_KEYS.length) | 0]
  return playPoliceVoice(key)
}

export function getSubtitle() {
  // Subtitles disabled — audio only
  return { text: '', life: 0 }
}

export function tickSubtitle() {
  /* no-op: subtitles removed */
}

export function resetDialogue() {
  stopDialogue()
  stopDogBark()
  lastKey = ''
  lastAt = 0
  lastVariantByEvent = Object.create(null)
  runDistanceM = 0
  playbackError = ''
  refreshStatus()
}

export function getAudioStatus() {
  if (audioCtx) status.contextState = audioCtx.state
  refreshStatus()
  return { ...status, loadErrorMap: Object.fromEntries(loadErrors) }
}

export function isDialogueUnlocked() {
  return unlocked
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (currentVoice && !currentVoice.paused) {
        try {
          currentVoice.pause()
        } catch {
          /* ignore */
        }
      }
      stopDogRunning()
    }
  })
}

// Bridge for audio.js without circular imports
if (typeof window !== 'undefined') {
  window.__nrPlayDogBark = playDogBark
  window.__nrUnlockDialogue = unlockDialogue
  window.__nrPreloadAudio = preloadAudio
  window.__nrClearAudioCache = clearAudioCache
  window.__nrAudioAssetVersion = AUDIO_ASSET_VERSION
}
