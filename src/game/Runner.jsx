import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getCharacter, meta } from './meta'
import { getQuality } from './perf'
import { world } from './world'

function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

function Limb({ pivotRef, position, children }) {
  return (
    <group ref={pivotRef} position={position}>
      {children}
    </group>
  )
}

function makeMat(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.12,
    envMapIntensity: 0.65,
    ...extras,
  })
}

export function Runner() {
  const root = useRef(null)
  const body = useRef(null)
  const torso = useRef(null)
  const head = useRef(null)
  const armL = useRef(null)
  const armR = useRef(null)
  const forearmL = useRef(null)
  const forearmR = useRef(null)
  const legL = useRef(null)
  const legR = useRef(null)
  const shinL = useRef(null)
  const shinR = useRef(null)
  const flame = useRef(null)
  const trail = useRef(null)
  const pack = useRef(null)
  const light = useRef(null)
  const topMat = useRef(makeMat('#3b82f6'))
  const bottomMat = useRef(makeMat('#f8fafc'))
  const accentMat = useRef(makeMat('#ef4444', { emissive: '#b91c1c', emissiveIntensity: 0.25 }))
  const hatMat = useRef(makeMat('#ef4444'))
  const shoeMat = useRef(makeMat('#111827'))
  const skinMat = useRef(makeMat('#d4a574'))
  const eye = useMemo(() => new THREE.MeshBasicMaterial({ color: '#111827', toneMapped: false }), [])
  const flameMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fb923c', toneMapped: false, transparent: true, opacity: 0.92 }),
    [],
  )
  const trailMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#67e8f9', toneMapped: false, transparent: true, opacity: 0.55 }),
    [],
  )
  const dummy = useMemo(() => new THREE.Vector3(), [])
  const charId = useRef(meta.equipped)
  const pose = useRef({
    armLX: 0,
    armRX: 0,
    armLZ: 0.12,
    armRZ: -0.12,
    foreLX: 0.25,
    foreRX: 0.25,
    legLX: 0,
    legRX: 0,
    shinLX: 0.2,
    shinRX: 0.2,
    torsoX: 0,
    torsoZ: 0,
    headY: 0,
    dive: 0,
    fall: 0,
  })

  const applySkin = (id) => {
    const c = getCharacter(id).colors
    skinMat.current.color.set(c.skin)
    topMat.current.color.set(c.top)
    bottomMat.current.color.set(c.bottom)
    accentMat.current.color.set(c.accent)
    accentMat.current.emissive.set(c.accent)
    hatMat.current.color.set(c.hat)
    shoeMat.current.color.set(c.shoe)
    charId.current = id
  }

  useEffect(() => {
    applySkin(meta.equipped)
  }, [])

  useFrame((_, dt) => {
    if (meta.equipped !== charId.current) applySkin(meta.equipped)

    const player = world.player
    const sliding = player.slide >= 0
    const jumping = player.jump >= 0
    const flying = player.fly > 0.35
    const onRoof = !!player.onRoof
    const fallingRoof = !!player.fallingFromRoof
    const stumbling = player.stumble > 0
    const dead = world.status === 'gameover'
    const idle = world.status === 'menu'
    const soft = Math.min(0.05, Math.max(0.008, dt))
    // Slightly quicker stride on the coach roof so the ride feels alive
    const rate = idle ? 2.4 : dead ? 0 : fallingRoof ? 2.2 : 8.4 + world.speed * 0.24 + (onRoof ? 1.6 : 0)
    const phase = world.elapsed * rate
    const swing = Math.sin(phase)
    const swing2 = Math.sin(phase + Math.PI)
    const p = pose.current

    root.current.position.set(player.x, 0, 0)
    const leanTarget = idle ? Math.sin(world.elapsed * 0.7) * 0.04 : player.lean
    root.current.rotation.z = damp(root.current.rotation.z, leanTarget, 10, soft)
    root.current.rotation.y = damp(root.current.rotation.y, idle ? world.elapsed * 0.55 : -player.lean * 0.65, idle ? 4 : 10, soft)

    let targetDive = 0
    let targetArmLX = -swing * 1.15
    let targetArmRX = swing * 1.15
    let targetArmLZ = 0.18
    let targetArmRZ = -0.18
    let targetForeLX = 0.35 + Math.max(0, -swing) * 0.65
    let targetForeRX = 0.35 + Math.max(0, swing) * 0.65
    let targetLegLX = swing * 1.05
    let targetLegRX = swing2 * 1.05
    let targetShinLX = 0.25 + Math.max(0, -swing) * 1.25
    let targetShinRX = 0.25 + Math.max(0, swing) * 1.25
    let targetTorsoX = 0.12
    let targetTorsoZ = swing * 0.05
    let targetHeadY = -swing * 0.06
    let targetFall = 0

    if (idle) {
      targetArmLX = -0.35 + swing * 0.12
      targetArmRX = -0.3 - swing * 0.12
      targetArmLZ = 0.22
      targetArmRZ = -0.22
      targetForeLX = 0.45
      targetForeRX = 0.45
      targetLegLX = 0.08
      targetLegRX = -0.05
      targetShinLX = 0.15
      targetShinRX = 0.2
      targetTorsoX = 0.02
      targetTorsoZ = 0
      targetHeadY = Math.sin(world.elapsed * 1.2) * 0.08
    } else if (dead) {
      targetFall = 1
      targetDive = 0.85
      targetArmLX = -1.4
      targetArmRX = 0.9
      targetArmLZ = 0.7
      targetArmRZ = -0.2
      targetForeLX = 0.8
      targetForeRX = 1.1
      targetLegLX = 0.7
      targetLegRX = 1.3
      targetShinLX = 0.9
      targetShinRX = 0.4
      targetTorsoX = 0.9
      targetHeadY = 0.4
    } else if (flying) {
      targetDive = -0.18
      targetArmLX = -2.55
      targetArmRX = -2.35
      targetArmLZ = 0.6
      targetArmRZ = -0.6
      targetForeLX = 0.2
      targetForeRX = 0.25
      targetLegLX = -0.45 + swing * 0.12
      targetLegRX = 0.55 + swing2 * 0.1
      targetShinLX = 1.05
      targetShinRX = 0.95
      targetTorsoX = -0.4
      targetHeadY = -0.08
    } else if (jumping) {
      const apex = Math.sin(Math.min(1, Math.max(0, player.jump)) * Math.PI)
      targetDive = -0.1
      targetArmLX = -2.2 - apex * 0.2
      targetArmRX = -2.0 - apex * 0.15
      targetArmLZ = 0.48
      targetArmRZ = -0.48
      targetForeLX = 0.3
      targetForeRX = 0.35
      targetLegLX = -0.85
      targetLegRX = 0.65
      targetShinLX = 1.35
      targetShinRX = 1.05
      targetTorsoX = -0.25
      targetHeadY = 0.1
    } else if (fallingRoof) {
      targetDive = 0.15
      targetArmLX = -1.6
      targetArmRX = -1.4
      targetArmLZ = 0.55
      targetArmRZ = -0.55
      targetForeLX = 0.45
      targetForeRX = 0.5
      targetLegLX = -0.35
      targetLegRX = 0.55
      targetShinLX = 0.9
      targetShinRX = 0.75
      targetTorsoX = 0.35
      targetHeadY = 0.2
    } else if (sliding) {
      const diveAmt = Math.min(1, player.slide * 3.8)
      targetDive = diveAmt
      targetArmLX = 0.65
      targetArmRX = 0.85
      targetArmLZ = 0.6
      targetArmRZ = -0.15
      targetForeLX = 1.2
      targetForeRX = 0.9
      targetLegLX = 0.55
      targetLegRX = 1.35
      targetShinLX = 1.6
      targetShinRX = 0.45
      targetTorsoX = 1.15 * diveAmt
      targetHeadY = 0.18
    } else if (stumbling) {
      const kick = Math.sin(world.elapsed * 28) * 0.25
      targetArmLX = 0.8 + kick
      targetArmRX = -1.2 - kick
      targetArmLZ = 0.55
      targetArmRZ = -0.35
      targetForeLX = 0.9
      targetForeRX = 0.7
      targetLegLX = 0.55
      targetLegRX = -0.35
      targetShinLX = 0.7
      targetShinRX = 0.9
      targetTorsoX = 0.25
      targetTorsoZ = kick * 0.4
      targetHeadY = 0.35
      targetDive = 0.12
    }

    const blend = stumbling || dead ? 10 : 15
    p.armLX = damp(p.armLX, targetArmLX, blend, soft)
    p.armRX = damp(p.armRX, targetArmRX, blend, soft)
    p.armLZ = damp(p.armLZ, targetArmLZ, 12, soft)
    p.armRZ = damp(p.armRZ, targetArmRZ, 12, soft)
    p.foreLX = damp(p.foreLX, targetForeLX, blend, soft)
    p.foreRX = damp(p.foreRX, targetForeRX, blend, soft)
    p.legLX = damp(p.legLX, targetLegLX, blend, soft)
    p.legRX = damp(p.legRX, targetLegRX, blend, soft)
    p.shinLX = damp(p.shinLX, targetShinLX, blend, soft)
    p.shinRX = damp(p.shinRX, targetShinRX, blend, soft)
    p.torsoX = damp(p.torsoX, targetTorsoX, 12, soft)
    p.torsoZ = damp(p.torsoZ, targetTorsoZ, 10, soft)
    p.headY = damp(p.headY, targetHeadY, 10, soft)
    p.dive = damp(p.dive, targetDive, 12, soft)
    p.fall = damp(p.fall, targetFall, 6, soft)

    // Keep feet planted: body rises with jump/fly/roof/fall
    body.current.position.y = player.y + p.dive * 0.28
    body.current.rotation.x = fallingRoof ? 0.35 : jumping ? -0.2 : onRoof ? 0.04 : 0.08 + p.dive * 1.05
    body.current.rotation.z = p.fall * 0.85
    body.current.position.x = p.fall * 0.35

    const squash = player.squash
    const bob =
      !sliding && !jumping && !flying && !idle && !dead && !fallingRoof
        ? Math.abs(swing) * (onRoof ? 0.07 : 0.055)
        : idle
          ? Math.sin(world.elapsed * 2) * 0.02
          : 0
    torso.current.position.y = bob
    torso.current.scale.set(1 + squash * 0.08, 1 - squash * 0.16, 1 + squash * 0.05)
    torso.current.rotation.x = p.torsoX * 0.14
    torso.current.rotation.z = p.torsoZ

    const glance = world.chase.tension > 0.55 && !idle ? 0.4 : 0
    head.current.rotation.y = p.headY + glance
    head.current.rotation.x = sliding ? 0.28 : jumping ? -0.14 : 0.04

    armL.current.rotation.x = p.armLX
    armR.current.rotation.x = p.armRX
    armL.current.rotation.z = p.armLZ
    armR.current.rotation.z = p.armRZ
    forearmL.current.rotation.x = p.foreLX
    forearmR.current.rotation.x = p.foreRX
    legL.current.rotation.x = p.legLX
    legR.current.rotation.x = p.legRX
    shinL.current.rotation.x = p.shinLX
    shinR.current.rotation.x = p.shinRX

    const showPack = flying || world.powers.jetpack > 0
    if (pack.current) pack.current.visible = showPack
    const kick = flying ? 1.4 + Math.abs(swing) * 0.35 : 0.55
    if (flame.current) {
      flame.current.visible = showPack
      flame.current.scale.set(1, kick, 1)
      flame.current.position.y = -0.18 - kick * 0.08
      flame.current.material.opacity = flying ? 0.95 : 0.7
    }
    if (trail.current) {
      trail.current.visible = showPack
      trail.current.scale.set(1, 0.6 + Math.abs(swing) * 0.85 + (flying ? 0.7 : 0), 1)
      trail.current.material.opacity = flying ? 0.85 : 0.4
    }

    if (light.current) {
      dummy.set(player.x, 1.35 + player.y, 0.35)
      light.current.position.copy(dummy)
      light.current.intensity = world.status === 'paused' ? 1.4 : idle ? 2.2 : 2.8
    }
  })

  const useLight = getQuality().runnerLight

  return (
    <group>
      {useLight && <pointLight ref={light} color="#fff7ed" intensity={2.8} distance={7} decay={2} />}
      <group ref={root} scale={1.2}>
        <group ref={body}>
          <group ref={torso}>
            <mesh position={[0, 1.12, 0]} material={topMat.current}>
              <boxGeometry args={[0.5, 0.54, 0.34]} />
            </mesh>
            <mesh position={[0, 1.0, 0.14]} material={accentMat.current}>
              <boxGeometry args={[0.34, 0.28, 0.1]} />
            </mesh>
            <mesh position={[0, 1.4, -0.08]} material={topMat.current}>
              <boxGeometry args={[0.38, 0.16, 0.2]} />
            </mesh>
            <mesh position={[0, 1.15, -0.2]} material={accentMat.current}>
              <boxGeometry args={[0.26, 0.28, 0.12]} />
            </mesh>

            <group ref={head} position={[0, 1.55, 0.02]}>
              <mesh material={skinMat.current}>
                <sphereGeometry args={[0.21, 14, 14]} />
              </mesh>
              <mesh position={[0, 0.15, -0.02]} material={hatMat.current}>
                <cylinderGeometry args={[0.19, 0.21, 0.13, 12]} />
              </mesh>
              <mesh position={[0, 0.1, 0.15]} material={hatMat.current}>
                <boxGeometry args={[0.3, 0.04, 0.14]} />
              </mesh>
              <mesh position={[-0.07, 0.02, 0.18]} material={eye}>
                <sphereGeometry args={[0.032, 6, 6]} />
              </mesh>
              <mesh position={[0.07, 0.02, 0.18]} material={eye}>
                <sphereGeometry args={[0.032, 6, 6]} />
              </mesh>
            </group>

            <group ref={pack} position={[0, 1.15, -0.28]} visible={false}>
              <mesh material={accentMat.current}>
                <cylinderGeometry args={[0.11, 0.13, 0.38, 8]} />
              </mesh>
              <mesh position={[0.14, 0, 0]} material={accentMat.current}>
                <cylinderGeometry args={[0.11, 0.13, 0.38, 8]} />
              </mesh>
              <mesh ref={flame} position={[0.07, -0.28, 0]}>
                <coneGeometry args={[0.1, 0.34, 7]} />
                <primitive object={flameMat} attach="material" />
              </mesh>
              <mesh ref={trail} position={[0.07, -0.48, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.07, 0.24, 6]} />
                <primitive object={trailMat} attach="material" />
              </mesh>
            </group>

            <Limb pivotRef={armL} position={[-0.36, 1.3, 0]}>
              <mesh position={[0, -0.15, 0]} material={topMat.current}>
                <capsuleGeometry args={[0.07, 0.17, 3, 6]} />
              </mesh>
              <group ref={forearmL} position={[0, -0.32, 0]}>
                <mesh position={[0, -0.12, 0]} material={skinMat.current}>
                  <capsuleGeometry args={[0.055, 0.14, 3, 6]} />
                </mesh>
              </group>
            </Limb>
            <Limb pivotRef={armR} position={[0.36, 1.3, 0]}>
              <mesh position={[0, -0.15, 0]} material={topMat.current}>
                <capsuleGeometry args={[0.07, 0.17, 3, 6]} />
              </mesh>
              <group ref={forearmR} position={[0, -0.32, 0]}>
                <mesh position={[0, -0.12, 0]} material={skinMat.current}>
                  <capsuleGeometry args={[0.055, 0.14, 3, 6]} />
                </mesh>
              </group>
            </Limb>

            <Limb pivotRef={legL} position={[-0.13, 0.78, 0]}>
              <mesh position={[0, -0.15, 0]} material={bottomMat.current}>
                <capsuleGeometry args={[0.08, 0.17, 3, 6]} />
              </mesh>
              <group ref={shinL} position={[0, -0.32, 0]}>
                <mesh position={[0, -0.13, 0]} material={bottomMat.current}>
                  <capsuleGeometry args={[0.07, 0.14, 3, 6]} />
                </mesh>
                <mesh position={[0, -0.3, 0.05]} material={shoeMat.current}>
                  <boxGeometry args={[0.15, 0.1, 0.26]} />
                </mesh>
              </group>
            </Limb>
            <Limb pivotRef={legR} position={[0.13, 0.78, 0]}>
              <mesh position={[0, -0.15, 0]} material={bottomMat.current}>
                <capsuleGeometry args={[0.08, 0.17, 3, 6]} />
              </mesh>
              <group ref={shinR} position={[0, -0.32, 0]}>
                <mesh position={[0, -0.13, 0]} material={bottomMat.current}>
                  <capsuleGeometry args={[0.07, 0.14, 3, 6]} />
                </mesh>
                <mesh position={[0, -0.3, 0.05]} material={shoeMat.current}>
                  <boxGeometry args={[0.15, 0.1, 0.26]} />
                </mesh>
              </group>
            </Limb>
          </group>
        </group>
      </group>
    </group>
  )
}
