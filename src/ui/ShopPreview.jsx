import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getCharacter, getHoverboard } from '../game/meta'

function Rotator({ children }) {
  const ref = useRef(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.85
  })
  return <group ref={ref}>{children}</group>
}

function CharacterMesh({ colors }) {
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: colors.skin, roughness: 0.7 }),
      top: new THREE.MeshStandardMaterial({ color: colors.top, roughness: 0.55 }),
      bottom: new THREE.MeshStandardMaterial({ color: colors.bottom, roughness: 0.6 }),
      accent: new THREE.MeshStandardMaterial({
        color: colors.accent,
        emissive: colors.accent,
        emissiveIntensity: 0.45,
        roughness: 0.4,
      }),
      hat: new THREE.MeshStandardMaterial({ color: colors.hat, roughness: 0.5 }),
      shoe: new THREE.MeshStandardMaterial({ color: colors.shoe, roughness: 0.55 }),
    }),
    [colors],
  )
  return (
    <group position={[0, -0.85, 0]} scale={1.15}>
      <mesh position={[0, 1.45, 0]} material={mats.skin}>
        <sphereGeometry args={[0.18, 12, 12]} />
      </mesh>
      <mesh position={[0, 1.58, 0]} material={mats.hat}>
        <boxGeometry args={[0.28, 0.1, 0.28]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={mats.top}>
        <boxGeometry args={[0.42, 0.5, 0.26]} />
      </mesh>
      <mesh position={[0, 1.15, 0.14]} material={mats.accent}>
        <boxGeometry args={[0.18, 0.12, 0.04]} />
      </mesh>
      <mesh position={[-0.28, 1.05, 0]} material={mats.top}>
        <capsuleGeometry args={[0.07, 0.28, 3, 6]} />
      </mesh>
      <mesh position={[0.28, 1.05, 0]} material={mats.top}>
        <capsuleGeometry args={[0.07, 0.28, 3, 6]} />
      </mesh>
      <mesh position={[-0.12, 0.55, 0]} material={mats.bottom}>
        <capsuleGeometry args={[0.09, 0.32, 3, 6]} />
      </mesh>
      <mesh position={[0.12, 0.55, 0]} material={mats.bottom}>
        <capsuleGeometry args={[0.09, 0.32, 3, 6]} />
      </mesh>
      <mesh position={[-0.12, 0.28, 0.06]} material={mats.shoe}>
        <boxGeometry args={[0.16, 0.1, 0.26]} />
      </mesh>
      <mesh position={[0.12, 0.28, 0.06]} material={mats.shoe}>
        <boxGeometry args={[0.16, 0.1, 0.26]} />
      </mesh>
    </group>
  )
}

function BoardMesh({ board }) {
  const mats = useMemo(
    () => ({
      deck: new THREE.MeshStandardMaterial({
        color: board.color,
        emissive: board.emissive,
        emissiveIntensity: 0.7,
        metalness: 0.45,
        roughness: 0.35,
      }),
      trail: new THREE.MeshBasicMaterial({ color: board.trail, transparent: true, opacity: 0.75, toneMapped: false }),
    }),
    [board],
  )
  return (
    <group position={[0, -0.2, 0]} scale={1.3}>
      <mesh material={mats.deck} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.55, 0.08, 1.2]} />
      </mesh>
      <mesh position={[0, 0.02, -0.55]} material={mats.trail} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.55, 8]} />
      </mesh>
    </group>
  )
}

export function ShopPreview({ mode = 'character', characterId, boardId }) {
  const char = getCharacter(characterId)
  const board = getHoverboard(boardId)
  return (
    <div className="shop-preview" aria-hidden="true">
      <Canvas
        dpr={1}
        frameloop="always"
        camera={{ position: [0, 1.2, 3.2], fov: 42 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
        performance={{ min: 0.4 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[2, 4, 2]} intensity={1.3} />
        <directionalLight position={[-2, 2, -1]} intensity={0.45} color="#93c5fd" />
        <Rotator>
          {mode === 'board' ? <BoardMesh board={board} /> : <CharacterMesh colors={char.colors} />}
        </Rotator>
      </Canvas>
    </div>
  )
}
