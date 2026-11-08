import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CONFIG } from './config'
import { ShepherdDog } from './ShepherdDog'
import { world } from './world'

/**
 * Chase pack — procedural officer + rigged Quaternius German Shepherd (CC BY).
 * Dog model: public/models/german-shepherd.glb — see public/licenses/
 */

const shirt = new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.58, metalness: 0.08 })
const shirtDark = new THREE.MeshStandardMaterial({ color: '#172554', roughness: 0.55, metalness: 0.1 })
const pants = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.62, metalness: 0.05 })
const boot = new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.48, metalness: 0.15 })
const skin = new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.72, metalness: 0.02 })
const skinDeep = new THREE.MeshStandardMaterial({ color: '#b8875c', roughness: 0.72, metalness: 0.02 })
const cap = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.42, metalness: 0.22 })
const gold = new THREE.MeshStandardMaterial({
  color: '#fbbf24',
  emissive: '#b45309',
  emissiveIntensity: 0.35,
  metalness: 0.7,
  roughness: 0.3,
  toneMapped: false,
})
const belt = new THREE.MeshStandardMaterial({ color: '#292524', roughness: 0.5, metalness: 0.2 })
const hair = new THREE.MeshStandardMaterial({ color: '#292524', roughness: 0.8, metalness: 0 })
const eyeW = new THREE.MeshBasicMaterial({ color: '#f8fafc', toneMapped: false })
const eyeD = new THREE.MeshBasicMaterial({ color: '#0f172a', toneMapped: false })
const dustMat = new THREE.MeshBasicMaterial({
  color: '#a8a29e',
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  toneMapped: false,
})

function OfficerModel({ head, torso, armL, armR, legL, legR }) {
  return (
    <group>
      <group ref={legL} position={[-0.14, 0.52, 0]}>
        <mesh position={[0, -0.22, 0]} material={pants}>
          <capsuleGeometry args={[0.09, 0.38, 3, 6]} />
        </mesh>
        <mesh position={[0, -0.48, 0.04]} material={boot}>
          <boxGeometry args={[0.16, 0.12, 0.28]} />
        </mesh>
      </group>
      <group ref={legR} position={[0.14, 0.52, 0]}>
        <mesh position={[0, -0.22, 0]} material={pants}>
          <capsuleGeometry args={[0.09, 0.38, 3, 6]} />
        </mesh>
        <mesh position={[0, -0.48, 0.04]} material={boot}>
          <boxGeometry args={[0.16, 0.12, 0.28]} />
        </mesh>
      </group>

      <group ref={torso} position={[0, 1.05, 0]}>
        <mesh material={shirt}>
          <boxGeometry args={[0.52, 0.62, 0.28]} />
        </mesh>
        <mesh position={[0, -0.05, 0.02]} material={shirtDark}>
          <boxGeometry args={[0.48, 0.28, 0.3]} />
        </mesh>
        <mesh position={[-0.3, 0.22, 0]} material={shirt}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
        <mesh position={[0.3, 0.22, 0]} material={shirt}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
        <mesh position={[0.16, 0.12, 0.15]} material={gold}>
          <circleGeometry args={[0.05, 6]} />
        </mesh>
        <mesh position={[0, -0.28, 0.02]} material={belt}>
          <boxGeometry args={[0.54, 0.08, 0.3]} />
        </mesh>
        <mesh position={[0.22, -0.28, 0.14]} material={gold}>
          <boxGeometry args={[0.08, 0.1, 0.06]} />
        </mesh>
        <mesh position={[-0.26, -0.28, 0.12]} material={boot}>
          <boxGeometry args={[0.07, 0.12, 0.05]} />
        </mesh>
      </group>

      <group ref={armL} position={[-0.34, 1.2, 0]}>
        <mesh position={[0, -0.22, 0]} material={shirt}>
          <capsuleGeometry args={[0.07, 0.32, 3, 6]} />
        </mesh>
        <mesh position={[0, -0.44, 0.02]} material={skin}>
          <sphereGeometry args={[0.065, 7, 7]} />
        </mesh>
      </group>
      <group ref={armR} position={[0.34, 1.2, 0]}>
        <mesh position={[0, -0.22, 0]} material={shirt}>
          <capsuleGeometry args={[0.07, 0.32, 3, 6]} />
        </mesh>
        <mesh position={[0, -0.44, 0.02]} material={skin}>
          <sphereGeometry args={[0.065, 7, 7]} />
        </mesh>
      </group>

      <group ref={head} position={[0, 1.52, 0.02]}>
        <mesh material={skin}>
          <sphereGeometry args={[0.15, 12, 12]} />
        </mesh>
        <mesh position={[0, 0.02, 0.04]} material={skinDeep}>
          <boxGeometry args={[0.18, 0.12, 0.12]} />
        </mesh>
        <mesh position={[0, 0.1, -0.02]} material={hair}>
          <sphereGeometry args={[0.12, 8, 8]} />
        </mesh>
        <mesh position={[0, 0.12, -0.01]} material={cap}>
          <cylinderGeometry args={[0.13, 0.15, 0.1, 12]} />
        </mesh>
        <mesh position={[0, 0.08, 0.12]} material={cap}>
          <boxGeometry args={[0.26, 0.03, 0.12]} />
        </mesh>
        <mesh position={[0, 0.13, 0.08]} material={gold}>
          <boxGeometry args={[0.06, 0.04, 0.02]} />
        </mesh>
        <mesh position={[-0.05, 0.02, 0.13]} material={eyeW}>
          <sphereGeometry args={[0.028, 6, 6]} />
        </mesh>
        <mesh position={[0.05, 0.02, 0.13]} material={eyeW}>
          <sphereGeometry args={[0.028, 6, 6]} />
        </mesh>
        <mesh position={[-0.05, 0.02, 0.15]} material={eyeD}>
          <sphereGeometry args={[0.016, 6, 6]} />
        </mesh>
        <mesh position={[0.05, 0.02, 0.15]} material={eyeD}>
          <sphereGeometry args={[0.016, 6, 6]} />
        </mesh>
      </group>
    </group>
  )
}

