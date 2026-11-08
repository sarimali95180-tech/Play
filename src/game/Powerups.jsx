import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CONFIG } from './config'
import { getHoverboard, meta } from './meta'
import { LANES, MYSTERY_POOL, POWERUP_POOL, world } from './world'

const mysteryMat = new THREE.MeshStandardMaterial({
  color: '#a78bfa',
  emissive: '#7c3aed',
  emissiveIntensity: 1.1,
  metalness: 0.55,
  roughness: 0.28,
  toneMapped: false,
})
const mysteryBand = new THREE.MeshBasicMaterial({ color: '#fde68a', toneMapped: false })

const mats = {
  magnet: new THREE.MeshStandardMaterial({
    color: '#fde047',
    emissive: '#facc15',
    emissiveIntensity: 1.6,
    metalness: 0.65,
    roughness: 0.22,
    toneMapped: false,
  }),
  jetpack: new THREE.MeshStandardMaterial({
    color: '#67e8f9',
    emissive: '#22d3ee',
    emissiveIntensity: 1.55,
    metalness: 0.55,
    roughness: 0.28,
    toneMapped: false,
  }),
  shield: new THREE.MeshStandardMaterial({
    color: '#93c5fd',
    emissive: '#60a5fa',
    emissiveIntensity: 1.35,
    metalness: 0.35,
    roughness: 0.28,
    toneMapped: false,
    transparent: true,
    opacity: 0.92,
  }),
  multiplier: new THREE.MeshStandardMaterial({
    color: '#f0abfc',
    emissive: '#e879f9',
    emissiveIntensity: 1.45,
    metalness: 0.45,
    roughness: 0.28,
    toneMapped: false,
  }),
  hoverboard: new THREE.MeshStandardMaterial({
    color: '#86efac',
    emissive: '#4ade80',
    emissiveIntensity: 1.25,
    metalness: 0.5,
    roughness: 0.3,
    toneMapped: false,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    emissive: '#64748b',
    emissiveIntensity: 0.35,
    metalness: 0.8,
    roughness: 0.3,
    toneMapped: false,
  }),
  flame: new THREE.MeshBasicMaterial({ color: '#fb923c', toneMapped: false, transparent: true, opacity: 0.9 }),
}

function MagnetIcon() {
  return (
    <group>
      <mesh material={mats.magnet} position={[-0.16, 0, 0]} rotation={[0, 0, 0.35]}>
        <torusGeometry args={[0.22, 0.07, 8, 14, Math.PI]} />
      </mesh>
      <mesh material={mats.magnet} position={[0.16, 0, 0]} rotation={[0, 0, -0.35]}>
        <torusGeometry args={[0.22, 0.07, 8, 14, Math.PI]} />
      </mesh>
      <mesh material={mats.metal} position={[-0.28, -0.18, 0]}>
        <boxGeometry args={[0.1, 0.14, 0.1]} />
      </mesh>
      <mesh material={mats.metal} position={[0.28, -0.18, 0]}>
        <boxGeometry args={[0.1, 0.14, 0.1]} />
      </mesh>
    </group>
  )
}

function JetpackIcon() {
  return (
    <group>
      <mesh material={mats.jetpack} position={[-0.12, 0.05, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.42, 8]} />
      </mesh>
      <mesh material={mats.jetpack} position={[0.12, 0.05, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.42, 8]} />
      </mesh>
      <mesh material={mats.metal} position={[0, 0.12, 0.08]}>
        <boxGeometry args={[0.34, 0.2, 0.08]} />
      </mesh>
      <mesh material={mats.flame} position={[-0.12, -0.28, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.22, 6]} />
      </mesh>
      <mesh material={mats.flame} position={[0.12, -0.28, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.22, 6]} />
      </mesh>
    </group>
  )
}

function ShieldIcon() {
  return (
    <group>
      <mesh material={mats.shield}>
        <sphereGeometry args={[0.28, 16, 12]} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[0.32, 0.03, 6, 20]} />
        <meshBasicMaterial color="#dbeafe" toneMapped={false} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function MultiplierIcon() {
  return (
    <group>
      <mesh material={mats.multiplier} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.12, 0.42, 0.12]} />
      </mesh>
      <mesh material={mats.multiplier} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.12, 0.42, 0.12]} />
      </mesh>
      <mesh material={mats.multiplier} position={[0.28, 0.12, 0]}>
        <boxGeometry args={[0.14, 0.28, 0.1]} />
      </mesh>
    </group>
  )
}

function HoverboardIcon() {
  return (
    <group>
      <mesh material={mats.hoverboard} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.22, 0.06, 0.55]} />
      </mesh>
      <mesh material={mats.flame} position={[0, -0.08, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.07, 0.2, 6]} />
      </mesh>
    </group>
  )
}

function PowerModel({ type }) {
  if (type === 'jetpack') return <JetpackIcon />
  if (type === 'shield') return <ShieldIcon />
  if (type === 'multiplier') return <MultiplierIcon />
  if (type === 'hoverboard') return <HoverboardIcon />
  return <MagnetIcon />
}

const RING = {
  magnet: '#fde047',
  jetpack: '#67e8f9',
  shield: '#93c5fd',
  multiplier: '#f0abfc',
  hoverboard: '#86efac',
}

