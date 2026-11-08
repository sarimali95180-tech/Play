import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { getQuality } from './perf'
import { world } from './world'

const DOG_URL = '/models/german-shepherd.glb'

const harnessMat = new THREE.MeshStandardMaterial({
  color: '#0f172a',
  roughness: 0.45,
  metalness: 0.25,
  emissive: '#1e3a8a',
  emissiveIntensity: 0.18,
})
const badgeMat = new THREE.MeshBasicMaterial({ color: '#facc15', toneMapped: false })

/**
 * Rigged Quaternius German Shepherd (CC BY) with Run clip.
 * Procedural harness overlay marks it as a police K9.
 */
function RiggedShepherd() {
  const root = useRef(null)
  const { scene, animations } = useGLTF(DOG_URL)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions, mixer } = useAnimations(animations, root)
  const rate = useRef(1)

  useEffect(() => {
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false
        obj.receiveShadow = false
        obj.frustumCulled = true
        if (obj.material) {
          obj.material.metalness = Math.min(obj.material.metalness ?? 0, 0.15)
          obj.material.roughness = Math.max(obj.material.roughness ?? 0.7, 0.55)
          obj.material.envMapIntensity = 0.35
        }
      }
    })
  }, [clone])

  useEffect(() => {
    const run =
      actions.Run ||
      actions['AnimalArmature|Run'] ||
      actions.Walk ||
      actions['AnimalArmature|Walk']
    if (!run) return undefined
    run.reset().fadeIn(0.15).play()
    run.setEffectiveWeight(1)
    return () => {
      run.fadeOut(0.1)
    }
  }, [actions])

  useFrame((_, dt) => {
    if (!root.current) return
    const paused = world.status === 'paused'
    const catching = world.status === 'catching'
    const tension = world.chase.tension
    // Match gait to game speed / chase urgency
    const target =
      paused || world.status === 'menu'
        ? 0
        : catching
          ? 1.55 + world.chase.catchPhase * 0.5
          : 0.95 + world.speed * 0.045 + tension * 0.55
    rate.current += (target - rate.current) * Math.min(1, dt * 6)
    if (mixer) mixer.timeScale = rate.current
  })

  // Quaternius German Shepherd already faces +Z (toward the runner). Do NOT flip Y.
  return (
    <group ref={root} scale={1.05} rotation={[0, 0, 0]} position={[0, 0, 0]}>
      <primitive object={clone} />
      {/* Lightweight police harness (not part of the licensed mesh) */}
      <mesh position={[0, 0.52, 0.08]} material={harnessMat}>
        <boxGeometry args={[0.34, 0.09, 0.38]} />
      </mesh>
      <mesh position={[0, 0.57, 0.22]} material={badgeMat}>
        <boxGeometry args={[0.18, 0.04, 0.025]} />
      </mesh>
    </group>
  )
}

/** Tiny procedural stand-in while GLB loads (or if it fails). */
function ShepherdFallback() {
  return (
    <group scale={0.85}>
      <mesh position={[0, 0.45, 0]} castShadow={false}>
        <boxGeometry args={[0.34, 0.28, 0.7]} />
        <meshStandardMaterial color="#1c1917" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.42, 0.35]}>
        <boxGeometry args={[0.26, 0.22, 0.28]} />
        <meshStandardMaterial color="#c4a574" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.55, 0.05]} material={harnessMat}>
        <boxGeometry args={[0.36, 0.08, 0.4]} />
      </mesh>
    </group>
  )
}

export function ShepherdDog() {
  // Low mobile: skip skinned GLB (biggest character cost) — keep procedural stand-in
  if (!getQuality().dogGlb) return <ShepherdFallback />
  return (
    <Suspense fallback={<ShepherdFallback />}>
      <RiggedShepherd />
    </Suspense>
  )
}

// Preload only when quality wants the GLB (phones on low skip the download hitch)
if (typeof window !== 'undefined') {
  try {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    if (!coarse) useGLTF.preload(DOG_URL)
  } catch {
    useGLTF.preload(DOG_URL)
  }
}
