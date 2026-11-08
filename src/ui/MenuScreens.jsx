import { useEffect, useState } from 'react'
import {
  Award,
  Check,
  Coins,
  Gift,
  Lock,
  Play,
  Settings,
  ShoppingBag,
  Target,
  Trophy,
  Volume2,
} from 'lucide-react'
import { unlockAudio, playClaim, playUnlock, setMusicEnabled } from '../game/audio'
import { AudioMenuPanel } from './AudioDevPanel'
import {
  ACHIEVEMENTS,
  CHARACTERS,
  DAILY_LOGIN_REWARDS,
  DAILY_MISSION_DEFS,
  ECONOMY,
  HOVERBOARDS,
  PLAY_MODES,
  WEEKLY_MISSION_DEFS,
  getCharacter,
  hoursUntilDailyReset,
} from '../game/meta'
import { beginRun } from '../game/world'
import { useGameStore } from '../game/store'
import { ShopPreview } from './ShopPreview'

function format(value) {
  return Math.floor(value || 0).toLocaleString('en-US')
}

function Progress({ value, max }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className="mission-bar">
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

function Celebrate({ celebrate, message }) {
  if (!celebrate || !message) return null
  return (
    <p className="shop-msg celebrate" key={celebrate}>
      {message}
    </p>
  )
}

export function MenuScreens() {
  const screen = useGameStore((s) => s.screen)
  const wallet = useGameStore((s) => s.wallet)
  const best = useGameStore((s) => s.best)
  const totalDistance = useGameStore((s) => s.totalDistance)
  const bestDistance = useGameStore((s) => s.bestDistance)
  const unlocked = useGameStore((s) => s.unlocked)
  const equipped = useGameStore((s) => s.equipped)
  const boardsUnlocked = useGameStore((s) => s.boardsUnlocked)
  const boardEquipped = useGameStore((s) => s.boardEquipped)
  const daily = useGameStore((s) => s.daily)
  const claimedAchievements = useGameStore((s) => s.claimedAchievements)
  const settings = useGameStore((s) => s.settings)
  const shopMessage = useGameStore((s) => s.shopMessage)
  const celebrate = useGameStore((s) => s.celebrate)
  const setScreen = useGameStore((s) => s.setScreen)
  const purchase = useGameStore((s) => s.purchase)
  const purchaseBoard = useGameStore((s) => s.purchaseBoard)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const selectBoard = useGameStore((s) => s.selectBoard)
  const claimMission = useGameStore((s) => s.claimMission)
  const claimAchieve = useGameStore((s) => s.claimAchieve)
  const claimLogin = useGameStore((s) => s.claimLogin)
  const patchSettings = useGameStore((s) => s.patchSettings)
  const runs = useGameStore((s) => s.runs)
  const unlockCount = useGameStore((s) => s.unlockCount)
  const boardUnlockCount = useGameStore((s) => s.boardUnlockCount)
  const lifetimeCoins = useGameStore((s) => s.lifetimeCoins)
  const level = useGameStore((s) => s.level)
  const xpPct = useGameStore((s) => s.xpPct)
  const xpInto = useGameStore((s) => s.xpInto)
  const xpNeed = useGameStore((s) => s.xpNeed)
  const loginStatus = useGameStore((s) => s.loginStatus)
  const leaderboard = useGameStore((s) => s.leaderboard)
  const playMode = useGameStore((s) => s.playMode)
  const bestEndless = useGameStore((s) => s.bestEndless)
  const bestDistanceNormal = useGameStore((s) => s.bestDistanceNormal)
  const bestDistanceEndless = useGameStore((s) => s.bestDistanceEndless)
  const weekly = useGameStore((s) => s.weekly)
  const setPlayMode = useGameStore((s) => s.setPlayMode)
  const claimWeeklyMission = useGameStore((s) => s.claimWeeklyMission)

  const [shopTab, setShopTab] = useState('characters')
  const [previewChar, setPreviewChar] = useState(equipped)
  const [previewBoard, setPreviewBoard] = useState(boardEquipped)
  const [missionTab, setMissionTab] = useState('daily')
  const [dailyPopup, setDailyPopup] = useState(false)
  const [claimFx, setClaimFx] = useState('')

  useEffect(() => {
    if (screen === 'home' && loginStatus?.canClaim) {
      const key = `nr-daily-popup-${new Date().toDateString()}`
      try {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1')
          setDailyPopup(true)
        }
      } catch {
        setDailyPopup(true)
      }
    }
  }, [screen, loginStatus?.canClaim])

  useEffect(() => {
    setPreviewChar(equipped)
    setPreviewBoard(boardEquipped)
  }, [equipped, boardEquipped, screen])

  const start = () => {
    unlockAudio()
    beginRun()
  }

  if (screen === 'shop') {
    return (
      <section className="panel menu-panel enter shop-panel" aria-label="Shop">
        <div className="panel-glow" />
        <div className="menu-top">
          <button type="button" className="ghost tiny" onClick={() => setScreen('home')}>Back</button>
          <h2>Shop</h2>
          <div className="wallet-chip"><Coins size={14} />{format(wallet)}</div>
        </div>
        <div className="shop-tabs">
          <button type="button" className={shopTab === 'characters' ? 'active' : ''} onClick={() => setShopTab('characters')}>
            Characters
          </button>
          <button type="button" className={shopTab === 'boards' ? 'active' : ''} onClick={() => setShopTab('boards')}>
            Hoverboards
          </button>
        </div>
        <ShopPreview
          mode={shopTab === 'boards' ? 'board' : 'character'}
          characterId={previewChar}
          boardId={previewBoard}
        />
        <Celebrate celebrate={celebrate} message={shopMessage} />
        {!celebrate && shopMessage && <p className="shop-msg">{shopMessage}</p>}
        <div className="char-grid">
          {shopTab === 'characters'
            ? CHARACTERS.map((char) => {
                const owned = unlocked.includes(char.id)
                const price = ECONOMY.characterPrices[char.id]
                const active = equipped === char.id
                return (
                  <article
                    key={char.id}
                    className={`char-card ${active ? 'active' : ''}`}
                    onMouseEnter={() => setPreviewChar(char.id)}
                    onFocus={() => setPreviewChar(char.id)}
                  >
                    <div className="char-swatch" style={{ background: `linear-gradient(135deg, ${char.colors.top}, ${char.colors.accent})` }} />
                    <h3>{char.name}</h3>
                    <p>{char.blurb}</p>
                    {owned ? (
                      <button type="button" className={active ? 'primary' : 'ghost'} onClick={() => selectCharacter(char.id)}>
                        {active ? <><Check size={16} /> Equipped</> : 'Equip'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          const r = purchase(char.id)
                          if (r.ok) playUnlock()
                        }}
                      >
                        <Lock size={14} /> Unlock · {price}
                      </button>
                    )}
                  </article>
                )
              })
            : HOVERBOARDS.map((board) => {
                const owned = board.id === 'none' || boardsUnlocked.includes(board.id)
                const price = ECONOMY.boardPrices[board.id]
                const active = boardEquipped === board.id
                return (
                  <article
                    key={board.id}
                    className={`char-card ${active ? 'active' : ''}`}
                    onMouseEnter={() => setPreviewBoard(board.id)}
                    onFocus={() => setPreviewBoard(board.id)}
                  >
                    <div
                      className="char-swatch"
                      style={{
                        background:
                          board.id === 'none'
                            ? 'linear-gradient(135deg, #334155, #0f172a)'
                            : `linear-gradient(135deg, ${board.color}, ${board.emissive})`,
                      }}
                    />
                    <h3>{board.name}</h3>
                    <p>{board.blurb}</p>
                    {owned ? (
                      <button type="button" className={active ? 'primary' : 'ghost'} onClick={() => selectBoard(board.id)}>
                        {active ? <><Check size={16} /> Equipped</> : 'Equip'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          const r = purchaseBoard(board.id)
                          if (r.ok) playUnlock()
                        }}
                      >
                        <Lock size={14} /> Unlock · {price}
                      </button>
                    )}
                  </article>
                )
              })}
        </div>
      </section>
    )
  }

  if (screen === 'rewards') {
    return (
      <section className="panel menu-panel enter" aria-label="Daily rewards">
        <div className="panel-glow soft" />
        <div className="menu-top">
          <button type="button" className="ghost tiny" onClick={() => setScreen('home')}>Back</button>
          <h2>Daily Rewards</h2>
          <div className="wallet-chip"><Coins size={14} />{format(wallet)}</div>
        </div>
        <p className="lede tight">One claim per local calendar day. Miss a day and the streak resets.</p>
        <Celebrate celebrate={celebrate} message={shopMessage} />
        <div className="login-grid">
          {DAILY_LOGIN_REWARDS.map((r) => {
            const reached = (loginStatus.streak || 0) >= r.day || (!loginStatus.already && loginStatus.dayIndex === r.day)
            const claimed = loginStatus.already && (loginStatus.streak || 0) >= r.day
            const todaySlot = !loginStatus.already && loginStatus.dayIndex === r.day
            return (
              <div key={r.day} className={`login-day ${r.special ? 'special' : ''} ${claimed ? 'claimed' : ''} ${todaySlot ? 'today' : ''}`}>
                <span>{r.label}</span>
                <strong>{r.coins}</strong>
                {claimed && <em>Done</em>}
                {todaySlot && <em>Ready</em>}
                {!claimed && !todaySlot && reached && <em>·</em>}
              </div>
            )
          })}
        </div>
        <div className="actions">
          <button
            type="button"
            className="primary"
            disabled={!loginStatus.canClaim}
            onClick={() => {
              const r = claimLogin()
              if (r.ok) playClaim()
            }}
          >
            <Gift size={18} /> {loginStatus.canClaim ? `Claim Day ${loginStatus.dayIndex}` : 'Come back tomorrow'}
          </button>
        </div>
      </section>
    )
  }

  if (screen === 'missions') {
    const defs = missionTab === 'weekly' ? WEEKLY_MISSION_DEFS : DAILY_MISSION_DEFS
    const bag = missionTab === 'weekly' ? weekly : daily
    const resetHrs = hoursUntilDailyReset().toFixed(1)
    return (
      <section className="panel menu-panel enter" aria-label="Missions">
        <div className="panel-glow soft" />
        <div className="menu-top">
          <button type="button" className="ghost tiny" onClick={() => setScreen('home')}>Back</button>
          <h2>Missions</h2>
          <div className="wallet-chip"><Coins size={14} />{format(wallet)}</div>
        </div>
        <div className="shop-tabs">
          <button type="button" className={missionTab === 'daily' ? 'active' : ''} onClick={() => setMissionTab('daily')}>
            Daily
          </button>
          <button type="button" className={missionTab === 'weekly' ? 'active' : ''} onClick={() => setMissionTab('weekly')}>
            Weekly
          </button>
        </div>
        <p className="lede tight">
          {missionTab === 'daily'
            ? `Resets in ~${resetHrs}h (local midnight). Progress from real runs only.`
            : 'Harder weekly goals. Claim once per week.'}
        </p>
        <Celebrate celebrate={celebrate} message={shopMessage} />
        <ul className="mission-list">
          {defs.map((m) => {
            const progress = bag?.progress?.[m.key] || 0
            const done = progress >= m.target
            const claimed = !!bag?.claimed?.[m.id]
            return (
              <li key={m.id}>
                <div>
                  <strong>{m.label}</strong>
                  <span>{Math.min(progress, m.target)} / {m.target}</span>
                  <Progress value={progress} max={m.target} />
                </div>
                {claimed ? (
                  <em className="done">Claimed</em>
                ) : (
                  <button
                    type="button"
                    className="ghost tiny"
                    disabled={!done}
                    onClick={() => {
                      const r = missionTab === 'weekly' ? claimWeeklyMission(m.id) : claimMission(m.id)
                      if (r.ok) playClaim()
                    }}
                  >
                    +{m.reward}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  if (screen === 'achievements') {
    const values = {
      runs,
      lifetimeCoins,
      bestDistance,
      bestDistanceNormal: bestDistanceNormal || bestDistance,
      bestScoreNormal: best,
      unlockCount,
      boardUnlockCount,
      level,
      worldsSeen: (useGameStore.getState().worldsSeen || []).length,
      lifetimeNearMisses: useGameStore.getState().lifetimeNearMisses || 0,
      dailiesClaimed: useGameStore.getState().dailiesClaimed || 0,
      hasFireBoard: boardsUnlocked.includes('fire') ? 1 : 0,
      hasRobo: unlocked.includes('robo') ? 1 : 0,
      hasGolden: unlocked.includes('golden') ? 1 : 0,
    }
    return (
      <section className="panel menu-panel enter" aria-label="Achievements">
        <div className="panel-glow soft" />
        <div className="menu-top">
          <button type="button" className="ghost tiny" onClick={() => setScreen('home')}>Back</button>
          <h2>Achievements</h2>
          <div className="wallet-chip"><Coins size={14} />{format(wallet)}</div>
        </div>
        <Celebrate celebrate={celebrate} message={shopMessage} />
        <ul className="mission-list">
          {ACHIEVEMENTS.map((a) => {
            const progress = values[a.key] || 0
            const done = progress >= a.target
            const claimed = !!claimedAchievements[a.id]
            return (
              <li key={a.id}>
                <div>
                  <strong>{a.label}</strong>
                  <span>{a.blurb}</span>
                  <Progress value={progress} max={a.target} />
                </div>
                {claimed ? (
                  <em className="done">Claimed</em>
                ) : (
                  <button
                    type="button"
                    className="ghost tiny"
                    disabled={!done}
                    onClick={() => {
                      const r = claimAchieve(a.id)
                      if (r.ok) playClaim()
                    }}
                  >
                    +{a.reward}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  if (screen === 'leaderboard') {
    return (
      <section className="panel menu-panel enter" aria-label="Personal bests">
        <div className="panel-glow soft" />
        <div className="menu-top">
          <button type="button" className="ghost tiny" onClick={() => setScreen('home')}>Back</button>
          <h2>Your Bests</h2>
          <span />
        </div>
        <p className="lede tight">Local personal records on this device — not a global leaderboard.</p>
        {leaderboard.length === 0 ? (
          <p className="lede">No runs saved yet. Finish a run to post a score.</p>
        ) : (
          <ul className="leader-list">
            {leaderboard.map((row, i) => (
              <li key={`${row.date}-${i}`}>
                <strong>#{i + 1}</strong>
                <div>
                  <span>{format(row.score)} pts · {format(row.distance)}m</span>
                  <em>{getCharacter(row.character).name} · {new Date(row.date).toLocaleDateString()}</em>
                </div>
                <span className="leader-coins"><Coins size={12} />{format(row.coins)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  if (screen === 'settings') {
    const requestFs = () => {
      const el = document.documentElement
      if (!document.fullscreenElement && el.requestFullscreen) void el.requestFullscreen()
      else if (document.exitFullscreen) void document.exitFullscreen()
    }
    return (
      <section className="panel menu-panel enter" aria-label="Settings">
        <div className="panel-glow soft" />
        <div className="menu-top">
          <button type="button" className="ghost tiny" onClick={() => setScreen('home')}>Back</button>
          <h2>Settings</h2>
          <span />
        </div>
        <div className="settings-list">
          <button type="button" className="ghost" onClick={() => setScreen('audio')}>
            <Volume2 size={18} /> Open Audio
          </button>
          <label>
            <span>Graphics</span>
            <select
              value={settings.graphics || 'high'}
              onChange={(e) => patchSettings({ graphics: e.target.value })}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="auto">Auto</option>
            </select>
          </label>
          <label>
            <span>Reduced motion</span>
            <input
              type="checkbox"
              checked={!!settings.reducedMotion}
              onChange={(e) => patchSettings({ reducedMotion: e.target.checked })}
            />
          </label>
          <button type="button" className="ghost" onClick={requestFs}>
            Toggle fullscreen
          </button>
          <p className="lede tight">Controls: swipe left/right · up jump · down slide · P pause</p>
        </div>
      </section>
    )
  }

  if (screen === 'audio') {
    return (
      <section className="panel menu-panel enter" aria-label="Audio">
        <div className="panel-glow soft" />
        <div className="menu-top">
          <button type="button" className="ghost tiny" onClick={() => setScreen('home')}>Back</button>
          <h2>Audio</h2>
          <span />
        </div>
        <div className="settings-list">
          <label>
            <span>Music</span>
            <input
              type="checkbox"
              checked={!!settings.music}
              onChange={(e) => {
                unlockAudio()
                patchSettings({ music: e.target.checked })
                setMusicEnabled(e.target.checked)
              }}
            />
          </label>
          <label>
            <span>Sound effects</span>
            <input
              type="checkbox"
              checked={!!settings.sfx}
              onChange={(e) => {
                unlockAudio()
                patchSettings({ sfx: e.target.checked })
              }}
            />
          </label>
          <label className="slider">
            <span>Music volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVol ?? 0.35}
              onChange={(e) => patchSettings({ musicVol: Number(e.target.value) })}
            />
          </label>
          <label className="slider">
            <span>SFX volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVol ?? 0.7}
              onChange={(e) => patchSettings({ sfxVol: Number(e.target.value) })}
            />
          </label>
          <label className="slider">
            <span>Police voice</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.voiceVol ?? 0.85}
              onChange={(e) => patchSettings({ voiceVol: Number(e.target.value) })}
            />
          </label>
          <label className="slider">
            <span>Dog barking</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.barkVol ?? 0.75}
              onChange={(e) => patchSettings({ barkVol: Number(e.target.value) })}
            />
          </label>
        </div>
        <p className="lede tight audio-note">Voice lines stay audio-only (no subtitles). After 1 km, lines rotate so they feel fresher.</p>
        <AudioMenuPanel embedded />
      </section>
    )
  }

  return (
    <section className="panel menu-panel enter home-panel premium-home" aria-label="Main menu">
      <div className="panel-glow" />
      <div className="home-scroll">
        <div className="home-top-row">
          <div className="home-wallet">
            <Coins size={16} />
            <strong>{format(wallet)}</strong>
          </div>
          <div className="level-chip home-level">
            <span>Lv {level}</span>
            <div className="mission-bar slim"><i style={{ width: `${xpPct}%` }} /></div>
          </div>
        </div>
        <h1 className="home-title">NEON RUSH <em>3D</em></h1>
        <div className="home-preview-wrap hero-preview">
          <ShopPreview mode="character" characterId={equipped} boardId={boardEquipped} />
        </div>
        <div className="mode-toggle" role="group" aria-label="Play mode">
          <button
            type="button"
            className={playMode !== PLAY_MODES.endless ? 'active' : ''}
            onClick={() => setPlayMode(PLAY_MODES.normal)}
          >
            Normal
          </button>
          <button
            type="button"
            className={playMode === PLAY_MODES.endless ? 'active' : ''}
            onClick={() => setPlayMode(PLAY_MODES.endless)}
          >
            Endless
          </button>
        </div>
        <div className="best-row">
          <Trophy size={18} />
          <span>Best {format(best)}</span>
          <em>{format(bestDistanceNormal || bestDistance)}m</em>
        </div>
        <div className="meta-row">
          <span>{getCharacter(equipped).name}</span>
          <span>Endless {format(bestEndless)}</span>
        </div>
        {loginStatus.canClaim && (
          <button type="button" className="gift-banner" onClick={() => setDailyPopup(true)}>
            <Gift size={16} /> Daily reward ready — Day {loginStatus.dayIndex}
          </button>
        )}
        <div className="actions home-actions">
          <button type="button" className="primary play-xl" onClick={start}>
            <Play size={22} /> Play
          </button>
          <button type="button" className="ghost" onClick={() => { setShopTab('characters'); setScreen('shop') }}>
            <ShoppingBag size={18} /> Characters
          </button>
          <button type="button" className="ghost" onClick={() => { setShopTab('boards'); setScreen('shop') }}>
            <ShoppingBag size={18} /> Boards
          </button>
          <button type="button" className="ghost" onClick={() => setScreen('missions')}>
            <Target size={18} /> Missions
          </button>
          <button type="button" className="ghost" onClick={() => setScreen('rewards')}>
            <Gift size={18} /> Daily Rewards
          </button>
          <button type="button" className="ghost" onClick={() => setScreen('achievements')}>
            <Award size={18} /> Achievements
          </button>
          <button type="button" className="ghost" onClick={() => setScreen('leaderboard')}>
            <Trophy size={18} /> Bests
          </button>
          <button type="button" className="ghost" onClick={() => setScreen('settings')}>
            <Settings size={18} /> Settings
          </button>
          <button type="button" className="ghost" onClick={() => { unlockAudio(); setScreen('audio') }}>
            <Volume2 size={18} /> Audio
          </button>
        </div>
      </div>

      {dailyPopup && loginStatus.canClaim && (
        <div className="daily-modal" role="dialog" aria-label="Daily reward">
          <div className="daily-card">
            <p className="eyebrow">Daily login</p>
            <h2>Day {loginStatus.dayIndex}</h2>
            <p className="lede tight">Claim <strong>{format(loginStatus.reward?.coins || 0)}</strong> coins</p>
            {claimFx && <p className="shop-msg celebrate">{claimFx}</p>}
            <div className="actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const r = claimLogin()
                  if (r.ok) {
                    playClaim()
                    setClaimFx(`+${format(r.reward)} coins!`)
                    window.setTimeout(() => setDailyPopup(false), 900)
                  }
                }}
              >
                <Gift size={18} /> Claim
              </button>
              <button type="button" className="ghost" onClick={() => setDailyPopup(false)}>Later</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
