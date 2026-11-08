import { useEffect, useState } from 'react'
import {
  Coins,
  Home,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
  Rocket,
  Magnet,
  Disc3,
} from 'lucide-react'
import {
  backToMenu,
  beginRun,
  pauseRun,
  resumeRun,
  skipCatchSequence,
  toggleMute,
} from '../game/world'
import { CONFIG } from '../game/config'
import { useGameStore } from '../game/store'
import { DevPanel } from './DevPanel'
import { MenuScreens } from './MenuScreens'

function format(value) {
  return Math.floor(value || 0).toLocaleString('en-US')
}

function ActivePower({ icon: Icon, label, value, max, tone }) {
  if (!(value > 0)) return null
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 100
  return (
    <div className={`power-mini ${tone || ''}`} title={label}>
      <Icon size={13} />
      <i style={{ width: `${pct}%` }} />
      <em>{max > 0 ? Math.ceil(value) : '!'}</em>
    </div>
  )
}

export function Hud() {
  const status = useGameStore((s) => s.status)
  const score = useGameStore((s) => s.score)
  const best = useGameStore((s) => s.best)
  const coins = useGameStore((s) => s.coins)
  const distance = useGameStore((s) => s.distance)
  const speed = useGameStore((s) => s.speed)
  const combo = useGameStore((s) => s.combo)
  const maxCombo = useGameStore((s) => s.maxCombo)
  const multiplier = useGameStore((s) => s.multiplier)
  const scoreMultiplier = useGameStore((s) => s.scoreMultiplier)
  const toast = useGameStore((s) => s.toast)
  const countdown = useGameStore((s) => s.countdown)
  const biomeName = useGameStore((s) => s.biomeName)
  const biomeBanner = useGameStore((s) => s.biomeBanner)
  const chaseState = useGameStore((s) => s.chaseState)
  const powers = useGameStore((s) => s.powers)
  const trainWarn = useGameStore((s) => s.trainWarn)
  const muted = useGameStore((s) => s.muted)
  const isNewBest = useGameStore((s) => s.isNewBest)
  const hint = useGameStore((s) => s.hint)
  const dismissHint = useGameStore((s) => s.dismissHint)
  const level = useGameStore((s) => s.level)
  const lastXpGain = useGameStore((s) => s.lastXpGain)
  const lastNearMisses = useGameStore((s) => s.lastNearMisses)
  const running = status === 'playing' || status === 'paused' || status === 'catching'
  // Warning only when the dog is very close
  const chaseHot = chaseState === 'close' && status === 'playing'
  const [flashPower, setFlashPower] = useState('')

  // Auto-hide controls hint shortly after a run starts
  useEffect(() => {
    if (status !== 'playing' || !hint) return undefined
    const id = window.setTimeout(() => dismissHint(), 2800)
    return () => window.clearTimeout(id)
  }, [status, hint, dismissHint])

  // Brief feature toast when a power first activates
  useEffect(() => {
    if (!running) return
    const active = ['magnet', 'jetpack', 'shield', 'multiplier', 'hoverboard'].find((k) => powers[k] > 0)
    if (!active) {
      setFlashPower('')
      return
    }
    setFlashPower(active)
    const id = window.setTimeout(() => setFlashPower(''), 1600)
    return () => window.clearTimeout(id)
  }, [powers.magnet > 0, powers.jetpack > 0, powers.shield > 0, powers.multiplier > 0, powers.hoverboard > 0, running])

  return (
    <div className={`hud status-${status}`}>
      {(status === 'paused' || status === 'menu' || status === 'gameover') && <div className="scrim" aria-hidden="true" />}

      <header className="topbar">
        <div className="brand compact">
          <span className="brand-mark">NR</span>
          {status === 'menu' && (
            <div>
              <p className="brand-kicker">Endless runner</p>
              <strong>NEON RUSH 3D</strong>
            </div>
          )}
        </div>
        <div className="stats">
          {running && (
            <>
              <div className="stat score">
                <Zap size={14} />
                <span>{format(score)}</span>
              </div>
              <div className="stat coins">
                <Coins size={14} />
                <span key={coins}>{format(coins)}</span>
              </div>
              <div className="stat dist">
                <span>{format(distance)}m</span>
                <small>{Math.round(speed)}</small>
              </div>
            </>
          )}
          <button type="button" className="icon-btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          {status === 'playing' && (
            <button type="button" className="icon-btn" aria-label="Pause" onClick={pauseRun}>
              <Pause size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Active powers only — corner strip, never center of road */}
      {status === 'playing' && (
        <div className="power-corner">
          <ActivePower icon={Magnet} label="Magnet" value={powers.magnet} max={CONFIG.magnet.duration} tone="gold" />
          <ActivePower icon={Rocket} label="Jetpack" value={powers.jetpack} max={CONFIG.jetpack.duration} tone="cyan" />
          <ActivePower icon={Shield} label="Shield" value={powers.shield} max={0} tone="blue" />
          <ActivePower icon={Sparkles} label="x2" value={powers.multiplier} max={CONFIG.multiplier.duration} tone="pink" />
          <ActivePower icon={Disc3} label="Board" value={powers.hoverboard} max={CONFIG.hoverboard.duration} tone="green" />
        </div>
      )}

      {status === 'playing' && powers.shield > 0 && (
        <div className="endless-shield-chip" title="Shield active — protects one hit (or permanent if God Shield)">
          <Shield size={14} />
          <span>SHIELD</span>
        </div>
      )}

      {status === 'playing' && chaseHot && (
        <div className="chase-pill close" role="status">
          Dog closing in!
        </div>
      )}

      {status === 'playing' && combo > 4 && (
        <div className="combo-corner">
          x{multiplier.toFixed(2)}
          {scoreMultiplier > 1 ? ` · SCORE x${scoreMultiplier}` : ''}
        </div>
      )}

      {running && (
        <div className={`biome-banner ${biomeBanner > 0.08 ? 'show' : ''}`} aria-hidden={biomeBanner <= 0.08}>
          <span>Entering</span>
          <strong>{biomeName}</strong>
        </div>
      )}

      {running && trainWarn > 0.05 && (
        <div className="train-warn" aria-live="assertive">TRAIN APPROACHING</div>
      )}

      {flashPower && status === 'playing' && (
        <div className="feature-flash" key={flashPower}>
          {flashPower === 'magnet' && 'Coin Magnet'}
          {flashPower === 'jetpack' && 'Jetpack'}
          {flashPower === 'shield' && 'Shield'}
          {flashPower === 'multiplier' && 'Score x2'}
          {flashPower === 'hoverboard' && 'Hoverboard'}
        </div>
      )}

      {toast && running && <div className="toast">{toast}</div>}

      {status === 'countdown' && (
        <div className="countdown-overlay" aria-live="polite">
          <p className="countdown-kicker">Get ready</p>
          <div className="countdown-num" key={countdown > 0 ? countdown : 'go'}>
            {countdown > 0 ? countdown : 'GO'}
          </div>
        </div>
      )}

      {status === 'playing' && hint && (
        <p className="hint brief">Swipe left · right · up · down</p>
      )}

      {status === 'menu' && <MenuScreens />}

      {status === 'catching' && (
        <div className="catch-overlay" role="status">
          <p>{chaseState === 'caught' ? 'Arrested!' : 'Caught!'}</p>
          <span className="catch-hint">Hold still…</span>
          <button type="button" className="ghost catch-skip" onClick={skipCatchSequence}>
            Skip
          </button>
        </div>
      )}

      {status === 'paused' && (
        <section className="panel pause-panel enter" aria-label="Paused">
          <div className="panel-glow soft" />
          <p className="eyebrow">Hold signal</p>
          <h1>Paused</h1>
          <div className="results compact">
            <div><span>Score</span><strong>{format(score)}</strong></div>
            <div><span>Coins</span><strong>{format(coins)}</strong></div>
            <div><span>Distance</span><strong>{format(distance)}m</strong></div>
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={resumeRun}><Play size={20} />Resume</button>
            <button type="button" className="ghost" onClick={backToMenu}><Home size={18} />Menu</button>
          </div>
        </section>
      )}

      {status === 'gameover' && (
        <section className="panel crash enter gameover-solid" aria-label="Game over">
          <div className="flash" />
          <div className="panel-glow hot" />
          <p className="eyebrow">Run complete</p>
          <h1>{chaseState === 'caught' ? 'Caught!' : 'Wiped out'}</h1>
          <div className="results">
            <div><span>Score</span><strong>{format(score)}</strong></div>
            <div><span>Coins</span><strong>{format(coins)}</strong></div>
            <div><span>Distance</span><strong>{format(distance)}m</strong></div>
          </div>
          <div className="results compact">
            <div><span>Near misses</span><strong>{format(lastNearMisses || 0)}</strong></div>
            <div><span>Max combo</span><strong>{format(maxCombo)}</strong></div>
            <div><span>World</span><strong>{biomeName.split(' ')[0]}</strong></div>
          </div>
          <div className="results compact">
            <div><span>Level</span><strong>{level}</strong></div>
            <div><span>XP earned</span><strong>+{format(lastXpGain || 0)}</strong></div>
            <div><span>Best</span><strong>{format(best)}</strong></div>
          </div>
          <div className="best-row">
            <Trophy size={18} />
            <span>Personal best {format(best)}</span>
            {isNewBest && <em>New record</em>}
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={beginRun}><RotateCcw size={20} />Restart</button>
            <button type="button" className="ghost" onClick={backToMenu}><Home size={18} />Home</button>
          </div>
        </section>
      )}

      <DevPanel />
    </div>
  )
}
