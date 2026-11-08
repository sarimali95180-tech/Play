import {
  playChaseCatch,
  playCoin,
  playCombo,
  playCount,
  playCrash,
  playDogBark,
  playDogPaw,
  playFootstep,
  playGo,
  playJump,
  playNearMiss,
  playOfficerShout,
  playPower,
  playShieldBreak,
  playSlide,
  playTrainWarn,
  playWhoosh,
  setChaseTensionAudio,
  stopChaseTensionAudio,
  unlockAudio,
} from './audio.js'
import { BIOME_META, CONFIG, difficultyTier } from './config.js'
import {
  getSubtitle,
  maybePlayExtraLine,
  muteAll,
  playArrestFinale,
  playDogBark as playDogBarkFile,
  playPoliceLine,
  preloadAudio,
  resetDialogue,
  setChasePresence,
  setVoiceRunDistance,
  stopDialogue,
  stopDogBark,
  tickSubtitle,
  unlockDialogue,
} from './dialogue.js'
import {
  bumpDaily,
  bumpWeekly,
  grantMysteryReward,
  isEndlessMode,
  markWorldSeen,
  meta,
  PLAY_MODES,
  setDailyMax,
} from './meta.js'
import { getQuality } from './perf.js'
import { persistMute, useGameStore } from './store.js'

/** Carriage spacing — must match Traffic.jsx TrainSlot layout. */
const TRAIN_CAR_STEP = 5.4

function maxVisibleTrainCars() {
  return Math.max(4, Math.min(14, getQuality().trainCars || 8))
}

/** Collision / ride length from the cars that are actually drawn. */
function trainLengthFromCars(cars) {
  return Math.max(1, cars) * TRAIN_CAR_STEP
}

export const LANES = CONFIG.lanes
export const OBSTACLE_POOL = CONFIG.pools.obstacles
export const COIN_POOL = CONFIG.pools.coins
export const BURST_POOL = CONFIG.pools.bursts
export const POWERUP_POOL = CONFIG.pools.powerups
export const VEHICLE_POOL = CONFIG.pools.vehicles
export const TRAIN_POOL = CONFIG.pools.trains
export const MYSTERY_POOL = CONFIG.pools.mystery

const JUMP_TIME = CONFIG.jumpTime
const SLIDE_TIME = CONFIG.slideTime
const JUMP_HEIGHT = CONFIG.jumpHeight

function makePool(count, extra) {
  return Array.from({ length: count }, (_, id) => ({ id, active: false, ...extra() }))
}

function freshPowers() {
  return {
    magnet: 0,
    jetpack: 0,
    shield: 0,
    multiplier: 0,
    hoverboard: 0,
  }
}

function freshPlayer() {
  return {
    lane: 1,
    x: 0,
    y: 0,
    fly: 0,
    jump: -1,
    slide: -1,
    lean: 0,
    laneCd: 0,
    squash: 0,
    stumble: 0,
    onRoof: false,
    roofTrain: -1,
    /** Falling from train roof back to road (gravity, not teleport). */
    fallingFromRoof: false,
    roofFallVy: 0,
    immunity: 0,
  }
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const world = {
  status: 'menu',
  player: freshPlayer(),
  distance: 0,
  elapsed: 0,
  speed: CONFIG.speed.base,
  score: 0,
  coinsCollected: 0,
  combo: 0,
  maxCombo: 0,
  coinMultiplier: 1,
  scoreMultiplier: 1,
  bonusScore: 0,
  toast: '',
  toastLife: 0,
  countdown: 0,
  spawnZ: 28,
  chunksSpawned: 0,
  hudAcc: 0,
  hitFlash: 0,
  input: { lane: 0, jump: false, slide: false },
  powers: freshPowers(),
  biomeIndex: 0,
  biomeId: 'neon',
  biomeName: BIOME_META.neon.name,
  biomeBlend: 1,
  biomeBanner: 0,
  lastBiomeMilestone: 0,
  trainWarn: 0,
  visual: { ...BIOME_META.neon },
  chase: {
    tension: 0.18,
    intro: 0,
    state: 'far',
    gap: CONFIG.chase.gapFar,
    catchTimer: 0,
    catchPhase: 0,
    catchPlayed: false,
    catchReason: '',
    nearMissBoost: 0,
    arrestHold: 0,
    audioAcc: { bark: 0, shout: 0, paw: 0, foot: 0 },
    lastVoicedState: 'far',
  },
  subtitle: '',
  rng: mulberry32(CONFIG.spawn.seed),
  muted: false,
  runStats: { jumps: 0, slides: 0, dodges: 0, magnets: 0, jetpacks: 0, powerups: 0 },
  obstacles: makePool(OBSTACLE_POOL, () => ({ type: 'barrier', lane: 1, z: 40, cleared: false })),
  coins: makePool(COIN_POOL, () => ({ lane: 1, z: 40, y: 1, x: 0, spin: 0, aerial: false, attracted: false })),
  shieldBreak: 0,
  /** Key-0 permanent shield. Collected shields are one-hit only. */
  godShield: false,
  playMode: PLAY_MODES.normal,
  /** Random world scheduler */
  nextBiomeAt: 400,
  biomePrevId: '',
  runWorlds: [],
  runNearMisses: 0,
  shieldImpactCd: 0,
  /** Gameplay time scale (1 = normal). Near-miss dips briefly for cinematic punch. */
  timeScale: 1,
  slowmoLeft: 0,
  landShake: 0,
  prevJump: -1,
  bursts: makePool(BURST_POOL, () => ({ x: 0, y: 1, z: 0, life: 0 })),
  powerups: makePool(POWERUP_POOL, () => ({ type: 'magnet', lane: 1, z: 40, y: 1.2 })),
  mystery: makePool(MYSTERY_POOL, () => ({ lane: 1, z: 40, y: 1.15, spin: 0 })),
  vehicles: makePool(VEHICLE_POOL, () => ({
    kind: 'car',
    lane: 1,
    z: 50,
    speed: 10,
    length: 2.4,
    cleared: false,
  })),
  trains: makePool(TRAIN_POOL, () => ({
    lane: 1,
    z: 80,
    speed: 16,
    length: CONFIG.train.length,
    oncoming: true,
    rideable: false,
    cars: 3,
    cleared: false,
    warned: false,
  })),
}

function markInput() {
  if (useGameStore.getState().hint) useGameStore.getState().dismissHint()
}

export function queueLane(dir) {
  if (world.status !== 'playing') return
  world.input.lane = Math.max(-2, Math.min(2, world.input.lane + dir))
  markInput()
}

export function queueJump() {
  if (world.status !== 'playing') return
  if (world.powers.jetpack > 0) return
  world.input.jump = true
  world.input.slide = false
  world.runStats.jumps += 1
  bumpDaily('jumps', 1)
  bumpWeekly('weekJumps', 1)
  markInput()
}

export function queueSlide() {
  if (world.status !== 'playing') return
  if (world.powers.jetpack > 0) return
  world.input.slide = true
  world.runStats.slides += 1
  bumpDaily('slides', 1)
  markInput()
}

export function toggleMute() {
  world.muted = !world.muted
  muteAll(world.muted)
  persistMute(world.muted)
  useGameStore.getState().sync({ muted: world.muted })
}

export function debugGrant(type) {
  if (!import.meta.env.DEV) return
  activatePower(type)
}

/** Toggle permanent shield (survives every obstacle / train / car). Press 0. */
export function debugToggleGodShield(force) {
  world.godShield = typeof force === 'boolean' ? force : !world.godShield
  if (world.godShield) {
    world.powers.shield = 1
    world.player.immunity = Math.max(world.player.immunity, 0.2)
    setToast('God Shield ON')
  } else {
    world.powers.shield = 0
    setToast('God Shield OFF')
  }
  syncHud(0, true)
  useGameStore.getState().sync({
    powers: { ...world.powers },
    endlessShield: world.godShield,
    toast: world.toast,
  })
}

export function debugBiome(step = 1) {
  if (!import.meta.env.DEV) return
  const next = Math.max(0, world.biomeIndex + step)
  applyBiome(next, true)
  world.lastBiomeMilestone = next
  world.distance = Math.max(world.distance, next * CONFIG.biome.distanceStep + 1)
}

export function debugAddDistance(meters = 100) {
  if (!import.meta.env.DEV) return
  world.distance += meters
  syncHud(0, true)
}

export function debugSpawnVehicle(kind = 'car') {
  if (!import.meta.env.DEV) return
  const free = (world.player.lane + 1) % 3
  dropVehicle(kind, free, 42, true)
}

export function debugSpawnTrain() {
  if (!import.meta.env.DEV) return
  const free = (world.player.lane + 1) % 3
  dropTrain(free, 70, true, false)
}

export function debugBoostSpeed() {
  if (!import.meta.env.DEV) return
  world.distance += 80
  syncHud(0, true)
}

export function debugResetDifficulty() {
  if (!import.meta.env.DEV) return
  world.distance = Math.min(world.distance, 40)
  world.lastBiomeMilestone = 0
  applyBiome(0, true)
  syncHud(0, true)
}

export function debugSpawnObstacle(type = 'barrier') {
  if (!import.meta.env.DEV) return
  dropObstacle(type, world.player.lane, 14)
}

export function debugSpawnCoins(count = 12) {
  if (!import.meta.env.DEV) return
  for (let i = 0; i < count; i += 1) {
    dropCoin(i % 3, 10 + i * 1.8, 1.05 + (i % 3) * 0.15)
  }
}

export function debugTriggerChase() {
  if (!import.meta.env.DEV) return
  world.chase.tension = Math.min(0.85, world.chase.tension + 0.35)
  world.chase.state = chaseStateFromTension(world.chase.tension)
  setToast('Dog closing in!')
  syncHud(0, true)
}

export function debugResetChase() {
  if (!import.meta.env.DEV) return
  world.chase.tension = 0.18
  world.chase.state = 'far'
  world.chase.intro = 0
  world.chase.gap = CONFIG.chase.gapFar
  world.chase.catchTimer = 0
  world.chase.catchPhase = 0
  world.chase.catchPlayed = false
  world.chase.catchReason = ''
  world.chase.nearMissBoost = 0
  world.chase.arrestHold = 0
  if (world.status === 'catching') world.status = 'playing'
  stopChaseTensionAudio()
  resetDialogue()
  syncHud(0, true)
}

export function debugPoliceDialogue(key = 'chase') {
  if (!import.meta.env.DEV) return
  unlockDialogue()
  playPoliceLine(key, { force: true })
  syncHud(0, true)
}

export function debugDogBark() {
  if (!import.meta.env.DEV) return
  unlockDialogue()
  if (!playDogBarkFile(world.chase.state === 'close' ? 'close' : 'angry')) {
    playDogBark(world.chase.state === 'close' ? 0.9 : 0.5)
  }
}

export function debugNearMiss() {
  if (!import.meta.env.DEV) return
  triggerNearMissEvent({ sameLane: false })
  syncHud(0, true)
}

export function debugArrest(reason = 'caught') {
  if (!import.meta.env.DEV) return
  world.chase.catchPlayed = false
  beginArrestSequence(reason)
}

function freeSlot(list) {
  for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i]
  return null
}

