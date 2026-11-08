import { create } from 'zustand'
import {
  ACHIEVEMENTS,
  bankRunRewards,
  buyCharacter,
  buyHoverboard,
  claimAchievement,
  claimDaily,
  claimDailyLogin,
  claimWeekly,
  equipCharacter,
  equipHoverboard,
  loginRewardStatus,
  meta,
  PLAY_MODES,
  pushLeaderboardEntry,
  readLeaderboard,
  refreshMetaFromStorage,
  saveMeta,
  setPlayMode,
  updateSettings,
  xpProgress,
} from './meta'

const BEST_NORMAL_KEY = 'neon-rush-3d-best-normal'
const BEST_ENDLESS_KEY = 'neon-rush-3d-best-endless'
const STORAGE_KEY = 'neon-rush-3d-highscore' // legacy

function readBestKey(key) {
  try {
    if (typeof localStorage === 'undefined') return 0
    const value = Number(localStorage.getItem(key))
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function writeBestKey(key, value) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(key, String(Math.floor(value)))
  } catch {
    /* ignore */
  }
}

function readBest() {
  const legacy = readBestKey(STORAGE_KEY)
  const normal = Math.max(readBestKey(BEST_NORMAL_KEY), meta.bestScoreNormal || 0, legacy)
  return normal
}

function readBestEndless() {
  return Math.max(readBestKey(BEST_ENDLESS_KEY), meta.bestScoreEndless || 0)
}

function metaSlice() {
  refreshMetaFromStorage()
  const xp = xpProgress(meta.xp)
  return {
    wallet: meta.wallet,
    equipped: meta.equipped,
    unlocked: [...meta.unlocked],
    boardEquipped: meta.boardEquipped,
    boardsUnlocked: [...meta.boardsUnlocked],
    totalDistance: meta.totalDistance,
    bestDistance: meta.bestDistance,
    bestDistanceNormal: meta.bestDistanceNormal || 0,
    bestDistanceEndless: meta.bestDistanceEndless || 0,
    bestScoreNormal: meta.bestScoreNormal || readBest(),
    bestScoreEndless: meta.bestScoreEndless || readBestEndless(),
    playMode: meta.playMode || PLAY_MODES.normal,
    lifetimeCoins: meta.lifetimeCoins,
    daily: { ...meta.daily, progress: { ...meta.daily.progress }, claimed: { ...meta.daily.claimed } },
    weekly: {
      ...meta.weekly,
      progress: { ...(meta.weekly?.progress || {}) },
      claimed: { ...(meta.weekly?.claimed || {}) },
    },
    claimedAchievements: { ...meta.claimedAchievements },
    settings: { ...meta.settings },
    unlockCount: meta.unlockCount,
    boardUnlockCount: meta.boardUnlockCount,
    runs: meta.runs,
    xp: meta.xp,
    level: meta.level,
    xpPct: xp.pct,
    xpInto: xp.into,
    xpNeed: xp.need,
    login: { ...meta.login, claimedDays: { ...meta.login.claimedDays } },
    loginStatus: loginRewardStatus(),
    leaderboard: readLeaderboard(),
    worldsSeen: [...(meta.worldsSeen || [])],
    lifetimeNearMisses: meta.lifetimeNearMisses || 0,
    dailiesClaimed: meta.dailiesClaimed || 0,
  }
}

