import { meta } from './meta'

let ctx
let lastCoin = 0
let musicNodes = null
let musicTimer = null

function context() {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!ctx) ctx = new AudioCtx()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function unlockAudio() {
  context()
  if (typeof window !== 'undefined' && window.__nrUnlockDialogue) {
    void window.__nrUnlockDialogue()
  }
  if (typeof window !== 'undefined' && window.__nrPreloadAudio) {
    void window.__nrPreloadAudio()
  }
  if (meta.settings.music) startMusic()
}

/** Expose AudioContext for DEV status panels */
export function getAudioContextState() {
  return ctx?.state || 'none'
}

function sfxOk() {
  return meta.settings?.sfx !== false
}

function sfxGain() {
  return Math.max(0, Math.min(1, meta.settings?.sfxVol ?? 0.7))
}

function musicGain() {
  return Math.max(0, Math.min(1, meta.settings?.musicVol ?? 0.35))
}

function tone(freq, duration, type, gain, slideTo) {
  if (!sfxOk()) return
  const audio = context()
  if (!audio) return
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  const now = audio.currentTime
  const g = gain * sfxGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration)
  amp.gain.setValueAtTime(g, now)
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(amp)
  amp.connect(audio.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

export function playJump() {
  tone(460, 0.11, 'square', 0.028, 760)
}

export function playSlide() {
  tone(220, 0.09, 'sawtooth', 0.02, 110)
}

export function playCoin() {
  const now = typeof performance !== 'undefined' ? performance.now() : 0
  if (now - lastCoin < 65) return
  lastCoin = now
  tone(860, 0.07, 'square', 0.03, 1380)
}

export function playCrash() {
  tone(160, 0.32, 'sawtooth', 0.045, 42)
}

export function playNearMiss() {
  tone(520, 0.08, 'triangle', 0.02, 980)
}

export function playCombo(level = 1) {
  const bump = Math.min(5, Math.max(1, level))
  tone(640 + bump * 90, 0.08, 'square', 0.025, 1100 + bump * 120)
}

export function playCount() {
  tone(380, 0.08, 'sine', 0.025, 420)
}

export function playGo() {
  tone(620, 0.14, 'square', 0.03, 980)
}

export function playMagnet() {
  tone(520, 0.16, 'sine', 0.03, 880)
}

export function playShieldBreak() {
  tone(280, 0.18, 'sawtooth', 0.04, 90)
  setTimeout(() => tone(520, 0.08, 'triangle', 0.025, 180), 70)
}

export function playJetpack() {
  tone(180, 0.22, 'sawtooth', 0.028, 420)
}

export function playPower() {
  tone(700, 0.12, 'triangle', 0.028, 1100)
}

export function playTrainWarn() {
  tone(240, 0.18, 'square', 0.035, 180)
  setTimeout(() => tone(240, 0.18, 'square', 0.03, 180), 220)
}

export function playFootstep() {
  tone(90, 0.04, 'triangle', 0.012, 60)
}

/** Synth fallback only — prefer dialogue.playDogBark (real MP3s). */
export function playDogBarkSynth(urgency = 0.5) {
  const u = Math.max(0, Math.min(1, urgency))
  const pitch = 0.85 + Math.random() * 0.3 + u * 0.2
  const vol = 0.024 + u * 0.02 + Math.random() * 0.008
  tone(300 * pitch, 0.06 + u * 0.03, 'square', vol, 200 * pitch)
  setTimeout(
    () => tone(260 * pitch, 0.08 + u * 0.04, 'sawtooth', vol * 0.9, 150 * pitch),
    50 + Math.random() * 30,
  )
  if (u > 0.65) {
    setTimeout(() => tone(320 * pitch, 0.05, 'square', vol * 0.7, 180 * pitch), 140)
  }
}

/**
 * Plays licensed dog bark MP3s via the voice manager.
 * Falls back to a short synth chirp only if the manager cannot play.
 */
export function playDogBark(urgency = 0.5) {
  try {
    // Lazy require pattern avoided — dialogue registers itself
    if (typeof window !== 'undefined' && window.__nrPlayDogBark) {
      if (window.__nrPlayDogBark(urgency)) return
    }
  } catch {
    /* ignore */
  }
  playDogBarkSynth(urgency)
}

export function playWhoosh() {
  tone(180, 0.12, 'sawtooth', 0.022, 520)
  setTimeout(() => tone(420, 0.08, 'triangle', 0.016, 120), 40)
}

/** Short non-verbal stinger when no Urdu TTS voice is available. */
export function playDialogueStinger(key = 'chase') {
  if (key === 'gameover') {
    tone(200, 0.1, 'triangle', 0.03, 140)
    setTimeout(() => tone(160, 0.16, 'sawtooth', 0.028, 90), 90)
    return
  }
  if (key === 'nearMiss') {
    tone(380, 0.07, 'square', 0.022, 260)
    return
  }
  if (key === 'jetpack') {
    tone(440, 0.09, 'sawtooth', 0.024, 280)
    return
  }
  tone(240, 0.08, 'triangle', 0.022, 180)
  setTimeout(() => tone(300, 0.07, 'triangle', 0.018, 220), 70)
}

export function playDogPaw() {
  tone(70, 0.03, 'triangle', 0.01, 45)
}

export function playOfficerShout() {
  // Short original “hey!”-style chirp — not a voice sample
  tone(210, 0.05, 'sawtooth', 0.022, 320)
  setTimeout(() => tone(260, 0.08, 'triangle', 0.02, 180), 60)
}

export function playChaseCatch() {
  tone(140, 0.2, 'sawtooth', 0.04, 60)
  setTimeout(() => tone(420, 0.12, 'square', 0.03, 180), 120)
  setTimeout(() => tone(90, 0.28, 'triangle', 0.035, 40), 220)
}

let chaseTensionTimer = null
export function setChaseTensionAudio(level) {
  if (!sfxOk() || level < 0.55) {
    if (chaseTensionTimer) {
      clearInterval(chaseTensionTimer)
      chaseTensionTimer = null
    }
    return
  }
  if (chaseTensionTimer) return
  chaseTensionTimer = setInterval(() => {
    if (!sfxOk()) return
    tone(55 + level * 40, 0.12, 'sine', 0.012 + level * 0.01, 40)
  }, 520)
}

export function stopChaseTensionAudio() {
  if (chaseTensionTimer) {
    clearInterval(chaseTensionTimer)
    chaseTensionTimer = null
  }
}

export function playUnlock() {
  tone(520, 0.1, 'square', 0.03, 780)
  setTimeout(() => tone(780, 0.14, 'square', 0.028, 1200), 90)
}

export function playClaim() {
  tone(660, 0.1, 'sine', 0.03, 990)
}

function stopMusicInternal() {
  if (musicTimer) {
    clearInterval(musicTimer)
    musicTimer = null
  }
  if (musicNodes) {
    try {
      musicNodes.osc.stop()
      musicNodes.osc2.stop()
    } catch {
      /* ignore */
    }
    musicNodes = null
  }
}

export function startMusic() {
  if (meta.settings?.music === false) return
  const audio = context()
  if (!audio || musicNodes) return
  const osc = audio.createOscillator()
  const osc2 = audio.createOscillator()
  const amp = audio.createGain()
  const now = audio.currentTime
  osc.type = 'triangle'
  osc2.type = 'sine'
  osc.frequency.value = 110
  osc2.frequency.value = 164.5
  amp.gain.value = 0.0001
  osc.connect(amp)
  osc2.connect(amp)
  amp.connect(audio.destination)
  osc.start(now)
  osc2.start(now)
  amp.gain.linearRampToValueAtTime(0.018 * musicGain(), now + 0.6)
  musicNodes = { osc, osc2, amp }
  let step = 0
  const notes = [110, 123, 130, 146, 130, 123]
  musicTimer = setInterval(() => {
    if (!musicNodes || meta.settings?.music === false) {
      stopMusicInternal()
      return
    }
    const n = notes[step % notes.length]
    try {
      musicNodes.osc.frequency.setTargetAtTime(n, audio.currentTime, 0.05)
      musicNodes.osc2.frequency.setTargetAtTime(n * 1.5, audio.currentTime, 0.05)
      musicNodes.amp.gain.setTargetAtTime(0.016 * musicGain(), audio.currentTime, 0.08)
    } catch {
      /* ignore */
    }
    step += 1
  }, 480)
}

export function stopMusic() {
  stopMusicInternal()
}

export function setMusicEnabled(on) {
  if (on) startMusic()
  else stopMusic()
}