function setToast(text, life = 0.95) {
  world.toast = text
  world.toastLife = life
}

function dropObstacle(type, lane, z) {
  if (spawnBlockedByTrain(z, lane, 8)) return
  const slot = freeSlot(world.obstacles)
  if (!slot) return
  slot.active = true
  slot.type = type
  slot.lane = lane
  slot.z = z
  slot.cleared = false
}

function dropCoin(lane, z, y, aerial = false) {
  const slot = freeSlot(world.coins)
  if (!slot) return
  slot.active = true
  slot.lane = lane
  slot.z = z
  slot.y = y
  slot.x = LANES[lane]
  slot.spin = world.rng() * Math.PI
  slot.aerial = aerial
  slot.attracted = false
}

function dropPower(type, lane, z) {
  const slot = freeSlot(world.powerups)
  if (!slot) return
  slot.active = true
  slot.type = type
  slot.lane = lane
  slot.z = z
  slot.y = type === 'jetpack' ? 1.35 : 1.2
}

function dropMystery(lane, z) {
  if (spawnBlockedByTrain(z, lane, 8)) return
  const slot = freeSlot(world.mystery)
  if (!slot) return
  slot.active = true
  slot.lane = lane
  slot.z = z
  slot.y = 1.15
  slot.spin = world.rng() * Math.PI
}

const VEHICLE_KINDS = ['car', 'taxi', 'bus', 'truck', 'police']
const VEHICLE_LEN = { car: 2.2, taxi: 2.3, bus: 4.2, truck: 3.6, police: 2.4 }

function dropVehicle(kind, lane, z, oncoming = true) {
  // Never spawn cars/buses inside an active train volume
  if (spawnBlockedByTrain(z, lane, 12)) return null
  const slot = freeSlot(world.vehicles)
  if (!slot) return null
  const tier = difficultyTier(world.distance)
  const approach =
    CONFIG.traffic.approachSpeed + tier * 2.5 + world.rng() * 3
  slot.active = true
  slot.kind = kind
  slot.lane = lane
  slot.z = z
  slot.speed = Math.min(CONFIG.traffic.maxApproach, oncoming ? approach : 2 + world.rng() * 3)
  slot.length = VEHICLE_LEN[kind] || 2.4
  slot.oncoming = oncoming
  slot.cleared = false
  return slot
}

/** Wipe props that would sit inside a newly spawned train (same lane only). */
function clearPropsAroundTrain(z, length, lane) {
  const half = length * 0.5 + 4
  for (const o of world.obstacles) {
    if (!o.active) continue
    if (o.lane !== lane) continue
    if (Math.abs(o.z - z) > half) continue
    o.active = false
    o.cleared = true
  }
  for (const v of world.vehicles) {
    if (!v.active) continue
    if (v.lane !== lane) continue
    if (Math.abs(v.z - z) > half + (v.length || 2) * 0.5) continue
    v.active = false
    v.cleared = true
  }
}

function dropTrain(lane, z, oncoming = true, rideable = false) {
  const slot = freeSlot(world.trains)
  if (!slot) return null
  const tier = difficultyTier(world.distance)
  const canRide = rideable && !oncoming
  const maxCars = maxVisibleTrainCars()
  slot.active = true
  slot.lane = lane
  slot.z = z
  slot.oncoming = oncoming
  slot.rideable = canRide
  if (canRide) {
    // Length matches drawn carriages so you aren't arrested by empty track
    // behind / ahead of the visible train. Speed keeps a solid roof-run feel.
    slot.cars = Math.min(maxCars, Math.max(6, Math.round(CONFIG.train.rideLength / TRAIN_CAR_STEP)))
    slot.length = trainLengthFromCars(slot.cars)
    const rideSeconds = CONFIG.train.rideSeconds || 7.2
    const rel = Math.max(7.5, slot.length / rideSeconds)
    slot.speed = Math.max(2, world.speed - rel)
  } else {
    slot.speed = oncoming
      ? Math.min(CONFIG.train.maxApproach, CONFIG.train.approachSpeed + tier * 2)
      : 1.5
    slot.cars = Math.min(maxCars, 4 + (tier > 1 ? 1 : 0))
    slot.length = trainLengthFromCars(slot.cars)
  }
  slot.cleared = false
  slot.warned = false
  clearPropsAroundTrain(slot.z, slot.length, slot.lane)
  return slot
}

function pickVehicleKind() {
  const roll = world.rng()
  if (roll < 0.28) return 'car'
  if (roll < 0.48) return 'taxi'
  if (roll < 0.66) return 'police'
  if (roll < 0.84) return 'truck'
  return 'bus'
}

function coinRun(lane, z, count, y, aerial = false) {
  for (let i = 0; i < count; i += 1) dropCoin(lane, z + i * 2.15, y, aerial)
}

function pickPowerType() {
  const roll = world.rng()
  if (roll < 0.22) return 'magnet'
  if (roll < 0.4) return 'jetpack'
  if (roll < 0.58) return 'shield'
  if (roll < 0.78) return 'multiplier'
  return 'hoverboard'
}

function emitChunk(origin) {
  const n = world.chunksSpawned
  world.chunksSpawned += 1
  const tier = difficultyTier(world.distance)
  const lane = Math.floor(world.rng() * 3)
  const open = (lane + 1 + Math.floor(world.rng() * 2)) % 3
  const other = (0 + 1 + 2) - lane - open

  let kind = 'coins'
  if (n < 2) kind = 'coins'
  else if (n === 2) kind = 'barrier'
  else if (n === 3) kind = 'traffic'
  else if (n === 4) kind = 'overhead'
  else {
    const easy = ['coins', 'barrier', 'overhead', 'traffic', 'zigzag', 'coins']
    const mid = ['barrier', 'traffic', 'overhead', 'double-barrier', 'traffic', 'wall', 'zigzag', 'coins']
    const hard = ['traffic', 'double-barrier', 'train', 'overhead', 'wall', 'traffic', 'double-wall', 'ride-train', 'zigzag']
    const elite = ['traffic', 'train', 'double-barrier', 'traffic', 'wall', 'all-overhead', 'ride-train', 'double-wall', 'traffic']
    const table = tier === 0 ? easy : tier === 1 ? mid : tier === 2 ? hard : elite
    kind = table[n % table.length]
    if (world.powers.jetpack > 1.5 && n % 4 === 0) kind = 'aerial'
    // Trains only after early stretch and not every chunk
    if ((kind === 'train' || kind === 'ride-train') && (n < 8 || n % 3 !== 0)) kind = 'traffic'
  }

  // Always leave at least one safe lane / maneuver option.
  if (kind === 'barrier') {
    dropObstacle('barrier', lane, origin + 4)
    coinRun(open, origin, 4, 1.02)
    dropCoin(lane, origin + 4, 1.9)
  } else if (kind === 'overhead') {
    dropObstacle('overhead', lane, origin + 4)
    coinRun(open, origin, 4, 1.02)
  } else if (kind === 'wall') {
    dropObstacle('wall', lane, origin + 5)
    coinRun(open, origin, 5, 1.02)
  } else if (kind === 'double-barrier') {
    dropObstacle('barrier', lane, origin + 4)
    dropObstacle('barrier', other, origin + 4)
    coinRun(open, origin, 4, 1.02)
    dropCoin(lane, origin + 4, 1.9)
  } else if (kind === 'all-overhead') {
    dropObstacle('overhead', 0, origin + 4)
    dropObstacle('overhead', 1, origin + 4)
    dropObstacle('overhead', 2, origin + 4)
    coinRun(1, origin + 10, 4, 1.02)
  } else if (kind === 'zigzag') {
    for (let i = 0; i < 6; i += 1) {
      dropCoin((lane + i) % 3, origin + i * 2.25, i % 2 === 0 ? 1.02 : 1.35)
    }
  } else if (kind === 'double-wall') {
    dropObstacle('wall', lane, origin + 5)
    dropObstacle('wall', other, origin + 5)
    coinRun(open, origin, 4, 1.02)
  } else if (kind === 'traffic') {
    // Push traffic Z past any live train so cars never pop out of coaches
    const placeCar = (vKind, carLane, baseZ) => {
      let z = baseZ
      for (let attempt = 0; attempt < 6; attempt += 1) {
        if (!spawnBlockedByTrain(z, carLane, 14)) {
          dropVehicle(vKind, carLane, z, true)
          return
        }
        z += 16 + world.rng() * 10
      }
    }
    placeCar(pickVehicleKind(), lane, origin + 18 + world.rng() * 8)
    if (tier >= 1 && world.rng() > 0.45) {
      placeCar(pickVehicleKind(), other, origin + 28 + world.rng() * 10)
    }
    if (tier >= 2 && world.rng() > 0.65) {
      placeCar('car', open, origin + 40)
    }
    coinRun(open, origin, 5, 1.02)
  } else if (kind === 'train') {
    dropTrain(lane, origin + 36, true, false)
    coinRun(open, origin, 5, 1.02)
    coinRun(open, origin + 8, 3, 1.4)
  } else if (kind === 'ride-train') {
    dropTrain(lane, origin + 22, false, true)
    for (let i = 0; i < 5; i += 1) dropCoin(lane, origin + 10 + i * 2.4, CONFIG.train.roofY + 0.55, true)
    coinRun(open, origin, 4, 1.02)
  } else if (kind === 'aerial') {
    coinRun(1, origin, 6, CONFIG.jetpack.height, true)
    coinRun(0, origin + 1, 3, CONFIG.jetpack.height, true)
  } else {
    coinRun(1, origin, 5, 1.02)
    coinRun(lane, origin + 0.6, 3, 1.02)
  }

  if (n > 4 && n % CONFIG.spawn.powerupEveryChunks === 0) {
    dropPower(pickPowerType(), open, origin + 12)
  }
  if (n > 6 && n % CONFIG.mystery.everyChunks === 0) {
    dropMystery(open, origin + 16)
  }

  const spacing = CONFIG.spawn.chunkBase + tier * 1.5
  if (kind === 'train') return spacing + 18
  // Extra gap after long rideable trains so next traffic never overlaps coaches
  if (kind === 'ride-train') return spacing + 42
  if (kind === 'traffic') return spacing + 4
  if (kind === 'double-wall' || kind === 'all-overhead') return spacing + 3
  return spacing
}

