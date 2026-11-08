/**
 * Persistent economy, characters, hoverboards, missions, XP, play modes.
 */
import {
  ACHIEVEMENTS,
  BOARD_ID_MAP,
  CHARACTER_ID_MAP,
  CHARACTERS,
  DAILY_MISSION_DEFS,
  HOVERBOARDS,
  PLAY_MODES,
  WEEKLY_MISSION_DEFS,
} from './catalog.js'

export {
  ACHIEVEMENTS,
  CHARACTERS,
  DAILY_MISSION_DEFS,
  HOVERBOARDS,
  PLAY_MODES,
  WEEKLY_MISSION_DEFS,
} from './catalog.js'

export const ECONOMY = {
  characterPrices: Object.fromEntries(CHARACTERS.map((c) => [c.id, c.price])),
  boardPrices: Object.fromEntries(HOVERBOARDS.map((b) => [b.id, b.price])),
  xpPerMeter: 0.12,
  xpPerCoin: 1.5,
  xpRunBonus: 20,
}

/** Seven-day login calendar — Day 7 is the jackpot (Phase 12 amounts). */
export const DAILY_LOGIN_REWARDS = [
  { day: 1, coins: 100, label: 'Day 1' },
  { day: 2, coins: 200, label: 'Day 2' },
  { day: 3, coins: 300, label: 'Day 3' },
  { day: 4, coins: 500, label: 'Day 4' },
  { day: 5, coins: 750, label: 'Day 5' },
  { day: 6, coins: 1000, label: 'Day 6' },
  { day: 7, coins: 2000, label: 'Day 7 Jackpot', special: true },
]

/** Free mystery-box loot table (weights sum ~100). Cosmetics never duplicate. */
export const MYSTERY_REWARDS = [
  { id: 'coins50', kind: 'coins', amount: 50, weight: 28, label: '+50 coins' },
  { id: 'coins100', kind: 'coins', amount: 100, weight: 22, label: '+100 coins' },
  { id: 'coins250', kind: 'coins', amount: 250, weight: 12, label: '+250 coins' },
  { id: 'coins500', kind: 'coins', amount: 500, weight: 5, label: '+500 coins' },
  { id: 'shield', kind: 'power', power: 'shield', weight: 12, label: 'Shield boost' },
  { id: 'magnet', kind: 'power', power: 'magnet', weight: 10, label: 'Magnet boost' },
  { id: 'multiplier', kind: 'power', power: 'multiplier', weight: 8, label: '2× score' },
  { id: 'trail_spark', kind: 'cosmetic', cosmetic: 'trail_spark', weight: 3, label: 'Spark trail' },
]

export const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1400, 1850, 2400, 3000, 3700, 4500, 5400]

const META_VERSION = 4
const STORAGE_KEY = 'neon-rush-3d-meta-v4'
const LEGACY_KEYS = ['neon-rush-3d-meta-v3', 'neon-rush-3d-meta-v2', 'neon-rush-3d-meta-v1']
const LEADERBOARD_KEY = 'neon-rush-3d-runs-v1'
const LEADERBOARD_MAX = 10

export function todayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function yesterdayKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1)
  return todayKey(d)
}

