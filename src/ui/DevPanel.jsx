import { useState } from 'react'
import { CONFIG } from '../game/config'
import {
  debugAddDistance,
  debugArrest,
  debugBiome,
  debugBoostSpeed,
  debugDogBark,
  debugGrant,
  debugNearMiss,
  debugPoliceDialogue,
  debugResetChase,
  debugResetDifficulty,
  debugSpawnCoins,
  debugSpawnObstacle,
  debugSpawnTrain,
  debugSpawnVehicle,
  debugToggleGodShield,
  debugTriggerChase,
  skipCatchSequence,
  world,
} from '../game/world'
import { useGameStore } from '../game/store'

export function DevPanel() {
  if (!import.meta.env.DEV) return null
  const status = useGameStore((s) => s.status)
  const powers = useGameStore((s) => s.powers)
  const [open, setOpen] = useState(false)
  const [, tick] = useState(0)
  if (status === 'menu' || status === 'countdown') return null

  return (
    <div className={`dev-panel ${open ? 'open' : 'collapsed'}`} aria-label="Developer testing panel">
      <button type="button" className="dev-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'DEV ✕' : 'DEV'}
      </button>
      {open && (
        <>
          <button
            type="button"
            onClick={() => {
              debugToggleGodShield()
              tick((n) => n + 1)
            }}
          >
            {world.godShield ? 'God Shield: ON' : 'God Shield: OFF'}
          </button>
          <button type="button" onClick={() => debugPoliceDialogue('lawOath')}>Law Oath VO</button>
          <button type="button" onClick={() => debugPoliceDialogue('chase')}>Police Dialogue</button>
          <button type="button" onClick={() => debugPoliceDialogue('gameover')}>Arrest Voice</button>
          <button type="button" onClick={() => debugDogBark()}>Dog Bark</button>
          <button type="button" onClick={() => debugNearMiss()}>Simulate Near Miss</button>
          <button type="button" onClick={() => debugArrest('caught')}>Trigger Arrest</button>
          <button type="button" onClick={() => skipCatchSequence()}>Skip Arrest</button>
          <button type="button" onClick={() => debugResetChase()}>Reset Chase</button>
          <button type="button" onClick={() => debugGrant('shield')}>Activate Shield</button>
          <button type="button" onClick={() => debugSpawnObstacle('barrier')}>Spawn Obstacle</button>
          <button type="button" onClick={() => debugGrant('magnet')}>Activate Magnet</button>
          <button type="button" onClick={() => debugSpawnCoins(15)}>Spawn Coins</button>
          <button type="button" onClick={() => debugTriggerChase()}>Trigger Dog Chase</button>
          <button type="button" onClick={() => debugBiome(1)}>Next Daytime Biome</button>
          <button type="button" onClick={() => debugBiome(-1)}>Prev Biome</button>
          <button type="button" onClick={() => debugAddDistance(100)}>+100m</button>
          <button type="button" onClick={() => debugSpawnVehicle('car')}>Spawn Car</button>
          <button type="button" onClick={() => debugSpawnTrain()}>Spawn Train</button>
          <button type="button" onClick={() => debugBoostSpeed()}>+Speed</button>
          <button type="button" onClick={() => debugResetDifficulty()}>Reset Diff</button>
          <button type="button" onClick={() => debugGrant('jetpack')}>Jetpack</button>
          <button type="button" onClick={() => debugGrant('hoverboard')}>Hoverboard</button>
          <span>
            {world.biomeId} · {Math.floor(world.distance)}m · {world.godShield ? 'GOD' : `shield ${powers.shield}`} · magnet {(powers.magnet || 0).toFixed?.(1) ?? powers.magnet} · chase {(world.chase.tension * 100) | 0}% · NM {world.chase.nearMissBoost.toFixed?.(1) ?? 0}
          </span>
        </>
      )}
    </div>
  )
}