export const useGameStore = create((set, get) => ({
  status: 'menu',
  screen: 'home',
  score: 0,
  best: readBest(),
  bestEndless: readBestEndless(),
  playMode: meta.playMode || PLAY_MODES.normal,
  endlessShield: meta.playMode === PLAY_MODES.endless,
  coins: 0,
  distance: 0,
  speed: 0,
  combo: 0,
  maxCombo: 0,
  multiplier: 1,
  scoreMultiplier: 1,
  toast: '',
  subtitle: '',
  countdown: 0,
  biomeName: 'Sunny Modern City',
  biomeBanner: 0,
  chaseState: 'far',
  chaseTension: 0.2,
  powers: { magnet: 0, jetpack: 0, shield: 0, multiplier: 0, hoverboard: 0 },
  flying: false,
  trainWarn: 0,
  muted: !meta.settings.sfx,
  isNewBest: false,
  hint: true,
  shopMessage: '',
  celebrate: 0,
  lastXpGain: 0,
  lastNearMisses: 0,
  ...metaSlice(),

  begin() {
    set({
      status: 'countdown',
      screen: 'home',
      score: 0,
      coins: 0,
      distance: 0,
      speed: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      scoreMultiplier: 1,
      toast: '',
      countdown: 3,
      biomeName: 'Sunny Modern City',
      biomeBanner: 0,
      chaseState: 'far',
      chaseTension: 0.2,
      powers: { magnet: 0, jetpack: 0, shield: 0, multiplier: 0, hoverboard: 0 },
      flying: false,
      trainWarn: 0,
      isNewBest: false,
      hint: true,
      shopMessage: '',
      celebrate: 0,
      lastXpGain: 0,
      lastNearMisses: 0,
    })
  },
  sync(patch) {
    set(patch)
  },
  dismissHint() {
    if (get().hint) set({ hint: false })
  },
  pause() {
    if (get().status === 'playing') set({ status: 'paused' })
  },
  resume() {
    if (get().status === 'paused') set({ status: 'playing' })
  },
  end(score, coins, distance, maxCombo, extras = {}) {
    const mode = extras.mode || meta.playMode || PLAY_MODES.normal
    const endless = mode === PLAY_MODES.endless
    const prevKey = endless ? BEST_ENDLESS_KEY : BEST_NORMAL_KEY
    const previous = endless ? get().bestEndless : get().best
    const best = Math.max(previous, score)
    const isNewBest = score > previous
    if (isNewBest) writeBestKey(prevKey, best)
    if (!endless) writeBestKey(STORAGE_KEY, Math.max(readBestKey(STORAGE_KEY), best))
    const banked = bankRunRewards({
      coins,
      distance,
      score,
      mode,
      nearMisses: extras.nearMisses || 0,
      worlds: extras.worlds || [],
    })
    pushLeaderboardEntry({
      score,
      distance,
      coins,
      character: meta.equipped,
      mode,
    })
    set({
      status: 'gameover',
      score,
      coins,
      distance,
      maxCombo: maxCombo || get().maxCombo,
      best: endless ? get().best : best,
      bestEndless: endless ? best : get().bestEndless,
      isNewBest,
      hint: false,
      toast: banked.coins > 0 ? `+${banked.coins} coins · +${banked.xp} XP` : `+${banked.xp} XP`,
      countdown: 0,
      flying: false,
      lastXpGain: banked.xp,
      lastNearMisses: extras.nearMisses || 0,
      ...metaSlice(),
    })
  },
  setPlayMode(mode) {
    const next = setPlayMode(mode)
    set({ playMode: next, endlessShield: next === PLAY_MODES.endless, ...metaSlice() })
  },
  claimWeeklyMission(id) {
    const result = claimWeekly(id)
    if (result.ok) set({ shopMessage: `+${result.reward} coins`, celebrate: Date.now(), ...metaSlice() })
    return result
  },
  menu() {
    set({ status: 'menu', screen: 'home', hint: true, toast: '', countdown: 0, biomeBanner: 0, celebrate: 0, ...metaSlice() })
  },
  setScreen(screen) {
    set({ screen, shopMessage: '', celebrate: 0, ...metaSlice() })
  },
  purchase(id) {
    const result = buyCharacter(id)
    if (result.ok) set({ shopMessage: 'Character unlocked!', celebrate: Date.now(), ...metaSlice() })
    else if (result.reason === 'owned') set({ shopMessage: 'Already owned' })
    else if (result.reason === 'funds') set({ shopMessage: 'Not enough coins' })
    else set({ shopMessage: 'Unavailable' })
    return result
  },
  purchaseBoard(id) {
    const result = buyHoverboard(id)
    if (result.ok) set({ shopMessage: 'Hoverboard unlocked!', celebrate: Date.now(), ...metaSlice() })
    else if (result.reason === 'owned') set({ shopMessage: 'Already owned' })
    else if (result.reason === 'funds') set({ shopMessage: 'Not enough coins' })
    else set({ shopMessage: 'Unavailable' })
    return result
  },
  selectCharacter(id) {
    if (equipCharacter(id)) set({ shopMessage: 'Equipped', ...metaSlice() })
  },
  selectBoard(id) {
    if (equipHoverboard(id)) set({ shopMessage: 'Board equipped', ...metaSlice() })
  },
  claimMission(id) {
    const result = claimDaily(id)
    if (result.ok) set({ shopMessage: `+${result.reward} coins`, celebrate: Date.now(), ...metaSlice() })
    return result
  },
  claimAchieve(id) {
    const result = claimAchievement(id)
    if (result.ok) set({ shopMessage: `+${result.reward} coins`, celebrate: Date.now(), ...metaSlice() })
    return result
  },
  claimLogin() {
    const result = claimDailyLogin()
    if (result.ok) {
      set({
        shopMessage: result.special ? `Day ${result.day} bonus! +${result.reward}` : `Day ${result.day} · +${result.reward}`,
        celebrate: Date.now(),
        ...metaSlice(),
      })
    } else if (result.reason === 'claimed') set({ shopMessage: 'Already claimed today' })
    return result
  },
  patchSettings(patch) {
    updateSettings(patch)
    set({ muted: !meta.settings.sfx, ...metaSlice() })
  },
  refreshMeta() {
    set(metaSlice())
  },
  getAchievements: () => ACHIEVEMENTS,
}))

export function persistMute(muted) {
  updateSettings({ sfx: !muted })
  saveMeta()
}