function PowerSlot({ index }) {
  const ref = useRef(null)
  const ring = useRef(null)

  useFrame(() => {
    const item = world.powerups[index]
    if (!item?.active) {
      if (ref.current) ref.current.visible = false
      return
    }
    if (ref.current) {
      ref.current.visible = true
      const bob = Math.sin(world.elapsed * 5 + index) * 0.12
      ref.current.position.set(LANES[item.lane], item.y + bob, item.z)
      ref.current.rotation.y = world.elapsed * 2.2
    }
    if (ring.current) {
      ring.current.material.color.set(RING[item.type] || '#fff')
    }
  })

  return (
    <group ref={ref} visible={false}>
      <TypeSwitcher index={index} />
      <mesh ref={ring} scale={1.45} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 20]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.45} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function TypeSwitcher({ index }) {
  const typeRef = useRef('magnet')
  const [type, setType] = useState('magnet')

  useFrame(() => {
    const item = world.powerups[index]
    if (!item?.active) return
    if (item.type && item.type !== typeRef.current) {
      typeRef.current = item.type
      setType(item.type)
    }
  })

  return <PowerModel type={type} />
}

function MysterySlot({ index }) {
  const root = useRef(null)
  useFrame((_, dt) => {
    const item = world.mystery[index]
    if (!root.current) return
    if (!item?.active) {
      root.current.visible = false
      return
    }
    root.current.visible = true
    root.current.position.set(LANES[item.lane], item.y + Math.sin(world.elapsed * 3 + index) * 0.06, item.z)
    root.current.rotation.y += dt * 1.8
  })
  return (
    <group ref={root} visible={false}>
      <mesh material={mysteryMat}>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
      </mesh>
      <mesh position={[0, 0, 0.22]} material={mysteryBand}>
        <boxGeometry args={[0.44, 0.08, 0.04]} />
      </mesh>
      <mesh position={[0, 0.22, 0]} material={mysteryBand}>
        <boxGeometry args={[0.08, 0.04, 0.44]} />
      </mesh>
      {/* Point lights × mystery pool were expensive on mobile */}
    </group>
  )
}

export function PowerupField() {
  return (
    <group>
      {Array.from({ length: POWERUP_POOL }, (_, i) => (
        <PowerSlot key={i} index={i} />
      ))}
      {Array.from({ length: MYSTERY_POOL }, (_, i) => (
        <MysterySlot key={`m${i}`} index={i} />
      ))}
    </group>
  )
}

export function PlayerAuras() {
  const shield = useRef(null)
  const shieldRing = useRef(null)
  const breakFlash = useRef(null)
  const magnet = useRef(null)
  const board = useRef(null)
  const trail = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(() => {
    const p = world.player
    const powers = world.powers
    if (shield.current) {
      const on = powers.shield > 0
      shield.current.visible = on
      if (shieldRing.current) shieldRing.current.visible = on
      if (on) {
        shield.current.position.set(p.x, 1.05 + p.y, 0)
        const s = 1.15 + Math.sin(world.elapsed * 7) * 0.06
        shield.current.scale.setScalar(s)
        if (shieldRing.current) {
          shieldRing.current.position.copy(shield.current.position)
          shieldRing.current.rotation.y = world.elapsed * 2.4
        }
      }
    }
    if (breakFlash.current) {
      const breaking = world.shieldBreak > 0
      breakFlash.current.visible = breaking
      if (breaking) {
        breakFlash.current.position.set(p.x, 1.1 + p.y, 0)
        const t = world.shieldBreak
        breakFlash.current.scale.setScalar(1.2 + (0.55 - t) * 2.4)
        breakFlash.current.material.opacity = Math.min(0.7, t * 1.4)
      }
    }
    if (magnet.current) {
      const on = powers.magnet > 0
      magnet.current.visible = on
      if (on) {
        magnet.current.position.set(p.x, 0.95 + p.y, 0)
        magnet.current.rotation.y = world.elapsed * 4
        const pulse = 0.95 + (powers.magnet / CONFIG.magnet.duration) * 0.55
        magnet.current.scale.setScalar(pulse)
      }
    }
    if (board.current) {
      const on = powers.hoverboard > 0 && p.fly < 0.25
      board.current.visible = on
      if (on) {
        const skin = getHoverboard(meta.boardEquipped)
        board.current.material.color.set(skin.color)
        board.current.material.emissive.set(skin.emissive)
        board.current.position.set(p.x, 0.12 + p.y * 0.1, 0.05)
        board.current.rotation.z = p.lean * 0.5
        if (trail.current && powers.jetpack <= 0) {
          trail.current.visible = true
          trail.current.material.color.set(skin.trail)
          trail.current.position.set(p.x, 0.18 + p.y * 0.1, -0.55)
          trail.current.scale.set(0.9, 0.7 + Math.sin(world.elapsed * 22) * 0.2, 1)
        }
      }
    }
    if (trail.current) {
      const jet = powers.jetpack > 0 || p.fly > 0.2
      if (jet) {
        trail.current.visible = true
        trail.current.material.color.set('#67e8f9')
        trail.current.position.set(p.x, p.y + 0.4, -0.35)
        const kick = 0.7 + Math.sin(world.elapsed * 28) * 0.25
        trail.current.scale.set(1, kick, 1)
      } else if (!(powers.hoverboard > 0 && p.fly < 0.25)) {
        trail.current.visible = false
      }
    }
    void dummy
  })

  return (
    <group>
      <mesh ref={shield} visible={false}>
        <sphereGeometry args={[1.05, 18, 14]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={shieldRing} visible={false} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.12, 0.04, 8, 28]} />
        <meshBasicMaterial color="#dbeafe" transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh ref={breakFlash} visible={false}>
        <sphereGeometry args={[1.1, 12, 10]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={magnet} visible={false} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.35, 0.06, 8, 28]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.65} toneMapped={false} />
      </mesh>
      <mesh ref={board} visible={false}>
        <boxGeometry args={[0.55, 0.08, 1.15]} />
        <meshStandardMaterial color="#14532d" emissive="#4ade80" emissiveIntensity={0.8} metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh ref={trail} visible={false}>
        <coneGeometry args={[0.12, 0.55, 7]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.8} toneMapped={false} />
      </mesh>
    </group>
  )
}
