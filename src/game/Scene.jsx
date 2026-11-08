import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { CONFIG } from './config'
import { Chase } from './Chase'
import { PowerupField, PlayerAuras } from './Powerups'
import { Board } from './Board'
import { Runner } from './Runner'
import { Track } from './Track'
import { TrafficField } from './Traffic'
import { meta } from './meta'
import { isMobileClient, resolveDprCap } from './perf'
import { step, world } from './world'

function Simulator() {
  useFrame((_, dt) => {
    // Cap spikes so a hitch doesn't feel like a long freeze
    step(Math.min(dt, 0.05))
  })
  return null
}

function CameraRig() {
  const camera = useThree((state) => state.camera)
  const look = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const cam = CONFIG.camera

  useFrame((_, dt) => {
    const player = world.player
    const soft = Math.min(0.05, Math.max(0.008, dt))
    const menu = world.status === 'menu'
    const catching = world.status === 'catching'
    const playing = world.status === 'playing'
    const closeChase = world.chase.state === 'close' || catching
    const reduced = !!meta.settings?.reducedMotion
    const swayAmp = reduced ? 0 : menu ? 0.55 : cam.runSway
    const bobAmp = reduced ? 0 : menu ? 0.08 : cam.runBob
    const sway = Math.sin(world.elapsed * (menu ? 0.32 : 0.85)) * swayAmp
    const bob = Math.sin(world.elapsed * (menu ? 0.5 : 5.2)) * bobAmp
    const hardShake = world.hitFlash > 0.45 && !reduced
    const land = world.landShake > 0 && !reduced
    const flyLift = player.fly * 1.1
    const onTrain = player.onRoof || player.fallingFromRoof
    // Follow real player height (roof / fall) instead of a flat roof offset
    const heightFollow = player.y * (onTrain ? 0.48 : 0.22)
    const chasePull = closeChase ? 0.55 + world.chase.tension * 0.35 : 0
    const nearBoost = world.chase.nearMissBoost > 0
    const slowPunch = world.timeScale < 0.95 && playing ? 0.12 : 0
    const trainBob = player.onRoof && !reduced ? Math.sin(world.elapsed * 11.5) * 0.03 : 0

    if (catching) {
      const t = world.chase.catchPhase
      desired.set(player.x + 2.4 + t * 0.4, 2.1 + t * 0.35, -1.2 + t * 0.8)
      look.set(player.x - 0.2, 1.05, 0.4)
    } else {
      desired.set(
        player.x * 0.32 + sway * 0.5,
        2.75 + heightFollow + bob * 0.4 + flyLift * 0.25 + trainBob + (nearBoost ? 0.06 : 0),
        -7.45 - player.fly * 0.35 - chasePull * 0.3 - (onTrain ? 0.25 : 0) - (nearBoost ? 0.18 : 0) - slowPunch,
      )
      look.set(player.x * 0.1, 0.72 + player.y * (onTrain ? 0.32 : 0.14) + flyLift * 0.15, 12)
    }

    // Slightly softer follow on train so board/fall feels weighty, not jittery
    const follow = menu ? 3.4 : catching ? 3.4 : onTrain ? 5.1 : 6.2
    camera.position.lerp(desired, 1 - Math.exp(-follow * soft))

    if (hardShake) {
      const amp = (world.hitFlash - 0.45) * 0.08
      camera.position.x += Math.sin(world.elapsed * 36) * amp
      camera.position.y += Math.cos(world.elapsed * 28) * amp * 0.3
    } else if (land) {
      const amp = world.landShake * 0.055
      camera.position.y += Math.sin(world.elapsed * 48) * amp
    } else if (nearBoost && !reduced) {
      camera.position.x += Math.sin(world.elapsed * 22) * 0.012
    }

    camera.lookAt(look)
    camera.updateMatrixWorld()

    const speedAdd = Math.min(cam.fovMaxAdd, Math.max(0, world.speed - 12) * cam.fovSpeedGain)
    const targetFov = playing
      ? cam.fovBase + speedAdd + player.fly * 2.5 + (player.onRoof ? 1.6 : 0) + (closeChase ? 1.2 : 0) + (world.timeScale < 0.9 ? 2 : 0)
      : catching
        ? 50 + world.chase.catchPhase * 4
        : world.status === 'paused'
          ? 52
          : 54
    if (camera.isPerspectiveCamera && Math.abs(camera.fov - targetFov) > 0.04) {
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-2.8 * soft))
      camera.updateProjectionMatrix()
    }
  })
  return null
}

