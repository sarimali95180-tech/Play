/** Mobile / graphics quality + runtime performance helpers for NEON RUSH 3D. */

export const GRAPHICS = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  auto: 'auto',
}

const quality = {
  preset: 'auto',
  effective: 'medium',
  dpr: 1,
  mobile: false,
  particles: 1,
  drawDistance: 140,
  showNeonSigns: true,
  showFarBuildings: true,
  liteCity: false,
  boardParticles: 28,
  coinUpdateStride: 1,
  vehiclePool: 14,
  trainCars: 14,
  mysteryLights: true,
  runnerLight: true,
  dogGlb: true,
}

let autoHold = 0
let autoLowMs = 0
let autoHighMs = 0
let lastSwitch = 0

export function isMobileClient() {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 820
  const touch = navigator.maxTouchPoints > 1
  return coarse || (narrow && touch)
}

export function preferLowPower() {
  if (typeof navigator === 'undefined') return false
  const mem = navigator.deviceMemory
  const cores = navigator.hardwareConcurrency
  if (typeof mem === 'number' && mem > 0 && mem <= 4) return true
  if (typeof cores === 'number' && cores > 0 && cores <= 4) return true
  return isMobileClient()
}

export function resolveGraphicsDefault() {
  if (preferLowPower() || isMobileClient()) return GRAPHICS.auto
  return GRAPHICS.medium
}

/** Cap pixel ratio for a given preset. */
export function resolveDprCap(graphics = 'auto') {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const mobile = isMobileClient()
  const lowPower = preferLowPower()
  const tier = graphics === 'auto' ? (mobile || lowPower ? 'low' : 'medium') : graphics
  if (tier === 'low') return Math.min(dpr, mobile ? 0.85 : 1)
  if (tier === 'medium') return Math.min(dpr, mobile ? 1.1 : 1.35)
  return Math.min(dpr, mobile ? 1.35 : 1.75)
}

function applyTier(tier, mobile) {
  quality.effective = tier
  quality.mobile = mobile
  quality.dpr = resolveDprCap(tier)
  if (tier === 'low') {
    quality.particles = 0.35
    quality.drawDistance = 78
    quality.showNeonSigns = false
    quality.showFarBuildings = !mobile
    quality.liteCity = true
    quality.boardParticles = 8
    quality.coinUpdateStride = 2
    quality.vehiclePool = mobile ? 8 : 10
    quality.trainCars = 5
    quality.mysteryLights = false
    quality.runnerLight = false
    quality.dogGlb = !mobile
  } else if (tier === 'medium') {
    quality.particles = 0.65
    quality.drawDistance = 100
    quality.showNeonSigns = !mobile
    quality.showFarBuildings = true
    quality.liteCity = mobile
    quality.boardParticles = mobile ? 12 : 18
    quality.coinUpdateStride = 1
    quality.vehiclePool = mobile ? 10 : 14
    quality.trainCars = mobile ? 6 : 10
    quality.mysteryLights = !mobile
    quality.runnerLight = !mobile
    quality.dogGlb = true
  } else {
    quality.particles = 1
    quality.drawDistance = 140
    quality.showNeonSigns = true
    quality.showFarBuildings = true
    quality.liteCity = false
    quality.boardParticles = 28
    quality.coinUpdateStride = 1
    quality.vehiclePool = 14
    quality.trainCars = 14
    quality.mysteryLights = true
    quality.runnerLight = true
    quality.dogGlb = true
  }
}

/** Initialize / refresh quality from settings + device. */
export function initQuality(graphicsSetting = 'auto') {
  const mobile = isMobileClient()
  quality.preset = graphicsSetting || 'auto'
  autoHold = 0
  autoLowMs = 0
  autoHighMs = 0
  lastSwitch = performance.now()
  if (quality.preset === 'auto') {
    applyTier(mobile || preferLowPower() ? 'low' : 'medium', mobile)
  } else {
    applyTier(quality.preset, mobile)
  }
  return getQuality()
}

export function getQuality() {
  return quality
}

/**
 * AUTO adapter — call from the render loop with rolling FPS.
 * Hysteresis avoids rapid preset thrash.
 */
export function tickAutoQuality(fps, setDpr) {
  if (quality.preset !== 'auto') return quality.effective
  const now = performance.now()
  if (now - lastSwitch < 2800) return quality.effective

  if (fps > 0 && fps < 28) {
    autoLowMs += 16
    autoHighMs = 0
  } else if (fps > 52) {
    autoHighMs += 16
    autoLowMs = 0
  } else {
    autoLowMs = Math.max(0, autoLowMs - 8)
    autoHighMs = Math.max(0, autoHighMs - 8)
  }

  const mobile = quality.mobile
  let next = quality.effective
  if (autoLowMs > 900) {
    next = quality.effective === 'high' ? 'medium' : 'low'
    autoLowMs = 0
  } else if (autoHighMs > 2400 && quality.effective === 'low') {
    next = 'medium'
    autoHighMs = 0
  } else if (autoHighMs > 3200 && quality.effective === 'medium' && !mobile) {
    next = 'high'
    autoHighMs = 0
  }

  if (next !== quality.effective) {
    applyTier(next, mobile)
    lastSwitch = now
    if (typeof setDpr === 'function') setDpr(quality.dpr)
  }
  return quality.effective
}

/** Rolling FPS / frame-time stats for the overlay. */
export function createFrameStats() {
  const samples = new Float32Array(120)
  let i = 0
  let filled = 0
  let last = performance.now()
  return {
    sample() {
      const now = performance.now()
      const dt = Math.max(0.001, now - last)
      last = now
      samples[i] = dt
      i = (i + 1) % samples.length
      if (filled < samples.length) filled += 1
      return dt
    },
    snapshot() {
      if (!filled) return { fps: 0, avgMs: 0, low1: 0 }
      let sum = 0
      const slice = []
      for (let n = 0; n < filled; n += 1) {
        const v = samples[n]
        sum += v
        slice.push(v)
      }
      slice.sort((a, b) => b - a)
      const worst = slice[Math.max(0, Math.floor(slice.length * 0.01))] || slice[0]
      const avgMs = sum / filled
      return {
        fps: 1000 / avgMs,
        avgMs,
        low1: 1000 / worst,
      }
    },
  }
}

// Boot defaults so early imports of getQuality() are safe
if (typeof window !== 'undefined') {
  initQuality('auto')
}
