/** Central tunables for NEON RUSH 3D. Adjust here; gameplay reads these at runtime. */
export const CONFIG = {
  lanes: [-2.2, 0, 2.2],
  jumpTime: 0.58,
  slideTime: 0.64,
  jumpHeight: 1.72,

  speed: {
    base: 16.5,
    max: 38,
    /** speed = base + distance * ramp, capped (distance is meters) */
    ramp: 0.02,
    menu: 10,
  },

  biome: {
    /** First theme change at this distance; later changes use randomGap */
    firstChangeAt: 400,
    randomGapMin: 300,
    randomGapMax: 700,
    blendSeconds: 2.6,
    /** @deprecated kept for debugBiome stepping */
    distanceStep: 400,
    order: [
      'neon',
      'desert',
      'snow',
      'jungle',
      'sky',
      'coast',
      'sunset',
      'countryside',
      'rain',
      'temple',
    ],
  },

  traffic: {
    approachSpeed: 10,
    maxApproach: 22,
    pool: 14,
    warnZ: 48,
  },

  train: {
    approachSpeed: 16,
    maxApproach: 28,
    pool: 4,
    /** Oncoming / hazard trains */
    length: 28,
    /**
     * Rideable trains: long enough that train-jump VO (~5s) finishes while you're on the roof.
     * Relative close speed is tuned so roof run lasts ~rideSeconds.
     */
    rideLength: 62,
    rideRelativeSpeed: 11,
    /** Feet height on coach roof (matches Traffic carriage roof). */
    roofY: 2.35,
    /** Start soft pull toward roof once jump clears this height. */
    boardAssistY: 1.05,
    /** Lock onto roof when within this of roofY. */
    boardSnapDist: 0.28,
    /** How hard the jump is pulled onto the roof (higher = snappier board). */
    boardPull: 9.5,
    /** Extra jump height available while already on the roof. */
    roofJumpHeight: 1.25,
    /** Gravity when falling off the end / side of a train. */
    fallGravity: 26,
    /** Seconds of roof run before the train slips away. */
    rideSeconds: 7.2,
    /** Subtle coach rumble while running on top. */
    roofBob: 0.045,
    warnZ: 78,
  },

  spawn: {
    seed: 1337,
    powerupEveryChunks: 6,
    aerialTrailEvery: 1,
    chunkBase: 16,
  },

  magnet: {
    duration: 15,
    /** Attract all active coins ahead/behind within this Z window */
    zRange: 42,
    pull: 28,
    collectDist: 1.15,
  },

  jetpack: {
    duration: 8,
    height: 3.15,
    riseSpeed: 3.2,
    fallSpeed: 2.6,
  },

  shield: {
    /** Charge-based (1 hit). Optional soft timer; 0 = until consumed */
    duration: 0,
    immunity: 1.5,
  },
  multiplier: { duration: 15, factor: 2 },
  hoverboard: { duration: 10 },

  camera: {
    /** Short punch — long slow-mo made the run feel laggy on phones. */
    nearMissSlowmo: 0.18,
    nearMissTimeScale: 0.78,
    landShake: 0.16,
    runBob: 0.01,
    runSway: 0.012,
    fovBase: 52,
    fovSpeedGain: 0.28,
    fovMaxAdd: 7,
  },

  mystery: {
    /** Spawn a mystery crate every N chunks (approx). */
    everyChunks: 7,
    pool: 6,
  },

  chase: {
    intro: 2.4,
    recoverPerSecond: 0.042,
    stumbleGain: 0.34,
    catchThreshold: 0.92,
    /** Near-miss: temporary tension spike (never enough alone to catch). */
    nearMissGain: 0.12,
    nearMissBoostTime: 4,
    nearMissBonus: 25,
    nearMissLaneMargin: 1.45,
    nearMissRecover: 0.05,
    jetpackSafe: 0.12,
    /**
     * Distance behind player (world |Z|). Camera sits near -8.2 looking at the runner at 0.
     * Keep these in ~3.2–5.0 so the dog stays BETWEEN camera and player on screen.
     */
    gapFar: 3.4,
    gapNear: 2.55,
    gapCatch: 1.85,
    gapLerp: 4.2,
    /** Cinematic arrest length (seconds) */
    catchDuration: 5,
    catchSlowmo: 0.22,
    barkInterval: 1.8,
    barkCloseInterval: 0.95,
    shoutInterval: 4.2,
    pawInterval: 0.22,
    footInterval: 0.28,
    dialogueCooldown: 12,
  },

  pools: {
    obstacles: 22,
    coins: 96,
    bursts: 10,
    powerups: 10,
    vehicles: 14,
    trains: 4,
    mystery: 6,
  },

  hudSync: 0.1,
  maxDelta: 0.05,
}

