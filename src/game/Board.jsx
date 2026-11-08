import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getHoverboard, meta } from './meta'
import { getQuality } from './perf'
import { world } from './world'

const POOL_MAX = 28

/**
 * Equipped skate/hoverboard under the runner + pooled trail particles.
 */
export function Board() {
  const root = useRef(null)
  const trailGroup = useRef(null)
  const particles = useRef([])
  const boardId = useRef(meta.boardEquipped)
  const mats = useRef({
    deck: new THREE.MeshStandardMaterial({
      color: '#1e293b',
      emissive: '#334155',
      emissiveIntensity: 0.55,
      metalness: 0.4,
      roughness: 0.35,
    }),
    wheel: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.5 }),
    glow: new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.7,
      toneMapped: false,
    }),
  })

  const poolSize = Math.min(POOL_MAX, getQuality().boardParticles || 12)
  const geo = useMemo(() => new THREE.SphereGeometry(0.06, 6, 6), [])
  const particleMats = useMemo(
    () =>
      Array.from(
        { length: poolSize },
        () =>
          new THREE.MeshBasicMaterial({
            color: '#fb923c',
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [poolSize],
  )

  const applyBoard = (id) => {
    const b = getHoverboard(id)
    mats.current.deck.color.set(b.color)
    mats.current.deck.emissive.set(b.emissive)
    mats.current.glow.color.set(b.trail)
    for (const m of particleMats) m.color.set(b.trail)
    boardId.current = id
  }

  useFrame((_, dt) => {
    if (meta.boardEquipped !== boardId.current) applyBoard(meta.boardEquipped)
    const board = getHoverboard(meta.boardEquipped)
    const none = board.id === 'none' || board.kind === 'none'
    if (root.current) root.current.visible = !none
    if (none) return

    const player = world.player
    const catching = world.status === 'catching'
    const hover = board.kind !== 'skate'
    const bob = hover ? Math.sin(world.elapsed * 6.5) * 0.04 : 0
    const y =
      catching || player.slide >= 0 ? -2 : 0.08 + player.y + bob + (hover ? 0.06 : 0)

    if (root.current) {
      root.current.position.set(player.x, y, 0.05)
      root.current.rotation.z = -player.lean * 0.55
      root.current.rotation.x = player.jump >= 0 ? -0.12 : player.slide >= 0 ? 0.2 : 0
      root.current.visible = !catching && player.slide < 0
    }

    const fancy = board.kind === 'fire' || board.kind === 'phoenix' || board.kind === 'inferno'
    const cosmic = board.kind === 'galaxy' || board.kind === 'thunder' || board.kind === 'ice'
    if (!trailGroup.current) return
    trailGroup.current.visible = fancy || cosmic

    const speed = Math.min(1.4, world.speed / 28)
    if ((fancy || cosmic) && particles.current.length) {
      for (let i = 0; i < particles.current.length; i += 1) {
        const p = particles.current[i]
        if (!p?.mesh) continue
        p.life -= dt * (1.6 + speed)
        if (p.life <= 0) {
          p.life = 0.35 + Math.random() * 0.55
          p.mesh.position.set(
            (Math.random() - 0.5) * 0.35,
            0.02,
            -0.35 - Math.random() * 0.9,
          )
          p.mesh.scale.setScalar(0.5 + Math.random() * 0.9)
        } else {
          p.mesh.position.z -= (2.8 + speed * 4) * dt
          p.mesh.position.y += (fancy ? 0.6 : 0.25) * dt
          if (p.mesh.material) {
            p.mesh.material.opacity = Math.max(0, p.life) * (fancy ? 0.9 : 0.65)
          }
        }
      }
    }
  })

  const isSkate = getHoverboard(meta.boardEquipped).kind === 'skate'

  return (
    <group ref={root}>
      <mesh material={mats.current.deck}>
        <boxGeometry args={[0.42, 0.05, 1.05]} />
      </mesh>
      <mesh position={[0, -0.02, 0]} material={mats.current.glow} scale={[0.95, 0.2, 1.05]}>
        <boxGeometry args={[0.42, 0.04, 1.05]} />
      </mesh>
      {isSkate && (
        <>
          <mesh position={[-0.14, -0.08, 0.32]} rotation={[0, 0, Math.PI / 2]} material={mats.current.wheel}>
            <cylinderGeometry args={[0.07, 0.07, 0.08, 8]} />
          </mesh>
          <mesh position={[0.14, -0.08, 0.32]} rotation={[0, 0, Math.PI / 2]} material={mats.current.wheel}>
            <cylinderGeometry args={[0.07, 0.07, 0.08, 8]} />
          </mesh>
          <mesh position={[-0.14, -0.08, -0.32]} rotation={[0, 0, Math.PI / 2]} material={mats.current.wheel}>
            <cylinderGeometry args={[0.07, 0.07, 0.08, 8]} />
          </mesh>
          <mesh position={[0.14, -0.08, -0.32]} rotation={[0, 0, Math.PI / 2]} material={mats.current.wheel}>
            <cylinderGeometry args={[0.07, 0.07, 0.08, 8]} />
          </mesh>
        </>
      )}
      {!isSkate && (
        <>
          <mesh position={[0, -0.1, 0.28]} material={mats.current.glow}>
            <sphereGeometry args={[0.1, 8, 8]} />
          </mesh>
          <mesh position={[0, -0.1, -0.28]} material={mats.current.glow}>
            <sphereGeometry args={[0.1, 8, 8]} />
          </mesh>
        </>
      )}
      <group ref={trailGroup}>
        {Array.from({ length: poolSize }, (_, i) => (
          <mesh
            key={i}
            geometry={geo}
            material={particleMats[i]}
            ref={(el) => {
              if (el) particles.current[i] = { mesh: el, life: Math.random() }
            }}
            position={[0, -10, 0]}
          />
        ))}
      </group>
    </group>
  )
}