function AdaptiveQuality({ cap }) {
  const setDpr = useThree((state) => state.setDpr)
  const graphics = meta.settings?.graphics || 'auto'
  return (
    <PerformanceMonitor
      ms={280}
      iterations={6}
      flipflops={3}
      onDecline={() => {
        const floor = graphics === 'high' ? Math.min(1.1, cap) : 1
        setDpr(floor)
      }}
      onIncline={() => setDpr(resolveDprCap(graphics))}
      onFallback={() => setDpr(1)}
    />
  )
}

function Atmosphere({ mobile }) {
  const fog = useRef(null)
  const bg = useRef(null)
  const hemi = useRef(null)
  const sun = useRef(null)
  const fill = useRef(null)
  const accent = useRef(null)
  const color = useMemo(() => new THREE.Color(), [])
  const lastKey = useRef('')

  useFrame(() => {
    const v = world.visual
    if (!v) return
    // Skip redundant color writes when biome palette unchanged
    const key = `${world.biomeId}|${world.biomeBlend?.toFixed?.(2) || 0}|${meta.settings?.graphics}`
    if (key === lastKey.current) return
    lastKey.current = key

    if (bg.current) bg.current.set(v.bg)
    if (fog.current) {
      fog.current.color.set(v.fog)
      const g = meta.settings?.graphics || 'auto'
      const tight = mobile || g === 'low' || g === 'auto'
      fog.current.near = tight ? Math.min(v.fogNear, 28) : v.fogNear
      fog.current.far = tight ? Math.min(v.fogFar, 70) : v.fogFar
    }
    if (hemi.current) {
      hemi.current.color.set(v.hemiSky)
      hemi.current.groundColor.set(v.hemiGround)
    }
    if (sun.current) {
      sun.current.color.set(v.sun)
      const g = meta.settings?.graphics
      sun.current.intensity = g === 'low' || (g === 'auto' && mobile) ? 0.95 : g === 'medium' ? 1.15 : 1.35
    }
    if (fill.current) fill.current.color.set(v.fill)
    if (accent.current) {
      color.set(v.accent)
      accent.current.color.copy(color)
    }
  })

  const showAccent = !mobile

  return (
    <>
      <color ref={bg} attach="background" args={[BIOME_FALLBACK]} />
      <fog ref={fog} attach="fog" args={[BIOME_FALLBACK, 18, mobile ? 65 : 85]} />
      <hemisphereLight ref={hemi} intensity={0.72} />
      <directionalLight ref={sun} position={[6, 14, 4]} intensity={1.3} />
      {!mobile && <directionalLight ref={fill} position={[-5, 4, -2]} intensity={0.35} />}
      {showAccent && <pointLight ref={accent} position={[0, 3, 2]} intensity={0.55} distance={18} decay={2} />}
    </>
  )
}

const BIOME_FALLBACK = '#87ceeb'

export function Scene({ dprCap = 1.5, mobile: mobileProp }) {
  const mobile = mobileProp ?? isMobileClient()
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2.8, -7.6]} fov={54} near={0.1} far={mobile ? 95 : 140} />
      <Simulator />
      <CameraRig />
      <AdaptiveQuality cap={dprCap} />
      <Atmosphere mobile={mobile} />
      <Track mobile={mobile} />
      <TrafficField />
      <PowerupField />
      <PlayerAuras />
      <Board />
      <Runner />
      <Chase />
    </>
  )
}