export const BIOME_META = {
  neon: {
    id: 'neon',
    name: 'Bright Neon City',
    fog: '#cfe8ff',
    fogNear: 38,
    fogFar: 95,
    bg: '#87ceeb',
    hemiSky: '#ffffff',
    hemiGround: '#9ae6b4',
    sun: '#fff7ed',
    fill: '#93c5fd',
    road: '#4b5563',
    curbA: '#f472b6',
    curbB: '#38bdf8',
    accent: ['#38bdf8', '#f472b6', '#fbbf24', '#34d399'],
    body: ['#fda4af', '#93c5fd', '#fde68a', '#a7f3d0'],
    particles: 'none',
  },
  desert: {
    id: 'desert',
    name: 'Sunny Desert Highway',
    fog: '#fde68a',
    fogNear: 42,
    fogFar: 100,
    bg: '#7dd3fc',
    hemiSky: '#fff7ed',
    hemiGround: '#f59e0b',
    sun: '#fef08a',
    fill: '#fdba74',
    road: '#78716c',
    curbA: '#f59e0b',
    curbB: '#fde68a',
    accent: ['#f59e0b', '#fb923c', '#fde68a', '#ea580c'],
    body: ['#d6a26a', '#c08457', '#e7c39a', '#a16207'],
    particles: 'dust',
  },
  snow: {
    id: 'snow',
    name: 'Snow Mountain City',
    fog: '#e0f2fe',
    fogNear: 36,
    fogFar: 90,
    bg: '#bae6fd',
    hemiSky: '#ffffff',
    hemiGround: '#e2e8f0',
    sun: '#ffffff',
    fill: '#7dd3fc',
    road: '#64748b',
    curbA: '#e2e8f0',
    curbB: '#38bdf8',
    accent: ['#38bdf8', '#e2e8f0', '#7dd3fc', '#a5f3fc'],
    body: ['#f8fafc', '#e2e8f0', '#cbd5e1', '#bae6fd'],
    particles: 'snow',
  },
  jungle: {
    id: 'jungle',
    name: 'Tropical Jungle',
    fog: '#bbf7d0',
    fogNear: 34,
    fogFar: 88,
    bg: '#7dd3fc',
    hemiSky: '#ecfccb',
    hemiGround: '#4ade80',
    sun: '#fef9c3',
    fill: '#86efac',
    road: '#57534e',
    curbA: '#84cc16',
    curbB: '#22c55e',
    accent: ['#22c55e', '#a3e635', '#facc15', '#4ade80'],
    body: ['#166534', '#15803d', '#4d7c0f', '#65a30d'],
    particles: 'leaves',
  },
  sky: {
    id: 'sky',
    name: 'Futuristic Sky City',
    fog: '#dbeafe',
    fogNear: 40,
    fogFar: 98,
    bg: '#93c5fd',
    hemiSky: '#eff6ff',
    hemiGround: '#c4b5fd',
    sun: '#ffffff',
    fill: '#a5b4fc',
    road: '#6366f1',
    curbA: '#c4b5fd',
    curbB: '#67e8f9',
    accent: ['#818cf8', '#67e8f9', '#f0abfc', '#a78bfa'],
    body: ['#e0e7ff', '#c7d2fe', '#ddd6fe', '#bae6fd'],
    particles: 'sparks',
  },
  coast: {
    id: 'coast',
    name: 'Coastal Beach Highway',
    fog: '#a5f3fc',
    fogNear: 40,
    fogFar: 100,
    bg: '#38bdf8',
    hemiSky: '#e0f2fe',
    hemiGround: '#fde68a',
    sun: '#fef9c3',
    fill: '#67e8f9',
    road: '#57534e',
    curbA: '#fbbf24',
    curbB: '#22d3ee',
    accent: ['#38bdf8', '#fbbf24', '#67e8f9', '#f472b6'],
    body: ['#fef3c7', '#67e8f9', '#fdba74', '#a5f3fc'],
    particles: 'none',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Cyberpunk City',
    fog: '#fecdd3',
    fogNear: 36,
    fogFar: 92,
    bg: '#fb7185',
    hemiSky: '#fda4af',
    hemiGround: '#7c3aed',
    sun: '#fb923c',
    fill: '#e879f9',
    road: '#3f3f46',
    curbA: '#f472b6',
    curbB: '#a855f7',
    accent: ['#f472b6', '#fb923c', '#c084fc', '#22d3ee'],
    body: ['#be185d', '#7c3aed', '#ea580c', '#312e81'],
    particles: 'embers',
  },
  countryside: {
    id: 'countryside',
    name: 'Green Countryside',
    fog: '#d9f99d',
    fogNear: 42,
    fogFar: 105,
    bg: '#86efac',
    hemiSky: '#ecfccb',
    hemiGround: '#4d7c0f',
    sun: '#fef08a',
    fill: '#a3e635',
    road: '#57534e',
    curbA: '#65a30d',
    curbB: '#facc15',
    accent: ['#84cc16', '#facc15', '#22c55e', '#a3e635'],
    body: ['#3f6212', '#4d7c0f', '#a16207', '#65a30d'],
    particles: 'none',
  },
  rain: {
    id: 'rain',
    name: 'Rainy Modern City',
    fog: '#94a3b8',
    fogNear: 30,
    fogFar: 80,
    bg: '#64748b',
    hemiSky: '#cbd5e1',
    hemiGround: '#334155',
    sun: '#e2e8f0',
    fill: '#38bdf8',
    road: '#1e293b',
    curbA: '#38bdf8',
    curbB: '#94a3b8',
    accent: ['#38bdf8', '#64748b', '#e2e8f0', '#0ea5e9'],
    body: ['#334155', '#475569', '#0f172a', '#1e3a8a'],
    particles: 'rain',
  },
  temple: {
    id: 'temple',
    name: 'Golden Temple Ruins',
    fog: '#fde68a',
    fogNear: 38,
    fogFar: 96,
    bg: '#fbbf24',
    hemiSky: '#fef3c7',
    hemiGround: '#b45309',
    sun: '#fde047',
    fill: '#fdba74',
    road: '#78716c',
    curbA: '#f59e0b',
    curbB: '#a16207',
    accent: ['#fbbf24', '#d97706', '#fde68a', '#92400e'],
    body: ['#a16207', '#b45309', '#78350f', '#ca8a04'],
    particles: 'dust',
  },
}

export function difficultyTier(distance) {
  if (distance < 100) return 0
  if (distance < 300) return 1
  if (distance < 600) return 2
  return 3
}