export function Chase() {
  const root = useRef(null)
  const officerRoot = useRef(null)
  const dogRoot = useRef(null)
  const head = useRef(null)
  const torso = useRef(null)
  const armL = useRef(null)
  const armR = useRef(null)
  const legOL = useRef(null)
  const legOR = useRef(null)
  const dust = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const announced = useRef(false)
  const displayGap = useRef(CONFIG.chase.gapFar)

  useFrame((_, dt) => {
    if (!root.current) return
    // Hide pack on game over / menu — dog & officer must not keep running behind after fail
    const live =
      world.status === 'playing' ||
      world.status === 'countdown' ||
      world.status === 'paused' ||
      world.status === 'catching'
    root.current.visible = live
    if (!live) {
      if (dogRoot.current) dogRoot.current.visible = false
      if (officerRoot.current) officerRoot.current.visible = false
      return
    }

    const tension = world.chase.tension
    const intro = world.chase.intro
    const stumble = world.player.stumble
    const paused = world.status === 'paused'
    const catching = world.status === 'catching'
    const phase = catching ? world.chase.catchPhase : 0
    const soft = Math.min(0.05, Math.max(0.008, dt))

    // Keep gap stable — do not push pack into the camera during intro
    const gapTarget = world.chase.gap
    displayGap.current += (gapTarget - displayGap.current) * (1 - Math.exp(-(catching ? 8 : 5) * soft))

    const flying = world.player.fly > 0.35 || world.powers.jetpack > 0
    // Camera ≈ z -8.2, player ≈ z 0. Place pack on that line so it is always on-screen.
    const camZ = -8.2
    const playerZ = 0
    // Higher blend = closer to player (more centered in view). Clamp hard.
    // Higher blend = closer to player. Keep dog near the runner.
    const nearBoost = world.chase.nearMissBoost > 0 ? 0.08 : 0
    const along = flying
      ? 0.48
      : catching
        ? THREE.MathUtils.clamp(0.72 + phase * 0.22, 0.72, 0.94)
        : THREE.MathUtils.clamp(1 - displayGap.current / 8.2 + nearBoost, 0.55, 0.78)
    const back = THREE.MathUtils.lerp(camZ, playerZ, along)

    // During arrest, root sits at the player so grab poses align in world space
    if (catching && phase > 0.35) {
      root.current.position.set(world.player.x, 0, -0.15)
    } else {
      root.current.position.set(
        world.player.x * 0.22 + (paused ? 0 : Math.sin(world.elapsed * 0.9) * 0.03),
        0,
        back,
      )
    }
    root.current.scale.setScalar(1)

    if (world.status === 'countdown' && intro > 1.4 && !announced.current) {
      announced.current = true
      world.toast = 'They are after you!'
      world.toastLife = 1.6
    }
    if (world.status === 'menu') announced.current = false

    if (paused) return

    const rate = catching ? (phase < 0.4 ? 16 : 2) : 9.5 + world.speed * 0.32 + tension * 6
    const swing = Math.sin(world.elapsed * rate)
    const swing2 = Math.sin(world.elapsed * rate + Math.PI)
    const lean = 0.08 + tension * 0.12 + (catching ? phase * 0.15 : 0)
    const grab = catching && phase >= 0.4

    if (legOL.current) legOL.current.rotation.x = grab ? 0.15 : swing * 0.85
    if (legOR.current) legOR.current.rotation.x = grab ? -0.1 : swing2 * 0.85
    // Shoulder-hold: reach forward with right arm toward runner (aligned pose, no IK)
    if (armL.current) armL.current.rotation.x = grab ? 0.35 : swing2 * 0.95 - 0.15
    if (armR.current) {
      armR.current.rotation.x = grab ? -1.15 : swing * 0.95 - 0.15
      armR.current.rotation.z = grab ? -0.35 : 0
    }
    if (torso.current) {
      torso.current.rotation.x = grab ? 0.18 : lean
      torso.current.rotation.y = grab ? 0.25 : Math.sin(world.elapsed * rate * 0.4) * 0.06
      torso.current.rotation.z = grab ? 0.05 : swing * 0.025
      torso.current.position.y = 1.05 + (grab ? 0 : Math.abs(swing) * 0.025)
    }
    if (head.current) {
      head.current.rotation.x = grab ? 0.05 : -0.08 + tension * 0.1
      head.current.rotation.y = grab ? 0.35 : Math.sin(world.elapsed * 1.2) * 0.05
    }

    if (officerRoot.current) {
      officerRoot.current.visible = true
      if (grab) {
        // Beside player shoulder — do not clip through torso
        officerRoot.current.position.set(-0.55, 0, 0.05)
        officerRoot.current.scale.setScalar(0.95)
        officerRoot.current.rotation.y = 0.4
        officerRoot.current.rotation.x = 0.05
      } else if (catching) {
        // Run-in toward player
        const t = Math.min(1, phase / 0.4)
        officerRoot.current.position.set(
          THREE.MathUtils.lerp(-0.85, -0.55, t),
          Math.abs(swing) * 0.03,
          THREE.MathUtils.lerp(-0.55, 0.05, t),
        )
        officerRoot.current.scale.setScalar(0.78 + t * 0.17)
        officerRoot.current.rotation.x = lean * 0.5
        officerRoot.current.rotation.y = t * 0.35
      } else {
        officerRoot.current.position.set(-0.85, Math.abs(swing) * 0.03, -0.55)
        officerRoot.current.scale.setScalar(0.78)
        officerRoot.current.rotation.x = lean * 0.5
        officerRoot.current.rotation.y = 0
      }
    }
    if (dogRoot.current) {
      dogRoot.current.visible = true
      if (grab) {
        dogRoot.current.position.set(0.55, 0, -0.15)
        dogRoot.current.scale.setScalar(1.15)
        dogRoot.current.rotation.y = -0.25
      } else if (catching) {
        const t = Math.min(1, phase / 0.4)
        dogRoot.current.position.set(
          THREE.MathUtils.lerp(-0.45, 0.55, t),
          0,
          THREE.MathUtils.lerp(0.55, -0.15, t),
        )
        dogRoot.current.scale.setScalar(1.2)
        dogRoot.current.rotation.y = THREE.MathUtils.lerp(0.08, -0.25, t)
      } else {
        const lunge = stumble > 0 ? stumble * 0.3 : 0
        const boost = world.chase.nearMissBoost > 0 ? 0.35 : 0
        dogRoot.current.position.set(
          -0.45 + Math.sin(world.elapsed * 5) * 0.02,
          0,
          0.55 + tension * 0.35 + lunge * 0.5 + boost,
        )
        dogRoot.current.scale.setScalar(1.2)
        dogRoot.current.rotation.y = 0.08
      }
    }

    if (dust.current) {
      const show = tension > 0.25 || stumble > 0 || catching
      dust.current.visible = show
      if (show) {
        for (let i = 0; i < 14; i += 1) {
          const t = (world.elapsed * 12 + i * 1.7) % 10
          dummy.position.set(((i % 4) - 1.5) * 0.32, 0.03 + (i % 3) * 0.02, 0.2 - (t % 5) * 0.2)
          dummy.scale.setScalar(0.06 + (i % 4) * 0.025)
          dummy.updateMatrix()
          dust.current.setMatrixAt(i, dummy.matrix)
        }
        dust.current.instanceMatrix.needsUpdate = true
        dustMat.opacity = 0.2 + tension * 0.35
      }
    }
  })

  return (
    <group ref={root} visible={false}>
      <group ref={officerRoot} position={[-0.55, 0, -0.35]}>
        <OfficerModel head={head} torso={torso} armL={armL} armR={armR} legL={legOL} legR={legOR} />
      </group>
      <group ref={dogRoot} position={[-0.55, 0, 0.15]}>
        <ShepherdDog />
      </group>
      <instancedMesh ref={dust} args={[null, null, 14]} visible={false} frustumCulled={false}>
        <sphereGeometry args={[1, 4, 4]} />
        <primitive object={dustMat} attach="material" />
      </instancedMesh>
    </group>
  )
}