function weekKey(date = new Date()) {
  // ISO-ish week: year + week number from local Monday
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day + 3)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const week =
    1 +
    Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-W${week}`
}

export function levelFromXp(xp) {
  let level = 1
  for (let i = 1; i < LEVEL_XP.length; i += 1) {
    if (xp >= LEVEL_XP[i]) level = i + 1
    else break
  }
  return level
}

export function xpProgress(xp) {
  const level = levelFromXp(xp)
  const idx = level - 1
  const floor = LEVEL_XP[idx] ?? 0
  const next = LEVEL_XP[idx + 1] ?? floor + 900
  const into = Math.max(0, xp - floor)
  const need = Math.max(1, next - floor)
  return { level, floor, next, into, need, pct: Math.min(100, (into / need) * 100) }
}

function mapId(id, map) {
  return map[id] || id
}

function defaultMeta() {
  return {
    version: META_VERSION,
    wallet: 0,
    unlocked: ['alex'],
    equipped: 'alex',
    boardsUnlocked: ['none', 'classic'],
    boardEquipped: 'classic',
    boardUnlockCount: 2,
    cosmetics: [],
    lifetimeCoins: 0,
    totalDistance: 0,
    bestDistance: 0,
    bestDistanceNormal: 0,
    bestDistanceEndless: 0,
    bestScoreNormal: 0,
    bestScoreEndless: 0,
    runs: 0,
    unlockCount: 1,
    xp: 0,
    level: 1,
    claimedAchievements: {},
    playMode: PLAY_MODES.normal,
    worldsSeen: [],
    lifetimeNearMisses: 0,
    dailiesClaimed: 0,
    mysteryOpened: 0,
    daily: {
      day: todayKey(),
      progress: {},
      claimed: {},
    },
    weekly: {
      week: weekKey(),
      progress: {},
      claimed: {},
      worldSet: {},
    },
    login: {
      streak: 0,
      lastClaimDay: null,
      claimedDays: {},
    },
    settings: {
      music: true,
      sfx: true,
      musicVol: 0.35,
      sfxVol: 0.7,
      voiceVol: 0.85,
      barkVol: 0.75,
      /** auto = pick low on phones, medium on desktop */
      graphics: 'auto',
      reducedMotion: false,
    },
  }
}

function migrate(raw) {
  const base = defaultMeta()
  const parsed = { ...base, ...raw }

  // Character id migration
  parsed.unlocked = [...new Set((parsed.unlocked || []).map((id) => mapId(id, CHARACTER_ID_MAP)))]
  if (!parsed.unlocked.includes('alex')) parsed.unlocked = ['alex', ...parsed.unlocked]
  parsed.equipped = mapId(parsed.equipped || 'alex', CHARACTER_ID_MAP)
  if (!parsed.unlocked.includes(parsed.equipped)) parsed.equipped = 'alex'

  // Board id migration
  parsed.boardsUnlocked = [
    ...new Set(
      ['none', 'classic', ...(parsed.boardsUnlocked || []).map((id) => mapId(id, BOARD_ID_MAP))],
    ),
  ]
  parsed.boardEquipped = mapId(parsed.boardEquipped || 'classic', BOARD_ID_MAP)
  if (parsed.boardEquipped === 'spark') parsed.boardEquipped = 'classic'
  if (!parsed.boardsUnlocked.includes(parsed.boardEquipped)) parsed.boardEquipped = 'classic'

  parsed.boardUnlockCount = parsed.boardsUnlocked.filter((id) => id !== 'none').length
  parsed.unlockCount = parsed.unlocked.length

  if (!parsed.daily) parsed.daily = defaultMeta().daily
  if (parsed.daily.day !== todayKey()) {
    parsed.daily = { day: todayKey(), progress: {}, claimed: {} }
  }
  if (!parsed.weekly) parsed.weekly = defaultMeta().weekly
  if (parsed.weekly.week !== weekKey()) {
    parsed.weekly = { week: weekKey(), progress: {}, claimed: {}, worldSet: {} }
  }
  if (!parsed.login) parsed.login = defaultMeta().login
  if (!parsed.claimedAchievements) parsed.claimedAchievements = {}
  if (!parsed.worldsSeen) parsed.worldsSeen = []
  if (!Array.isArray(parsed.cosmetics)) parsed.cosmetics = []
  parsed.mysteryOpened = Math.max(0, Number(parsed.mysteryOpened) || 0)
  parsed.settings = { ...defaultMeta().settings, ...(parsed.settings || {}) }
  // Older saves defaulted to "high" which feels laggy on phones — prefer auto
  if (parsed.settings.graphics === 'high' && typeof window !== 'undefined') {
    try {
      const coarse = window.matchMedia('(pointer: coarse)').matches
      if (coarse) parsed.settings.graphics = 'auto'
    } catch {
      /* ignore */
    }
  }
  if (parsed.playMode !== PLAY_MODES.endless) parsed.playMode = PLAY_MODES.normal
  parsed.xp = Math.max(0, Number(parsed.xp) || 0)
  parsed.level = levelFromXp(parsed.xp)
  parsed.bestDistanceNormal = Math.max(parsed.bestDistanceNormal || 0, parsed.bestDistance || 0)
  parsed.wallet = Math.max(0, Number(parsed.wallet) || 0)
  parsed.version = META_VERSION
  return parsed
}

function readMeta() {
  try {
    if (typeof localStorage === 'undefined') return defaultMeta()
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        const legacy = localStorage.getItem(key)
        if (legacy) {
          const migrated = migrate(JSON.parse(legacy))
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
          return migrated
        }
      }
      return defaultMeta()
    }
    return migrate(JSON.parse(raw))
  } catch {
    return defaultMeta()
  }
}

function writeMeta(data) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export let meta = readMeta()

export function refreshMetaFromStorage() {
  meta = readMeta()
  return meta
}

export function saveMeta() {
  writeMeta(meta)
}

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]
}

export function getHoverboard(id) {
  return HOVERBOARDS.find((b) => b.id === id) || HOVERBOARDS[1]
}

export function isUnlocked(id) {
  return meta.unlocked.includes(id)
}

export function isBoardUnlocked(id) {
  if (id === 'none') return true
  return meta.boardsUnlocked.includes(id)
}

export function isEndlessMode() {
  return meta.playMode === PLAY_MODES.endless
}

export function setPlayMode(mode) {
  meta.playMode = mode === PLAY_MODES.endless ? PLAY_MODES.endless : PLAY_MODES.normal
  saveMeta()
  return meta.playMode
}

export function buyCharacter(id) {
  if (isUnlocked(id)) return { ok: false, reason: 'owned' }
  const price = ECONOMY.characterPrices[id]
  if (price == null) return { ok: false, reason: 'unknown' }
  if (meta.wallet < price) return { ok: false, reason: 'funds' }
  meta.wallet = Math.max(0, meta.wallet - price)
  meta.unlocked.push(id)
  meta.unlockCount = meta.unlocked.length
  meta.equipped = id
  saveMeta()
  return { ok: true }
}

export function buyHoverboard(id) {
  if (id === 'none') return { ok: false, reason: 'unknown' }
  if (isBoardUnlocked(id)) return { ok: false, reason: 'owned' }
  const price = ECONOMY.boardPrices[id]
  if (price == null) return { ok: false, reason: 'unknown' }
  if (meta.wallet < price) return { ok: false, reason: 'funds' }
  meta.wallet = Math.max(0, meta.wallet - price)
  meta.boardsUnlocked.push(id)
  meta.boardUnlockCount = meta.boardsUnlocked.filter((b) => b !== 'none').length
  meta.boardEquipped = id
  saveMeta()
  return { ok: true }
}

export function equipCharacter(id) {
  if (!isUnlocked(id)) return false
  meta.equipped = id
  saveMeta()
  return true
}

export function equipHoverboard(id) {
  if (!isBoardUnlocked(id)) return false
  meta.boardEquipped = id
  saveMeta()
  return true
}

function achievementFlags() {
  return {
    hasFireBoard: meta.boardsUnlocked.includes('fire') ? 1 : 0,
    hasRobo: meta.unlocked.includes('robo') ? 1 : 0,
    hasGolden: meta.unlocked.includes('golden') ? 1 : 0,
    worldsSeen: meta.worldsSeen?.length || 0,
  }
}

export function bankRunRewards({ coins, distance, score = 0, mode, nearMisses = 0, worlds = [] }) {
  const add = Math.max(0, Math.floor(coins || 0))
  const dist = Math.max(0, Math.floor(distance || 0))
  const endless = mode === PLAY_MODES.endless || meta.playMode === PLAY_MODES.endless
  meta.wallet += add
  meta.lifetimeCoins += add
  meta.totalDistance += dist
  meta.bestDistance = Math.max(meta.bestDistance, dist)
  if (endless) {
    meta.bestDistanceEndless = Math.max(meta.bestDistanceEndless || 0, dist)
    meta.bestScoreEndless = Math.max(meta.bestScoreEndless || 0, Math.floor(score || 0))
  } else {
    meta.bestDistanceNormal = Math.max(meta.bestDistanceNormal || 0, dist)
    meta.bestScoreNormal = Math.max(meta.bestScoreNormal || 0, Math.floor(score || 0))
  }
  meta.runs += 1
  meta.lifetimeNearMisses = (meta.lifetimeNearMisses || 0) + Math.max(0, nearMisses)
  for (const w of worlds) {
    if (w && !meta.worldsSeen.includes(w)) meta.worldsSeen.push(w)
  }
  bumpWeekly('weekDistance', dist)
  bumpWeekly('weekCoins', add)
  const gained = Math.floor(
    ECONOMY.xpRunBonus + dist * ECONOMY.xpPerMeter + add * ECONOMY.xpPerCoin,
  )
  meta.xp += Math.max(0, gained)
  meta.level = levelFromXp(meta.xp)
  saveMeta()
  return { coins: add, xp: gained, level: meta.level }
}

export function bumpDaily(key, amount = 1) {
  if (meta.daily.day !== todayKey()) {
    meta.daily = { day: todayKey(), progress: {}, claimed: {} }
  }
  meta.daily.progress[key] = (meta.daily.progress[key] || 0) + amount
  saveMeta()
}

export function setDailyMax(key, value) {
  if (meta.daily.day !== todayKey()) {
    meta.daily = { day: todayKey(), progress: {}, claimed: {} }
  }
  meta.daily.progress[key] = Math.max(meta.daily.progress[key] || 0, value)
  saveMeta()
}

export function bumpWeekly(key, amount = 1) {
  if (meta.weekly.week !== weekKey()) {
    meta.weekly = { week: weekKey(), progress: {}, claimed: {}, worldSet: {} }
  }
  if (key === 'weekWorldSet') {
    /* handled separately */
  } else {
    meta.weekly.progress[key] = (meta.weekly.progress[key] || 0) + amount
  }
  saveMeta()
}

export function markWeeklyWorld(id) {
  if (meta.weekly.week !== weekKey()) {
    meta.weekly = { week: weekKey(), progress: {}, claimed: {}, worldSet: {} }
  }
  if (!id) return
  meta.weekly.worldSet[id] = true
  meta.weekly.progress.weekWorldSet = Object.keys(meta.weekly.worldSet).length
  saveMeta()
}

export function markWorldSeen(id) {
  if (!id) return
  if (!meta.worldsSeen.includes(id)) {
    meta.worldsSeen.push(id)
    saveMeta()
  }
  markWeeklyWorld(id)
  // Daily distinct worlds count this run is tracked in world; also bump unique daily
  setDailyMax('worlds', Math.min(10, (meta.daily.progress.worlds || 0) + 0))
}

export function claimDaily(id) {
  const def = DAILY_MISSION_DEFS.find((m) => m.id === id)
  if (!def) return { ok: false }
  if (meta.daily.day !== todayKey()) {
    meta.daily = { day: todayKey(), progress: {}, claimed: {} }
  }
  if (meta.daily.claimed[id]) return { ok: false, reason: 'claimed' }
  const progress = meta.daily.progress[def.key] || 0
  if (progress < def.target) return { ok: false, reason: 'incomplete' }
  meta.daily.claimed[id] = true
  meta.wallet += def.reward
  meta.dailiesClaimed = (meta.dailiesClaimed || 0) + 1
  bumpWeekly('weekDailies', 1)
  saveMeta()
  return { ok: true, reward: def.reward }
}

export function claimWeekly(id) {
  const def = WEEKLY_MISSION_DEFS.find((m) => m.id === id)
  if (!def) return { ok: false }
  if (meta.weekly.week !== weekKey()) {
    meta.weekly = { week: weekKey(), progress: {}, claimed: {}, worldSet: {} }
  }
  if (meta.weekly.claimed[id]) return { ok: false, reason: 'claimed' }
  const progress = meta.weekly.progress[def.key] || 0
  if (progress < def.target) return { ok: false, reason: 'incomplete' }
  meta.weekly.claimed[id] = true
  meta.wallet += def.reward
  saveMeta()
  return { ok: true, reward: def.reward }
}

export function claimAchievement(id) {
  const def = ACHIEVEMENTS.find((a) => a.id === id)
  if (!def) return { ok: false }
  if (meta.claimedAchievements[id]) return { ok: false, reason: 'claimed' }
  const flags = achievementFlags()
  const value = flags[def.key] ?? meta[def.key] ?? 0
  if (value < def.target) return { ok: false, reason: 'incomplete' }
  meta.claimedAchievements[id] = true
  meta.wallet += def.reward
  saveMeta()
  return { ok: true, reward: def.reward }
}

export function loginRewardStatus(now = new Date()) {
  const today = todayKey(now)
  const already = !!meta.login.claimedDays[today]
  let nextStreak = 1
  if (meta.login.lastClaimDay === yesterdayKey(now)) {
    nextStreak = Math.min(7, (meta.login.streak || 0) + 1)
  } else if (meta.login.lastClaimDay === today) {
    nextStreak = meta.login.streak || 1
  }
  const dayIndex = already ? meta.login.streak : nextStreak
  const reward = DAILY_LOGIN_REWARDS[Math.min(6, Math.max(0, dayIndex - 1))]
  return {
    canClaim: !already,
    dayIndex,
    reward,
    streak: meta.login.streak || 0,
    already,
  }
}

export function claimDailyLogin(now = new Date()) {
  const today = todayKey(now)
  if (meta.login.claimedDays[today]) return { ok: false, reason: 'claimed' }
  let streak = 1
  if (meta.login.lastClaimDay === yesterdayKey(now)) {
    streak = Math.min(7, (meta.login.streak || 0) + 1)
  }
  const reward = DAILY_LOGIN_REWARDS[streak - 1]
  if (!reward) return { ok: false, reason: 'unknown' }
  meta.login.claimedDays[today] = true
  meta.login.lastClaimDay = today
  meta.login.streak = streak
  meta.wallet += reward.coins
  saveMeta()
  return { ok: true, reward: reward.coins, day: streak, special: !!reward.special }
}

export function readLeaderboard() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(LEADERBOARD_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.slice(0, LEADERBOARD_MAX) : []
  } catch {
    return []
  }
}

export function pushLeaderboardEntry({ score, distance, coins, character, mode }) {
  const entry = {
    score: Math.floor(score || 0),
    distance: Math.floor(distance || 0),
    coins: Math.floor(coins || 0),
    character: character || meta.equipped,
    mode: mode || meta.playMode,
    date: new Date().toISOString(),
  }
  const list = readLeaderboard()
  list.push(entry)
  list.sort((a, b) => b.score - a.score || b.distance - a.distance)
  const trimmed = list.slice(0, LEADERBOARD_MAX)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed))
    }
  } catch {
    /* ignore */
  }
  return trimmed
}

export function updateSettings(patch) {
  meta.settings = { ...meta.settings, ...patch }
  saveMeta()
}

function pickMysteryDef(rng = Math.random) {
  const owned = new Set(meta.cosmetics || [])
  const pool = MYSTERY_REWARDS.filter((r) => {
    if (r.kind === 'cosmetic' && owned.has(r.cosmetic)) return false
    return true
  })
  const list = pool.length ? pool : MYSTERY_REWARDS.filter((r) => r.kind !== 'cosmetic')
  const total = list.reduce((s, r) => s + r.weight, 0)
  let roll = rng() * total
  for (const r of list) {
    roll -= r.weight
    if (roll <= 0) return r
  }
  return list[list.length - 1]
}

/**
 * Apply a free mystery-box reward. Powers are returned for the run to activate;
 * coins/cosmetics persist immediately.
 */
export function grantMysteryReward(rng = Math.random) {
  const def = pickMysteryDef(rng)
  meta.mysteryOpened = (meta.mysteryOpened || 0) + 1
  if (def.kind === 'coins') {
    meta.wallet += def.amount
    meta.lifetimeCoins = (meta.lifetimeCoins || 0) + def.amount
    saveMeta()
    return { ok: true, ...def }
  }
  if (def.kind === 'cosmetic') {
    if (!meta.cosmetics.includes(def.cosmetic)) meta.cosmetics.push(def.cosmetic)
    saveMeta()
    return { ok: true, ...def }
  }
  saveMeta()
  return { ok: true, ...def }
}

export function hasCosmetic(id) {
  return (meta.cosmetics || []).includes(id)
}

/** Hours until local midnight (daily reset). */
export function hoursUntilDailyReset(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(0, (next.getTime() - now.getTime()) / 3600000)
}