function refill() {
  let guard = 0
  while (world.spawnZ < 102 && guard < 14) {
    world.spawnZ += emitChunk(world.spawnZ)
    guard += 1
  }
}

function lerpHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ar = (pa >> 16) & 255
  const ag = (pa >> 8) & 255
  const ab = pa & 255
  const br = (pb >> 16) & 255
  const bg = (pb >> 8) & 255
  const bb = pb & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`
}

function biomeRng() {
  // Controlled randomness from world.rng (seeded each run)
  return world.rng ? world.rng() : Math.random()
}

function randomBiomeGap() {
  const min = CONFIG.biome.randomGapMin
  const max = CONFIG.biome.randomGapMax
  return min + Math.floor(biomeRng() * (max - min + 1))
}

function pickNextBiomeId() {
  const order = CONFIG.biome.order
  const forbid = new Set([world.biomeId])
  // Avoid A↔B oscillation: don't immediately return to previous world
  if (world.biomePrevId) forbid.add(world.biomePrevId)
  const pool = order.filter((id) => !forbid.has(id))
  const list = pool.length ? pool : order.filter((id) => id !== world.biomeId)
  const pick = list[Math.floor(biomeRng() * list.length)] || order[0]
  return pick
}

function applyBiomeById(id, announce) {
  const def = BIOME_META[id] || BIOME_META.neon
  const changed = id !== world.biomeId
  if (changed) {
    world.biomePrevId = world.biomeId
    world.biomeBlend = 0
  }
  world.biomeId = def.id
  world.biomeName = def.name
  world.biomeIndex = Math.max(0, CONFIG.biome.order.indexOf(def.id))
  if (changed) {
    if (!world.runWorlds.includes(def.id)) world.runWorlds.push(def.id)
    markWorldSeen(def.id)
    setDailyMax('worlds', world.runWorlds.length)
  }
  if (announce && changed) {
    world.biomeBanner = 2.8
    world.toast = ''
    world.toastLife = 0
  }
}

function applyBiome(index, announce) {
  // Debug stepping still uses index into order
  const safe = Math.max(0, index | 0)
  const id = CONFIG.biome.order[safe % CONFIG.biome.order.length]
  applyBiomeById(id, announce)
  world.biomeIndex = safe
}

function advanceRandomBiome() {
  const nextId = pickNextBiomeId()
  applyBiomeById(nextId, true)
  world.lastBiomeMilestone += 1
  world.nextBiomeAt = world.distance + randomBiomeGap()
}

function updateBiomeVisual(delta) {
  const id = world.biomeId
  const target = BIOME_META[id]
  const t = Math.min(1, world.biomeBlend)
  const from = world.visual
  const blend = Math.min(1, t + 0.05)
  world.visual = {
    ...target,
    fog: lerpHex(from.fog || target.fog, target.fog, blend),
    bg: lerpHex(from.bg || target.bg, target.bg, blend),
    road: lerpHex(from.road || target.road, target.road, blend),
    curbA: lerpHex(from.curbA || target.curbA, target.curbA, blend),
    curbB: lerpHex(from.curbB || target.curbB, target.curbB, blend),
    hemiSky: lerpHex(from.hemiSky || target.hemiSky, target.hemiSky, blend),
    hemiGround: lerpHex(from.hemiGround || target.hemiGround, target.hemiGround, blend),
    sun: target.sun,
    fill: target.fill,
    fogNear: target.fogNear,
    fogFar: target.fogFar,
    accent: target.accent,
    body: target.body,
    name: target.name,
  }
  if (world.biomeBlend < 1) {
    world.biomeBlend = Math.min(1, world.biomeBlend + delta / CONFIG.biome.blendSeconds)
  }
  if (world.biomeBanner > 0) world.biomeBanner = Math.max(0, world.biomeBanner - delta)
  if (world.trainWarn > 0) world.trainWarn = Math.max(0, world.trainWarn - delta)

  // First change @ 400m, then random 300–700m gaps (never resets distance/powers)
  if (world.status === 'playing' && world.distance >= world.nextBiomeAt) {
    advanceRandomBiome()
  }
}

function activatePower(type) {
  world.runStats.powerups += 1
  bumpDaily('powerups', 1)
  if (type === 'magnet') {
    world.powers.magnet = CONFIG.magnet.duration
    world.runStats.magnets += 1
    bumpDaily('magnets', 1)
    // Real magnet VO replaces old synth beep
    playPoliceLine('magnet', { force: true })
    setToast('Coin Magnet')
  } else if (type === 'jetpack') {
    world.powers.jetpack = CONFIG.jetpack.duration
    world.runStats.jetpacks += 1
    bumpDaily('jetpacks', 1)
    world.player.jump = -1
    world.player.slide = -1
    for (const o of world.obstacles) {
      if (o.active && o.z > 8 && o.z < 28 && o.type === 'wall') o.active = false
    }
    coinRun(world.player.lane, 12, 5, CONFIG.jetpack.height, true)
    setToast('Jetpack')
    // Real jetpack VO replaces old synth beep
    playPoliceLine('jetpack', { force: true })
  } else if (type === 'shield') {
    world.powers.shield = 1
    // Real shield VO replaces old synth beep
    playPoliceLine('shield', { force: true })
    setToast(world.godShield ? 'God Shield' : 'Shield Ready')
  } else if (type === 'multiplier') {
    world.powers.multiplier = CONFIG.multiplier.duration
    world.scoreMultiplier = CONFIG.multiplier.factor
    if (!world.muted) playPower()
    setToast('x2 Score')
  } else if (type === 'hoverboard') {
    world.powers.hoverboard = CONFIG.hoverboard.duration
    if (!world.muted) playPower()
    setToast('Hoverboard')
  }
}

function clearPowers() {
  world.powers = freshPowers()
  world.scoreMultiplier = 1
  world.player.fly = 0
  world.player.immunity = 0
  world.shieldBreak = 0
  // Only permanent god shield (press 0) stays armed across restart
  if (hasGodShield()) world.powers.shield = 1
}

export function resetWorld() {
  world.status = 'countdown'
  world.player = freshPlayer()
  world.distance = 0
  world.elapsed = 0
  world.speed = CONFIG.speed.base
  world.score = 0
  world.coinsCollected = 0
  world.combo = 0
  world.maxCombo = 0
  world.coinMultiplier = 1
  world.scoreMultiplier = 1
  world.bonusScore = 0
  world.toast = ''
  world.toastLife = 0
  world.countdown = 3
  world.spawnZ = 26
  world.chunksSpawned = 0
  world.hudAcc = 0
  world.hitFlash = 0
  world.input.lane = 0
  world.input.jump = false
  world.input.slide = false
  world.rng = mulberry32(CONFIG.spawn.seed)
  clearPowers()
  applyBiome(0, false)
  world.visual = { ...BIOME_META.neon }
  world.biomeBlend = 1
  world.biomeBanner = 0
  world.lastBiomeMilestone = 0
  world.trainWarn = 0
  world.runStats = { jumps: 0, slides: 0, dodges: 0, magnets: 0, jetpacks: 0, powerups: 0 }
  world.chase = {
    tension: 0.2,
    intro: CONFIG.chase.intro,
    state: 'far',
    gap: CONFIG.chase.gapFar,
    catchTimer: 0,
    catchPhase: 0,
    catchPlayed: false,
    catchReason: '',
    nearMissBoost: 0,
    arrestHold: 0,
    audioAcc: { bark: 0, shout: 0, paw: 0, foot: 0 },
    lastVoicedState: 'far',
  }
  world.playMode = meta.playMode === PLAY_MODES.endless ? PLAY_MODES.endless : PLAY_MODES.normal
  world.nextBiomeAt = CONFIG.biome.firstChangeAt
  world.biomePrevId = ''
  world.runWorlds = ['neon']
  world.runNearMisses = 0
  world.shieldImpactCd = 0
  world.timeScale = 1
  world.slowmoLeft = 0
  world.landShake = 0
  world.prevJump = -1
  world.lastBiomeMilestone = 0
  world.subtitle = ''
  stopChaseTensionAudio()
  resetDialogue()
  world.muted = !useGameStore.getState().settings?.sfx
  if (useGameStore.getState().muted) world.muted = true
  for (const item of world.obstacles) {
    item.active = false
    item.cleared = false
  }
  for (const item of world.coins) item.active = false
  for (const item of world.bursts) item.active = false
  for (const item of world.powerups) item.active = false
  for (const item of world.mystery) item.active = false
  for (const item of world.vehicles) {
    item.active = false
    item.cleared = false
  }
  for (const item of world.trains) {
    item.active = false
    item.cleared = false
    item.warned = false
  }
  refill()
}

export function beginRun() {
  resetWorld()
  world.playMode = isEndlessMode() ? PLAY_MODES.endless : PLAY_MODES.normal
  // Shield only if god mode (0) — never auto-grant from endless / obstacles
  if (hasGodShield()) world.powers.shield = 1
  else world.powers.shield = 0
  markWorldSeen('neon')
  unlockAudio()
  unlockDialogue()
  void preloadAudio()
  resetDialogue()
  playCount()
  useGameStore.getState().begin()
  useGameStore.getState().sync({
    powers: { ...world.powers },
    playMode: world.playMode,
    endlessShield: hasGodShield(),
  })
}

export function pauseRun() {
  if (world.status !== 'playing') return
  world.status = 'paused'
  world.input.lane = 0
  world.input.jump = false
  world.input.slide = false
  stopChaseTensionAudio()
  stopDialogue()
  stopDogBark()
  useGameStore.getState().pause()
}

export function resumeRun() {
  if (world.status !== 'paused') return
  world.status = 'playing'
  useGameStore.getState().resume()
}

export function togglePause() {
  if (world.status === 'playing') pauseRun()
  else if (world.status === 'paused') resumeRun()
}

export function backToMenu() {
  silenceChaseAudio()
  clearPlayerHazards()
  world.status = 'menu'
  world.player = freshPlayer()
  world.hitFlash = 0
  world.input.lane = 0
  world.input.jump = false
  world.input.slide = false
  clearPowers()
  world.chase.intro = 0
  world.chase.tension = 0.2
  world.chase.state = 'far'
  for (const item of world.obstacles) item.active = false
  for (const item of world.coins) item.active = false
  for (const item of world.bursts) item.active = false
  for (const item of world.powerups) item.active = false
  for (const item of world.mystery) item.active = false
  for (const item of world.vehicles) item.active = false
  for (const item of world.trains) item.active = false
  useGameStore.getState().menu()
}

function crossed(z, dz, pad) {
  const previous = z + dz
  return Math.max(z, previous) >= -pad && Math.min(z, previous) <= pad
}

function sameLane(lane) {
  return Math.abs(world.player.x - LANES[lane]) < 0.78
}

function spawnBurst(x, y, z) {
  const slot = freeSlot(world.bursts)
  if (!slot) return
  slot.active = true
  slot.x = x
  slot.y = y
  slot.z = z
  slot.life = 0.32
}

function chaseStateFromTension(t) {
  if (t >= CONFIG.chase.catchThreshold) return 'caught'
  if (t >= 0.68) return 'close'
  if (t >= 0.38) return 'approaching'
  return 'far'
}

function targetChaseGap() {
  const c = CONFIG.chase
  if (world.chase.catchTimer > 0) {
    return THREE_LERP(c.gapNear, c.gapCatch, Math.min(1, world.chase.catchPhase * 1.4))
  }
  const flying = world.powers.jetpack > 0 || world.player.fly > 0.35
  const t = flying ? Math.min(world.chase.tension, c.jetpackSafe) : world.chase.tension
  return c.gapFar - t * (c.gapFar - c.gapNear)
}

function THREE_LERP(a, b, t) {
  return a + (b - a) * t
}

/** Stop chase bark loops / police chatter (arrest VO may start after this). */
function silenceChaseAudio() {
  stopDogBark()
  stopDialogue()
  stopChaseTensionAudio()
  setChasePresence(0)
}

function isTrainHazard(hazard) {
  if (!hazard) return false
  return typeof hazard.cars === 'number' || world.trains.includes(hazard)
}

/** Clear hazards around the player so crash/GO never leaves you wedged in geometry. */
function clearPlayerHazards() {
  // Clear ALL lanes near the runner — lane-only clear left people stuck in side objects
  for (const o of world.obstacles) {
    if (o.active && Math.abs(o.z) < 20) {
      o.active = false
      o.cleared = true
    }
  }
  for (const v of world.vehicles) {
    if (v.active && Math.abs(v.z) < 26) {
      v.active = false
      v.cleared = true
    }
  }
  for (const t of world.trains) {
    if (!t.active) continue
    const half = (t.length || CONFIG.train.length) * 0.55
    if (t.z + half > -16 && t.z - half < 20) {
      t.active = false
      t.cleared = true
    }
  }
  world.player.onRoof = false
  world.player.roofTrain = -1
  world.player.fallingFromRoof = false
  world.player.roofFallVy = 0
  world.player.y = 0
  world.player.fly = 0
  world.player.jump = -1
  world.player.slide = -1
  world.player.stumble = 0
  world.player.immunity = 1.2
  world.player.x = LANES[world.player.lane] ?? 0
  world.input.lane = 0
  world.input.jump = false
  world.input.slide = false
}

/** True if a spawn Z overlaps an active train on the same lane (not adjacent lanes). */
function spawnBlockedByTrain(z, lane = null, pad = 10) {
  for (const t of world.trains) {
    if (!t.active) continue
    const half = (t.length || CONFIG.train.length) * 0.5 + pad
    if (Math.abs(t.z - z) > half) continue
    // Same lane only — adjacent-lane blocking made cars/buses vanish mid-run
    if (lane == null || t.lane === lane) return true
  }
  return false
}

/** Player overlaps the solid train body (tight — no invisible padding beyond coaches). */
function overlapsTrainBody(train, frontPad = 0.85, rearPad = 0.85) {
  const half = (train.length || CONFIG.train.length) * 0.5
  const rear = train.z - half
  const front = train.z + half
  return rear - rearPad <= 0.9 && front + frontPad >= -0.9
}

function rideableTrainUnderPlayer(laneSlack = 1.15) {
  const player = world.player
  for (const train of world.trains) {
    if (!train.active || !train.rideable || train.oncoming) continue
    if (!overlapsTrainBody(train, 0.55, 0.55)) continue
    if (Math.abs(player.x - LANES[train.lane]) > laneSlack) continue
    return train
  }
  return null
}

function roofSurfaceY(player) {
  const bob = Math.sin(world.elapsed * 11.5) * (CONFIG.train.roofBob || 0.04)
  return CONFIG.train.roofY + bob
}

function finishBoardTrain(train, { soft = true } = {}) {
  const player = world.player
  const firstBoard = !player.onRoof || player.roofTrain !== train.id
  player.onRoof = true
  player.roofTrain = train.id
  player.fallingFromRoof = false
  player.roofFallVy = 0
  player.fly = 0
  player.slide = -1
  player.immunity = Math.max(player.immunity, 0.45)
  if (soft) {
    // Settle onto roof — keep a tiny remaining hop so it doesn't hard-teleport
    player.y = Math.min(CONFIG.train.roofY, Math.max(player.y, CONFIG.train.roofY - 0.12))
    player.jump = -1
    player.squash = Math.max(player.squash, 0.95)
    world.landShake = Math.max(world.landShake, CONFIG.camera.landShake)
  } else {
    player.y = CONFIG.train.roofY
    player.jump = -1
  }
  if (firstBoard) {
    // Prefer train lane, but lerp X naturally via applyPose (don't hard snap X)
    player.lane = train.lane
    world.input.lane = 0
    if (!world.muted) {
      playWhoosh()
      playPoliceLine('trainJump', { force: true, priority: true })
    }
    setToast('Train ride!', 1.1)
  }
  return true
}

function tryBoardTrain(train) {
  if (!train?.active || !train.rideable || train.oncoming) return false
  const player = world.player
  // Jetpack flight must skim over trains — remounting every frame caused camera shake
  if (world.powers.jetpack > 0 || player.fly > 0.35) return false
  if (player.fallingFromRoof) return false
  // Jump / hop / already high → mount roof
  const canBoard = player.onRoof || player.jump >= 0 || player.y > CONFIG.train.boardAssistY
  if (!canBoard) return false
  // Only lock once you've risen close enough — otherwise assist handles the pull
  if (!player.onRoof && player.y < CONFIG.train.roofY - CONFIG.train.boardSnapDist - 0.15) {
    return false
  }
  return finishBoardTrain(train, { soft: true })
}

function stopChasePack() {
  silenceChaseAudio()
  world.chase.tension = 0
  world.chase.state = 'far'
  world.chase.gap = CONFIG.chase.gapFar
  world.chase.nearMissBoost = 0
  world.chase.intro = 0
  world.chase.audioAcc = { bark: 0, shout: 0, paw: 0, foot: 0 }
}

/** Despawn props currently overlapping the runner (keeps rideable trains). */
function sweepEmbeddedHazards() {
  const player = world.player
  if (player.onRoof || player.fly > 0.35) return
  const px = player.x
  for (const o of world.obstacles) {
    if (!o.active) continue
    if (Math.abs(o.z) > 2.8) continue
    if (Math.abs(px - (LANES[o.lane] ?? 0)) > 1.15) continue
    // Overhead only embeds when standing tall
    if (o.type === 'overhead' && (player.slide >= 0 || player.y < 0.85)) continue
    if (o.type === 'barrier' && player.y > 0.95) continue
    o.active = false
    o.cleared = true
  }
  for (const v of world.vehicles) {
    if (!v.active) continue
    if (Math.abs(v.z) > (v.length || 2.4) * 0.55 + 1.2) continue
    if (Math.abs(px - (LANES[v.lane] ?? 0)) > 1.15) continue
    if (player.y > 1.15) continue
    v.active = false
    v.cleared = true
  }
}

function beginArrestSequence(reason = 'caught') {
  if (hasGodShield()) {
    // God shield (press 0) — chase can approach but never arrest
    world.chase.tension = Math.min(world.chase.tension, CONFIG.chase.catchThreshold - 0.15)
    world.chase.state = chaseStateFromTension(world.chase.tension)
    setToast('Shield holds!')
    return
  }
  if (world.chase.catchTimer > 0 || world.chase.catchPlayed) return
  if (world.status === 'gameover' || world.status === 'catching') return
  // Stop chase loops + clear solids so you never stay wedged in a prop
  stopChasePack()
  clearPlayerHazards()
  world.status = 'catching'
  world.chase.state = 'caught'
  world.chase.tension = 0.95
  world.chase.gap = CONFIG.chase.gapCatch
  world.chase.catchTimer = CONFIG.chase.catchDuration
  world.chase.catchPhase = 0
  world.chase.catchPlayed = true
  world.chase.catchReason = reason
  world.chase.arrestHold = 0
  world.player.stumble = 0.85
  world.hitFlash = 0.4
  setToast(reason === 'crash' ? 'Busted!' : 'Caught!')
  if (!world.muted) playChaseCatch()
  useGameStore.getState().sync({
    status: 'catching',
    chaseState: 'caught',
    chaseTension: world.chase.tension,
    toast: reason === 'crash' ? 'Busted!' : 'Caught!',
  })
}

/** @deprecated alias — arrest is the cinematic catch */
function beginCatchSequence() {
  beginArrestSequence('caught')
}

export function skipCatchSequence() {
  if (world.status !== 'catching' && world.chase.catchTimer <= 0) return
  world.chase.catchTimer = 0
  silenceChaseAudio()
  finish(world.chase.catchReason === 'crash' ? 'crash' : 'caught')
}

function triggerNearMissEvent({ sameLane = false } = {}) {
  const c = CONFIG.chase
  const cam = CONFIG.camera
  // Bring pack closer temporarily — never force an instant catch
  const cap = c.catchThreshold - 0.1
  world.chase.tension = Math.min(cap, world.chase.tension + c.nearMissGain)
  world.chase.state = chaseStateFromTension(world.chase.tension)
  world.chase.nearMissBoost = c.nearMissBoostTime
  world.bonusScore += c.nearMissBonus * world.scoreMultiplier
  world.hitFlash = Math.max(world.hitFlash, 0.22)
  // Soft cinematic slow-mo (skipped when reduced motion is on)
  if (!meta.settings?.reducedMotion) {
    world.slowmoLeft = Math.max(world.slowmoLeft, cam.nearMissSlowmo)
    world.timeScale = Math.min(world.timeScale, cam.nearMissTimeScale)
  }
  world.runNearMisses += 1
  bumpDaily('nearMisses', 1)
  bumpWeekly('weekNearMisses', 1)
  setToast('CLOSE CALL!')
  if (!world.muted) {
    playWhoosh()
    playNearMiss()
    playDogBark(0.75)
    playPoliceLine('nearMiss')
  }
  void sameLane
}

function onStumble(reason, { chase = true } = {}) {
  world.player.stumble = 0.55
  if (chase) {
    world.chase.tension = Math.min(1, world.chase.tension + CONFIG.chase.stumbleGain)
    world.chase.state = chaseStateFromTension(world.chase.tension)
  }
  const chaseLine =
    chase && world.chase.state === 'close'
      ? 'Almost caught!'
      : chase && world.chase.state === 'approaching'
        ? 'Police closing in!'
        : reason || 'Stumbled!'
  setToast(chaseLine)
  if (!world.muted) {
    playNearMiss()
    if (chase && world.chase.state === 'close') playDogBark()
    // Stumble while pack is near → “رک جا، تجھے قانون کی قسم”
    if (chase && (world.chase.state === 'approaching' || world.chase.state === 'close')) {
      playPoliceLine('lawOath')
    }
  }
  if (chase && world.chase.tension >= CONFIG.chase.catchThreshold) {
    beginCatchSequence()
    return true
  }
  return false
}

/** Permanent shield only via debug key 0 — endless mode does NOT auto-protect. */
function hasGodShield() {
  return !!world.godShield
}

/** Protects a hit only with a collected shield or god shield (press 0). */
function hasShieldProtect() {
  return hasGodShield() || world.powers.shield > 0
}

function consumeShield(hazard) {
  const train = isTrainHazard(hazard)
  // Never despawn rideable trains — that made trains vanish when you jumped/hit them
  const despawnHazard = hazard && !train
  const rideable = train && hazard?.rideable && !hazard?.oncoming

  // God shield (press 0): stay armed forever
  if (hasGodShield()) {
    world.powers.shield = 1
    const canFx = world.shieldImpactCd <= 0
    if (canFx) {
      world.shieldImpactCd = 0.28
      world.player.immunity = Math.max(world.player.immunity, 0.45)
      world.hitFlash = Math.max(world.hitFlash, 0.18)
      spawnBurst(world.player.x, 1.1 + world.player.y, 0.2)
      if (!world.muted) playShieldBreak()
    } else {
      world.player.immunity = Math.max(world.player.immunity, 0.2)
    }
    if (train && tryBoardTrain(hazard)) return false
    if (despawnHazard) {
      hazard.active = false
      if ('cleared' in hazard) hazard.cleared = true
    } else if (rideable) {
      world.player.immunity = Math.max(world.player.immunity, 0.55)
      world.player.x = LANES[world.player.lane] ?? world.player.x
    } else if (train) {
      world.player.immunity = Math.max(world.player.immunity, 0.55)
    }
    if (!world.player.onRoof) {
      world.player.y = Math.max(world.player.y, 0)
      world.player.x = LANES[world.player.lane] ?? world.player.x
    }
    return false
  }

  // Collected one-hit shield — consumed on impact
  world.powers.shield = 0
  world.player.immunity = CONFIG.shield.immunity
  world.shieldBreak = 0.55
  world.hitFlash = 0.22
  if (train && tryBoardTrain(hazard)) {
    spawnBurst(world.player.x, 1.1 + world.player.y, 0.2)
    if (!world.muted) playShieldBreak()
    setToast('Shield broke!')
    return false
  }
  if (despawnHazard) {
    hazard.active = false
    if ('cleared' in hazard) hazard.cleared = true
  } else if (train) {
    world.player.immunity = Math.max(world.player.immunity, 0.55)
    world.player.x = LANES[world.player.lane] ?? world.player.x
  }
  spawnBurst(world.player.x, 1.1 + world.player.y, 0.2)
  if (!world.muted) playShieldBreak()
  setToast('Shield broke!')
  return false
}

function applyInput(delta) {
  const player = world.player
  if (player.laneCd > 0) player.laneCd -= delta
  else if (world.input.lane !== 0) {
    const dir = Math.sign(world.input.lane)
    const next = Math.max(0, Math.min(2, player.lane + dir))
    world.input.lane -= dir
    if (next !== player.lane) {
      player.lane = next
      player.laneCd = 0.08
    } else world.input.lane = 0
  }

  if (world.powers.jetpack > 0) {
    world.input.jump = false
    world.input.slide = false
    return
  }

  if (world.input.jump) {
    world.input.jump = false
    world.input.slide = false
    // Allow jump from road OR from train roof (not mid-fall)
    if (player.jump < 0 && !player.fallingFromRoof) {
      player.slide = -1
      player.jump = 0
      if (!world.muted) playJump()
    }
  } else if (world.input.slide) {
    world.input.slide = false
    const sliding = player.slide >= 0 && player.slide < 0.82
    if (!sliding) {
      if (player.jump >= 0 && player.jump < 0.34) return
      if (player.jump >= 0) {
        player.jump = -1
        // Canceling a jump on the roof must not slam you to the road
        if (!player.onRoof) player.y = 0
        else player.y = CONFIG.train.roofY
      }
      player.slide = 0
      if (!world.muted) playSlide()
    }
  }
}

function dismountTrainRoof(player, { fall = true } = {}) {
  const fromY = Math.max(player.y, CONFIG.train.roofY * 0.65)
  player.onRoof = false
  player.roofTrain = -1
  player.jump = -1
  player.slide = -1
  if (!fall) return
  // Real drop back to the road — gravity arc, not a teleport
  player.fallingFromRoof = true
  player.roofFallVy = Math.min(player.roofFallVy || 0, -1.2)
  player.y = fromY
}

/** Soft magnet onto the roof while jumping over a rideable train. */
function applyTrainBoardAssist(delta) {
  const player = world.player
  if (player.onRoof || player.fallingFromRoof) return null
  if (world.powers.jetpack > 0 || player.fly > 0.35) return null
  const train = rideableTrainUnderPlayer(1.2)
  if (!train) return null

  const jumping = player.jump >= 0
  const highEnough = player.y >= CONFIG.train.boardAssistY || jumping
  if (!highEnough) return null

  // Pull height toward the roof so the jump doesn't end short of the visual coaches
  const pull = CONFIG.train.boardPull || 9.5
  const target = CONFIG.train.roofY
  player.y += (target - player.y) * (1 - Math.exp(-pull * delta))
  // Once close, lock the board with landing juice
  if (player.y >= target - CONFIG.train.boardSnapDist) {
    finishBoardTrain(train, { soft: true })
    return train
  }
  return train
}

function updateRooftop(delta) {
  const player = world.player
  if (world.powers.jetpack > 0 || player.fly > 0.35) {
    dismountTrainRoof(player, { fall: false })
    player.fallingFromRoof = false
    return
  }

  // Gravity fall after leaving the train
  if (player.fallingFromRoof) {
    player.roofFallVy -= (CONFIG.train.fallGravity || 26) * delta
    player.y += player.roofFallVy * delta
    if (player.y <= 0) {
      player.y = 0
      player.fallingFromRoof = false
      player.roofFallVy = 0
      player.squash = Math.max(player.squash, 1)
      world.landShake = Math.max(world.landShake, CONFIG.camera.landShake)
      if (!world.muted) playWhoosh()
    }
    return
  }

  const wasOnRoof = player.onRoof
  const train = rideableTrainUnderPlayer(1.05)
  if (train && (wasOnRoof || player.jump >= 0 || player.y > CONFIG.train.boardAssistY)) {
    player.onRoof = true
    player.roofTrain = train.id
    // Jumping ON the roof — arc relative to coach height
    if (player.jump >= 0) {
      const h = CONFIG.train.roofJumpHeight || 1.25
      player.y = CONFIG.train.roofY + Math.sin(Math.min(1, player.jump) * Math.PI) * h
    } else if (player.slide >= 0) {
      // Duck on roof — stay planted, slightly lower
      player.y = CONFIG.train.roofY - 0.35
    } else {
      player.y = roofSurfaceY(player)
    }
    if (!wasOnRoof) finishBoardTrain(train, { soft: true })
    return
  }

  // Train ended / stepped off sideways → fall back to the road
  if (wasOnRoof) {
    dismountTrainRoof(player, { fall: true })
  }
}

function applyPose(delta) {
  const player = world.player
  const target = LANES[player.lane]
  // Slightly stickier lane sway while on a train roof
  const laneRate = player.stumble > 0 ? 7 : player.onRoof ? 9.5 : 11.5
  player.x += (target - player.x) * (1 - Math.exp(-laneRate * delta))
  const leanTarget = Math.max(-0.42, Math.min(0.42, (player.x - target) * 0.55))
  player.lean += (leanTarget - player.lean) * (1 - Math.exp(-14 * delta))
  if (player.stumble > 0) player.stumble = Math.max(0, player.stumble - delta)

  const flying = world.powers.jetpack > 0
  const wantFly = flying ? 1 : 0
  player.fly += (wantFly - player.fly) * (1 - Math.exp(-(flying ? CONFIG.jetpack.riseSpeed : CONFIG.jetpack.fallSpeed) * delta))

  if (player.fly > 0.05) {
    player.jump = -1
    player.slide = -1
    player.onRoof = false
    player.roofTrain = -1
    player.fallingFromRoof = false
    player.roofFallVy = 0
    player.y = player.fly * CONFIG.jetpack.height
    return
  }

  // Advance jump arc (road or roof) before assist / rooftop settle
  if (player.jump >= 0) {
    player.jump += delta / JUMP_TIME
    if (player.jump >= 1) {
      player.jump = -1
      if (player.onRoof) player.y = CONFIG.train.roofY
      else if (!player.fallingFromRoof) {
        // If still over a rideable train, keep height so board-assist can finish the mount
        const hoveringTrain = rideableTrainUnderPlayer(1.2)
        if (hoveringTrain && player.y > CONFIG.train.boardAssistY) {
          /* keep y — assist / rooftop handles the land */
        } else {
          player.y = 0
          player.squash = 1
        }
      }
    } else if (!player.onRoof) {
      player.y = Math.sin(player.jump * Math.PI) * JUMP_HEIGHT
    }
    // else: updateRooftop sets roof-relative jump height
  } else if (!player.onRoof && !player.fallingFromRoof && player.slide < 0) {
    // Don't slam to road while soft-boarding a train
    if (!(rideableTrainUnderPlayer(1.2) && player.y > CONFIG.train.boardAssistY)) {
      player.y = 0
    }
  }

  // Soft magnet onto coaches while airborne over a rideable train
  if (!player.onRoof && !player.fallingFromRoof) {
    applyTrainBoardAssist(delta)
  }

  updateRooftop(delta)
  if (player.onRoof || player.fallingFromRoof) {
    player.squash = Math.max(0, player.squash - delta * 4.5)
    if (player.slide >= 0) {
      player.slide += delta / SLIDE_TIME
      if (player.slide >= 1) player.slide = -1
    }
    return
  }

  if (player.slide >= 0) {
    player.slide += delta / SLIDE_TIME
    if (player.slide >= 1) player.slide = -1
  }
  player.squash = Math.max(0, player.squash - delta * 4.5)
}

function collectCoin(coin) {
  coin.active = false
  world.coinsCollected += 1
  world.combo += 1
  world.maxCombo = Math.max(world.maxCombo, world.combo)
  world.coinMultiplier = 1 + Math.min(4, Math.floor(world.combo / 5)) * 0.25
  world.bonusScore += Math.floor(8 * world.coinMultiplier * world.scoreMultiplier)
  spawnBurst(typeof coin.x === 'number' ? coin.x : LANES[coin.lane], coin.y, coin.z)
  if (!world.muted) playCoin()
  if (world.combo > 1 && world.combo % 5 === 0) {
    if (!world.muted) playCombo(world.coinMultiplier)
    setToast(`x${world.coinMultiplier.toFixed(2)} combo`)
  }
}

function collectCoins(dz) {
  const player = world.player
  const sliding = player.slide >= 0 && player.slide < 0.92
  const magnet = world.powers.magnet > 0
  const feet = player.y
  const head = player.y + (sliding ? 0.7 : player.fly > 0.4 ? 1.2 : 1.65)
  const mid = (feet + head) * 0.5
  const targetY = mid
  const pullRate = Math.min(1, (CONFIG.magnet.pull * (dz / Math.max(0.001, world.speed))) / 8)

  for (const coin of world.coins) {
    if (!coin.active) continue
    if (typeof coin.x !== 'number') coin.x = LANES[coin.lane]

    if (magnet && coin.z > -8 && coin.z < CONFIG.magnet.zRange) {
      coin.attracted = true
      const dx = player.x - coin.x
      const dy = targetY - coin.y
      const dzp = 0 - coin.z
      coin.x += dx * Math.min(1, pullRate * 1.4)
      coin.y += dy * Math.min(1, pullRate * 1.2)
      coin.z += dzp * Math.min(1, pullRate * 1.1)
      // Snap lane for rendering consistency when close
      let best = coin.lane
      let bestD = Infinity
      for (let i = 0; i < 3; i += 1) {
        const d = Math.abs(coin.x - LANES[i])
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      coin.lane = best
      const dist = Math.hypot(player.x - coin.x, coin.z, targetY - coin.y)
      if (dist < CONFIG.magnet.collectDist) {
        collectCoin(coin)
        continue
      }
      continue
    }

    coin.attracted = false
    coin.x = LANES[coin.lane]
    if (!crossed(coin.z, dz, 0.7)) continue
    if (Math.abs(player.x - LANES[coin.lane]) > 0.8) continue
    if (coin.aerial && player.fly < 0.35 && !player.onRoof) continue
    if (!coin.aerial && player.fly > 0.55 && !player.onRoof) continue
    if (coin.y > 1.5 && !coin.aerial && player.y < 1.05 && !player.onRoof) continue
    if (Math.abs(mid - coin.y) > (coin.aerial || player.onRoof ? 1.5 : 0.95)) continue
    collectCoin(coin)
  }
}

function collectPowerups(dz) {
  for (const p of world.powerups) {
    if (!p.active) continue
    if (!crossed(p.z, dz, 0.75)) continue
    if (Math.abs(world.player.x - LANES[p.lane]) > 0.85) continue
    if (Math.abs(world.player.y + 1 - p.y) > 1.4 && world.player.fly < 0.4) continue
    p.active = false
    activatePower(p.type)
  }
}

function collectMystery(dz) {
  for (const box of world.mystery) {
    if (!box.active) continue
    if (!crossed(box.z, dz, 0.85)) continue
    if (Math.abs(world.player.x - LANES[box.lane]) > 0.9) continue
    if (world.player.y > 1.6 && world.player.fly < 0.35) continue
    box.active = false
    const reward = grantMysteryReward(() => world.rng())
    spawnBurst(LANES[box.lane], box.y, 0.2)
    if (reward.kind === 'power' && reward.power) {
      activatePower(reward.power)
      setToast(`Mystery · ${reward.label}`, 1.2)
    } else if (reward.kind === 'coins') {
      world.bonusScore += Math.floor(reward.amount * 0.35)
      setToast(`Mystery · ${reward.label}`, 1.2)
      if (!world.muted) playCoin()
    } else {
      setToast(`Mystery · ${reward.label}`, 1.35)
      if (!world.muted) playPower()
    }
    useGameStore.getState().sync({ wallet: meta.wallet })
  }
}

function absorbOrCrash(hazard) {
  // Rideable train + jump → board, never crash/despawn
  if (isTrainHazard(hazard) && tryBoardTrain(hazard)) return false

  // Only collected shield or god shield (0) absorb a hit — no auto-shield
  if (hasShieldProtect()) {
    if (hasGodShield()) world.powers.shield = 1
    const result = consumeShield(hazard)
    sweepEmbeddedHazards()
    return result
  }
  if (world.powers.hoverboard > 0) {
    world.powers.hoverboard = 0
    world.player.immunity = CONFIG.shield.immunity * 0.6
    if (hazard && !isTrainHazard(hazard)) {
      hazard.active = false
      if ('cleared' in hazard) hazard.cleared = true
    }
    sweepEmbeddedHazards()
    return onStumble('Board cracked!', { chase: true })
  }
  return true
}

function resolveHazards(dz) {
  const player = world.player
  const jetting = world.powers.jetpack > 0 || player.fly > 0.35

  // Board rideable trains even during immunity (rear jump used to shove lanes instead)
  // Skip while jetpacking — forced remounts over trains made the camera vibrate
  if (!jetting) {
    for (const train of world.trains) {
      if (!train.active || !train.rideable || train.oncoming) continue
      if (!overlapsTrainBody(train)) continue
      if (!sameLane(train.lane) && Math.abs(player.x - LANES[train.lane]) > 1.05) continue
      if (player.onRoof && player.roofTrain === train.id) continue
      if (tryBoardTrain(train)) return false
    }
  }

  if (player.immunity > 0) return false
  if (jetting || player.fly > 0.45) return false
  const sliding = player.slide >= 0 && player.slide < 0.92
  const elevated = player.onRoof || player.fallingFromRoof || player.y > 1.5

  for (const obstacle of world.obstacles) {
    if (!obstacle.active) continue
    if (!crossed(obstacle.z, dz, 0.72)) continue
    if (!sameLane(obstacle.lane)) continue
    if (obstacle.type === 'barrier' && player.y > 0.95) continue
    if (obstacle.type === 'overhead' && sliding) continue
    if (elevated && obstacle.type !== 'overhead') continue
    const hit = absorbOrCrash(obstacle)
    if (hit === true) return true
    if (hit) return hit
    return false
  }

  for (const vehicle of world.vehicles) {
    if (!vehicle.active) continue
    if (!crossed(vehicle.z, dz, vehicle.length * 0.4)) continue
    if (!sameLane(vehicle.lane)) continue
    if (elevated) continue
    if (player.y > 1.15) continue
    const hit = absorbOrCrash(vehicle)
    if (hit === true) return true
    if (hit) return hit
    return false
  }

  for (const train of world.trains) {
    if (!train.active) continue
    // Only collide with the real coach body — empty track behind/ahead is safe
    if (!overlapsTrainBody(train)) continue
    if (!sameLane(train.lane)) continue
    // Already on this train roof — never re-collide / despawn
    if (player.onRoof && player.roofTrain === train.id) continue
    if (train.rideable && !train.oncoming) {
      if (player.onRoof || player.y > 0.9 || tryBoardTrain(train)) continue
    }
    // Flying / jetpack always clears trains (no shield flash / shake)
    if (player.fly > 0.35) continue
    const hit = absorbOrCrash(train)
    if (hit === true) return true
    if (hit) return hit
    return false
  }
  return false
}

function trackNearMisses(dz) {
  const player = world.player
  const sliding = player.slide >= 0 && player.slide < 0.92
  const flying = player.fly > 0.4
  const margin = CONFIG.chase.nearMissLaneMargin

  for (const obstacle of world.obstacles) {
    if (!obstacle.active || obstacle.cleared) continue
    const previous = obstacle.z + dz
    // Only when the hazard actually crosses behind the player this frame
    if (!(previous >= 0 && obstacle.z < 0)) continue
    obstacle.cleared = true
    const dx = Math.abs(player.x - LANES[obstacle.lane])
    const same = dx < 0.78
    const close = dx < margin
    // Vertical separation / intended clear → not a scary near-miss
    if (flying) continue
    if (same && obstacle.type === 'barrier' && player.y > 0.95) {
      world.bonusScore += 15 * world.scoreMultiplier
      world.chase.tension = Math.max(0.05, world.chase.tension - CONFIG.chase.nearMissRecover)
      setToast('Clean clear')
      if (!world.muted) playNearMiss()
      continue
    }
    if (same && obstacle.type === 'overhead' && sliding) {
      world.bonusScore += 15 * world.scoreMultiplier
      setToast('Clean clear')
      if (!world.muted) playNearMiss()
      continue
    }
    // Adjacent-lane scrape or tight pass without collision
    if (!same && close) {
      triggerNearMissEvent({ sameLane: false })
    }
  }

  for (const vehicle of world.vehicles) {
    if (!vehicle.active || vehicle.cleared) continue
    const previous = vehicle.z + dz
    if (!(previous >= 0 && vehicle.z < 0)) continue
    vehicle.cleared = true
    if (flying) continue
    const dx = Math.abs(player.x - LANES[vehicle.lane])
    // Would have been a hit on this lane at ground height — skip (actual collision handled elsewhere)
    if (dx < 0.78 && player.y <= 1.05) continue
    if (dx > margin) continue
    world.runStats.dodges += 1
    bumpDaily('dodges', 1)
    bumpWeekly('weekDodges', 1)
    triggerNearMissEvent({ sameLane: false })
  }

  for (const train of world.trains) {
    if (!train.active || train.cleared) continue
    const previous = train.z + dz
    const half = train.length * 0.45
    // Rear of train just passed player
    if (!(previous - half >= 0 && train.z - half < 0)) continue
    train.cleared = true
    if (flying || player.onRoof) continue
    const dx = Math.abs(player.x - LANES[train.lane])
    if (dx < 0.78) continue
    if (dx > margin + 0.2) continue
    world.runStats.dodges += 1
    bumpDaily('dodges', 1)
    bumpWeekly('weekDodges', 1)
    triggerNearMissEvent({ sameLane: false })
  }
}

function tickPowers(delta) {
  const p = world.powers
  if (p.magnet > 0) p.magnet = Math.max(0, p.magnet - delta)
  if (p.multiplier > 0) {
    p.multiplier = Math.max(0, p.multiplier - delta)
    world.scoreMultiplier = p.multiplier > 0 ? CONFIG.multiplier.factor : 1
  } else world.scoreMultiplier = 1
  if (p.hoverboard > 0) p.hoverboard = Math.max(0, p.hoverboard - delta)
  if (p.jetpack > 0) {
    const before = p.jetpack
    p.jetpack = Math.max(0, p.jetpack - delta)
    if (before > 1.2 && p.jetpack <= 1.2) {
      for (const o of world.obstacles) {
        if (o.active && o.z > 4 && o.z < 22 && o.type === 'wall') o.active = false
      }
    }
  }
  if (world.player.immunity > 0) {
    world.player.immunity = Math.max(0, world.player.immunity - delta)
  }
  if (world.shieldBreak > 0) {
    world.shieldBreak = Math.max(0, world.shieldBreak - delta)
  }
}

function tickChaseAudio(delta) {
  // Never keep dog/police audio running after fail / menu / arrest hold
  if (
    world.muted ||
    world.status === 'paused' ||
    world.status === 'gameover' ||
    world.status === 'menu' ||
    world.status === 'catching'
  ) {
    return
  }
  const state = world.chase.state
  const acc = world.chase.audioAcc
  // Presence from gap: closer police → louder voice/bark (never inaudible)
  const gapFar = CONFIG.chase.gapFar
  const gapNear = CONFIG.chase.gapCatch
  const span = Math.max(0.01, gapFar - gapNear)
  const closeness = 1 - Math.max(0, Math.min(1, (world.chase.gap - gapNear) / span))
  setChasePresence(0.35 + closeness * 0.65)

  acc.bark += delta
  acc.shout += delta
  acc.paw += delta
  acc.foot += delta
  const barkEvery =
    state === 'close' || world.chase.nearMissBoost > 0
      ? CONFIG.chase.barkCloseInterval
      : CONFIG.chase.barkInterval
  if (state === 'approaching' || state === 'close' || state === 'caught' || world.chase.nearMissBoost > 0) {
    if (acc.bark >= barkEvery) {
      acc.bark = 0
      const type =
        state === 'close' || world.chase.nearMissBoost > 0
          ? 'close'
          : state === 'approaching'
            ? 'angry'
            : 'short'
      if (!playDogBarkFile(type)) playDogBark(type === 'close' ? 0.9 : 0.5)
    }
    // Soft running loop when chase is active
    if (closeness > 0.35) playDogBarkFile('running')
  } else {
    stopDogBark()
  }
  // First time police get near → “رک جا، تجھے قانون کی قسم”
  const prevVoice = world.chase.lastVoicedState || 'far'
  if (
    (state === 'approaching' || state === 'close') &&
    prevVoice !== 'approaching' &&
    prevVoice !== 'close'
  ) {
    playPoliceLine('lawOath', { force: true, priority: true })
    acc.shout = 0
  }
  world.chase.lastVoicedState = state

  if (state === 'close') {
    if (acc.shout >= CONFIG.chase.shoutInterval) {
      acc.shout = 0
      // Close: mix dog-command with the law-oath line so it keeps coming back
      playPoliceLine(Math.random() < 0.45 ? 'lawOath' : 'dogCommand')
      if (!playDogBarkFile('close')) playDogBark(0.9)
      if (Math.random() < 0.28) maybePlayExtraLine()
    }
  } else if (state === 'approaching') {
    if (acc.shout >= CONFIG.chase.shoutInterval * 1.3) {
      acc.shout = 0
      playPoliceLine('lawOath')
      if (Math.random() < 0.22) maybePlayExtraLine()
    }
  }
  if (acc.paw >= CONFIG.chase.pawInterval / (1 + world.chase.tension)) {
    acc.paw = 0
    playDogPaw()
  }
  if (acc.foot >= CONFIG.chase.footInterval / (1 + world.chase.tension * 0.5)) {
    acc.foot = 0
    playFootstep()
  }
  setChaseTensionAudio(world.chase.tension)
}

function tickChase(delta) {
  if (world.chase.intro > 0) {
    world.chase.intro = Math.max(0, world.chase.intro - delta)
  }
  if (world.chase.nearMissBoost > 0) {
    world.chase.nearMissBoost = Math.max(0, world.chase.nearMissBoost - delta)
  }
  // God shield only — chase can feel close but never cross arrest threshold
  if (hasGodShield() && world.chase.catchTimer <= 0) {
    world.chase.tension = Math.min(world.chase.tension, CONFIG.chase.catchThreshold - 0.12)
  }
  // Jetpack keeps dog safely behind
  if (world.powers.jetpack > 0 || world.player.fly > 0.35) {
    world.chase.tension = Math.min(world.chase.tension, CONFIG.chase.jetpackSafe)
  } else if (world.chase.catchTimer <= 0) {
    // During near-miss boost, recover slower so pack stays closer ~3–5s
    const recover =
      world.chase.nearMissBoost > 0
        ? CONFIG.chase.recoverPerSecond * 0.35
        : CONFIG.chase.recoverPerSecond
    world.chase.tension = Math.max(0.05, world.chase.tension - recover * delta)
  }
  if (world.chase.catchTimer <= 0) {
    world.chase.state = chaseStateFromTension(world.chase.tension)
  }
  // Smooth gap toward tension-driven target (actual pursuit distance)
  const want = targetChaseGap()
  const k = 1 - Math.exp(-CONFIG.chase.gapLerp * delta)
  world.chase.gap += (want - world.chase.gap) * k
  tickChaseAudio(delta)
}

function syncHud(delta, force) {
  world.hudAcc += delta
  if (!force && world.hudAcc < CONFIG.hudSync) return
  world.hudAcc = 0
  const patch = {
    score: world.score,
    coins: world.coinsCollected,
    distance: Math.floor(world.distance),
    speed: world.speed,
    combo: world.combo,
    maxCombo: world.maxCombo,
    multiplier: world.coinMultiplier,
    scoreMultiplier: world.scoreMultiplier,
    toast: world.toast,
    countdown: Math.ceil(world.countdown),
    biomeName: world.biomeName,
    biomeBanner: world.biomeBanner,
    chaseState: world.chase.state,
    chaseTension: world.chase.tension,
    powers: { ...world.powers },
    flying: world.player.fly > 0.35 || world.player.onRoof,
    trainWarn: world.trainWarn,
    muted: world.muted,
    subtitle: world.subtitle || '',
    nearMissBoost: world.chase.nearMissBoost,
  }
  if (world.status === 'countdown') patch.status = 'countdown'
  useGameStore.getState().sync(patch)
}

function finish(reason = 'crash') {
  world.status = 'gameover'
  world.hitFlash = reason === 'caught' ? 0.55 : 1
  world.combo = 0
  world.chase.catchTimer = 0
  // Kill chase pack + audio so dog/police don't keep running behind after fail
  stopChasePack()
  clearPlayerHazards()
  clearPowers()
  setDailyMax('distance', Math.floor(world.distance))
  setDailyMax('coins', world.coinsCollected)
  setDailyMax('nearMisses', world.runNearMisses)
  bumpWeekly('weekJumps', 0)
  if (!world.muted && reason !== 'caught') playCrash()
  if (reason === 'caught') {
    setToast('Caught!')
  }
  useGameStore.getState().sync({ chaseState: 'far', chaseTension: 0 })
  useGameStore.getState().end(
    world.score,
    world.coinsCollected,
    Math.floor(world.distance),
    world.maxCombo,
    {
      mode: world.playMode,
      nearMisses: world.runNearMisses,
      worlds: [...world.runWorlds],
    },
  )
}

export function step(dt) {
  let delta = Math.min(CONFIG.maxDelta, Math.max(0, Number.isFinite(dt) ? dt : 0))
  if (delta === 0) return

  // Near-miss slow-mo — wall clock still advances effect timer at full rate
  if (world.status === 'playing') {
    if (world.slowmoLeft > 0) {
      world.slowmoLeft = Math.max(0, world.slowmoLeft - delta)
      if (world.slowmoLeft <= 0) world.timeScale = 1
      else world.timeScale = CONFIG.camera.nearMissTimeScale
    } else {
      world.timeScale = 1
    }
    if (meta.settings?.reducedMotion) world.timeScale = 1
    delta *= world.timeScale
  }

  if (world.status === 'menu') {
    world.elapsed += delta
    world.distance += CONFIG.speed.menu * delta
    world.speed = CONFIG.speed.menu
    updateBiomeVisual(delta)
    const player = world.player
    player.lane = 1
    player.x += (0 - player.x) * (1 - Math.exp(-4 * delta))
    player.y = 0
    player.fly = 0
    player.jump = -1
    player.slide = -1
    player.lean = Math.sin(world.elapsed * 0.45) * 0.05
    return
  }

  if (world.status === 'paused') {
    world.elapsed += delta * 0.12
    return
  }

  if (world.status === 'catching') {
    world.elapsed += delta
    const dur = CONFIG.chase.catchDuration
    const prevPhase = world.chase.catchPhase
    world.chase.catchTimer = Math.max(0, world.chase.catchTimer - delta)
    world.chase.catchPhase = 1 - world.chase.catchTimer / Math.max(0.001, dur)
    world.speed = CONFIG.speed.base * CONFIG.chase.catchSlowmo
    // Freeze scoring growth / spawns — tiny visual scroll only
    const want = THREE_LERP(CONFIG.chase.gapNear, CONFIG.chase.gapCatch, Math.min(1, world.chase.catchPhase * 1.2))
    world.chase.gap += (want - world.chase.gap) * (1 - Math.exp(-5.5 * delta))
    world.chase.arrestHold = world.chase.catchPhase
    if (world.player.stumble > 0) {
      world.player.stumble = Math.max(0, world.player.stumble - delta * 0.45)
    }
    if (world.hitFlash > 0) world.hitFlash = Math.max(0, world.hitFlash - delta * 1.2)
    if (world.toastLife > 0) {
      world.toastLife = Math.max(0, world.toastLife - delta)
      if (world.toastLife === 0) world.toast = ''
    }
    // Arrest timeline: police arrest line, then final shepherd bark after VO ends
    if (prevPhase < 0.35 && world.chase.catchPhase >= 0.35 && !world.muted) {
      playArrestFinale()
    }
    tickSubtitle(delta)
    const sub = getSubtitle()
    world.subtitle = sub.life > 0 ? sub.text : ''
    syncHud(delta, true)
    if (world.chase.catchTimer <= 0) {
      finish(world.chase.catchReason === 'crash' ? 'crash' : 'caught')
    }
    return
  }

  if (world.status === 'countdown') {
    world.elapsed += delta
    world.distance += 4 * delta
    world.speed = 8
    updateBiomeVisual(delta)
    const before = Math.ceil(world.countdown)
    world.countdown = Math.max(0, world.countdown - delta)
    const after = Math.ceil(world.countdown)
    if (after !== before && after > 0 && !world.muted) playCount()
    if (world.countdown <= 0) {
      world.countdown = 0
      world.status = 'playing'
      if (!world.muted) playGo()
      setToast('Rush!')
      unlockDialogue()
      playPoliceLine('start', { force: true })
      useGameStore.getState().sync({ status: 'playing', countdown: 0, toast: 'Rush!' })
    } else syncHud(delta, true)
    return
  }

  if (world.status !== 'playing') {
    world.hitFlash = Math.max(0, world.hitFlash - delta * 1.6)
    world.elapsed += delta * 0.35
    updateBiomeVisual(delta)
    if (world.toastLife > 0) {
      world.toastLife = Math.max(0, world.toastLife - delta)
      if (world.toastLife === 0) world.toast = ''
    }
    return
  }

  world.elapsed += delta
  if (world.shieldImpactCd > 0) {
    world.shieldImpactCd = Math.max(0, world.shieldImpactCd - delta)
  }
  // Must decay during play — otherwise shield/hit shake sticks on forever
  if (world.hitFlash > 0) {
    world.hitFlash = Math.max(0, world.hitFlash - delta * 2.8)
  }
  const stumbleSlow = world.player.stumble > 0 ? 0.72 : 1
  world.speed = Math.min(
    CONFIG.speed.max,
    (CONFIG.speed.base + world.distance * CONFIG.speed.ramp) * stumbleSlow,
  )
  const dz = world.speed * delta
  world.distance += dz
  setVoiceRunDistance(world.distance)
  updateBiomeVisual(delta)
  tickPowers(delta)
  tickChase(delta)
  tickSubtitle(delta)
  world.subtitle = ''

  if (world.toastLife > 0) {
    world.toastLife = Math.max(0, world.toastLife - delta)
    if (world.toastLife === 0) world.toast = ''
  }

  applyInput(delta)
  // Landing punch — jump just finished
  const jumpingNow = world.player.jump >= 0
  if (world.prevJump >= 0 && !jumpingNow && world.player.y < 0.15) {
    world.landShake = CONFIG.camera.landShake
    world.player.squash = Math.max(world.player.squash, 0.85)
  }
  world.prevJump = world.player.jump
  if (world.landShake > 0) world.landShake = Math.max(0, world.landShake - delta * 2.6)
  applyPose(delta)

  for (const obstacle of world.obstacles) {
    if (!obstacle.active) continue
    obstacle.z -= dz
    if (obstacle.z < -16) obstacle.active = false
    // Only cull props deeply stuck inside a same-lane train (not nearby traffic)
    else if (spawnBlockedByTrain(obstacle.z, obstacle.lane, 0.5)) {
      obstacle.active = false
      obstacle.cleared = true
    }
  }
  for (const coin of world.coins) {
    if (!coin.active) continue
    coin.z -= dz
    coin.spin += delta * 4.2
    if (coin.z < -16) coin.active = false
  }
  for (const power of world.powerups) {
    if (!power.active) continue
    power.z -= dz
    if (power.z < -16) power.active = false
  }
  for (const box of world.mystery) {
    if (!box.active) continue
    box.z -= dz
    box.spin += delta * 2.4
    if (box.z < -16) box.active = false
  }
  for (const burst of world.bursts) {
    if (!burst.active) continue
    burst.z -= dz
    burst.life -= delta
    if (burst.life <= 0) burst.active = false
  }
  for (const vehicle of world.vehicles) {
    if (!vehicle.active) continue
    const closing = vehicle.oncoming ? world.speed + vehicle.speed : Math.max(2, world.speed - vehicle.speed)
    vehicle.z -= closing * delta
    if (vehicle.z < -18) vehicle.active = false
    // Cull only when a car is stuck inside the same-lane coach body
    else if (spawnBlockedByTrain(vehicle.z, vehicle.lane, 0.75)) {
      vehicle.active = false
      vehicle.cleared = true
    }
  }
  for (const train of world.trains) {
    if (!train.active) continue
    const closing = train.oncoming ? world.speed + train.speed : Math.max(1.5, world.speed - train.speed)
    train.z -= closing * delta
    if (!train.warned && train.oncoming && train.z < CONFIG.train.warnZ && train.z > 20) {
      train.warned = true
      world.trainWarn = 2.2
      setToast('TRAIN INCOMING!', 1.4)
      if (!world.muted) playTrainWarn()
    }
    if (train.z < -train.length - 8) {
      train.active = false
      if (world.player.roofTrain === train.id) {
        dismountTrainRoof(world.player, { fall: true })
      }
    }
  }

  world.spawnZ -= dz
  refill()
  collectCoins(dz)
  collectPowerups(dz)
  collectMystery(dz)
  for (const coin of world.coins) {
    if (!coin.active) continue
    if (!(coin.z + dz >= 0 && coin.z < 0)) continue
    if (Math.abs(world.player.x - LANES[coin.lane]) >= 0.85) continue
    if (world.combo > 0) {
      world.combo = 0
      world.coinMultiplier = 1
    }
  }
  trackNearMisses(dz)
  const died = resolveHazards(dz)
  // After hits / shield pops, wipe any leftover overlap so we never stay wedged
  if (world.player.immunity > 0) sweepEmbeddedHazards()
  world.score =
    Math.floor(world.distance * world.scoreMultiplier) +
    world.coinsCollected * 10 +
    world.bonusScore +
    Math.floor(world.maxCombo * 2)
  if (died === true) {
    const reason =
      world.chase.state === 'close' || world.chase.state === 'caught' ? 'caught' : 'crash'
    beginArrestSequence(reason)
    return
  }
  if (died) return // stumble / catch already started
  syncHud(delta, false)
}
