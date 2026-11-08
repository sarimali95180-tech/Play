import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CONFIG } from './config'
import { getQuality } from './perf'
import { LANES, TRAIN_POOL, VEHICLE_POOL, world } from './world'

const paint = {
  car: new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.35, metalness: 0.55 }),
  carDark: new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.4, metalness: 0.5 }),
  taxi: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.38, metalness: 0.4 }),
  taxiBlack: new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.45, metalness: 0.3 }),
  bus: new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.42, metalness: 0.35 }),
  truck: new THREE.MeshStandardMaterial({ color: '#a8a29e', roughness: 0.48, metalness: 0.4 }),
  truckCab: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4, metalness: 0.4 }),
  police: new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.35, metalness: 0.5 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.85 }),
}
const glass = new THREE.MeshStandardMaterial({
  color: '#7dd3fc',
  roughness: 0.08,
  metalness: 0.15,
  transparent: true,
  opacity: 0.55,
})
const wheelMat = new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.85, metalness: 0.15 })
const rimMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.35, metalness: 0.7 })
const lightFront = new THREE.MeshBasicMaterial({ color: '#fff7ad', toneMapped: false })
const lightBack = new THREE.MeshBasicMaterial({ color: '#ef4444', toneMapped: false })
const lightBlue = new THREE.MeshBasicMaterial({ color: '#38bdf8', toneMapped: false })
const lightRed = new THREE.MeshBasicMaterial({ color: '#f87171', toneMapped: false })
const black = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.6, metalness: 0.2 })
const trainBody = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4, metalness: 0.45 })
const trainNose = new THREE.MeshStandardMaterial({ color: '#0ea5e9', roughness: 0.35, metalness: 0.5 })
const trainStripe = new THREE.MeshStandardMaterial({
  color: '#0369a1',
  emissive: '#0284c7',
  emissiveIntensity: 0.35,
  roughness: 0.4,
  metalness: 0.4,
  toneMapped: false,
})
const trainRoof = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.35 })
const railMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.45, metalness: 0.7 })

function Wheel({ position }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={wheelMat}>
        <cylinderGeometry args={[0.28, 0.28, 0.22, 12]} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} material={rimMat}>
        <cylinderGeometry args={[0.14, 0.14, 0.24, 8]} />
      </mesh>
    </group>
  )
}

function Sedan({ bodyMat, accentMat, roofLight }) {
  return (
    <group>
      {/* Lower body */}
      <mesh position={[0, 0.42, 0]} material={bodyMat}>
        <boxGeometry args={[1.2, 0.48, 2.55]} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.82, -0.12]} material={bodyMat}>
        <boxGeometry args={[1.05, 0.42, 1.35]} />
      </mesh>
      {/* Hood slope cue */}
      <mesh position={[0, 0.58, 0.85]} material={accentMat || bodyMat}>
        <boxGeometry args={[1.12, 0.16, 0.55]} />
      </mesh>
      {/* Trunk */}
      <mesh position={[0, 0.58, -1.0]} material={bodyMat}>
        <boxGeometry args={[1.12, 0.18, 0.4]} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 0.88, 0.42]} material={glass}>
        <boxGeometry args={[0.95, 0.28, 0.08]} />
      </mesh>
      <mesh position={[0, 0.88, -0.7]} material={glass}>
        <boxGeometry args={[0.95, 0.28, 0.08]} />
      </mesh>
      <mesh position={[-0.52, 0.86, -0.1]} material={glass}>
        <boxGeometry args={[0.06, 0.28, 1.05]} />
      </mesh>
      <mesh position={[0.52, 0.86, -0.1]} material={glass}>
        <boxGeometry args={[0.06, 0.28, 1.05]} />
      </mesh>
      {/* Bumpers */}
      <mesh position={[0, 0.28, 1.3]} material={paint.chrome}>
        <boxGeometry args={[1.15, 0.16, 0.12]} />
      </mesh>
      <mesh position={[0, 0.28, -1.3]} material={paint.chrome}>
        <boxGeometry args={[1.15, 0.16, 0.12]} />
      </mesh>
      {/* Lights */}
      <mesh position={[-0.38, 0.4, 1.3]} material={lightFront}>
        <boxGeometry args={[0.28, 0.12, 0.08]} />
      </mesh>
      <mesh position={[0.38, 0.4, 1.3]} material={lightFront}>
        <boxGeometry args={[0.28, 0.12, 0.08]} />
      </mesh>
      <mesh position={[-0.38, 0.4, -1.3]} material={lightBack}>
        <boxGeometry args={[0.26, 0.12, 0.08]} />
      </mesh>
      <mesh position={[0.38, 0.4, -1.3]} material={lightBack}>
        <boxGeometry args={[0.26, 0.12, 0.08]} />
      </mesh>
      {roofLight}
      <Wheel position={[-0.52, 0.28, 0.78]} />
      <Wheel position={[0.52, 0.28, 0.78]} />
      <Wheel position={[-0.52, 0.28, -0.78]} />
      <Wheel position={[0.52, 0.28, -0.78]} />
    </group>
  )
}

function BusModel() {
  return (
    <group>
      <mesh position={[0, 0.95, 0]} material={paint.bus}>
        <boxGeometry args={[1.4, 1.55, 4.4]} />
      </mesh>
      <mesh position={[0, 1.65, 0]} material={black}>
        <boxGeometry args={[1.35, 0.12, 4.2]} />
      </mesh>
      {/* Window strip */}
      <mesh position={[0, 1.15, 0.15]} material={glass}>
        <boxGeometry args={[1.42, 0.45, 3.6]} />
      </mesh>
      <mesh position={[0, 1.05, 2.15]} material={glass}>
        <boxGeometry args={[1.15, 0.55, 0.1]} />
      </mesh>
      <mesh position={[0, 0.35, 2.25]} material={paint.chrome}>
        <boxGeometry args={[1.3, 0.2, 0.12]} />
      </mesh>
      <mesh position={[-0.4, 0.45, 2.25]} material={lightFront}>
        <boxGeometry args={[0.3, 0.14, 0.08]} />
      </mesh>
      <mesh position={[0.4, 0.45, 2.25]} material={lightFront}>
        <boxGeometry args={[0.3, 0.14, 0.08]} />
      </mesh>
      <mesh position={[-0.45, 0.55, -2.2]} material={lightBack}>
        <boxGeometry args={[0.28, 0.18, 0.08]} />
      </mesh>
      <mesh position={[0.45, 0.55, -2.2]} material={lightBack}>
        <boxGeometry args={[0.28, 0.18, 0.08]} />
      </mesh>
      <Wheel position={[-0.58, 0.3, 1.4]} />
      <Wheel position={[0.58, 0.3, 1.4]} />
      <Wheel position={[-0.58, 0.3, -1.4]} />
      <Wheel position={[0.58, 0.3, -1.4]} />
    </group>
  )
}

function TruckModel() {
  return (
    <group>
      {/* Cab */}
      <mesh position={[0, 0.85, 1.05]} material={paint.truckCab}>
        <boxGeometry args={[1.25, 1.2, 1.35]} />
      </mesh>
      <mesh position={[0, 1.15, 1.45]} material={glass}>
        <boxGeometry args={[1.1, 0.45, 0.1]} />
      </mesh>
      {/* Cargo */}
      <mesh position={[0, 1.05, -0.7]} material={paint.truck}>
        <boxGeometry args={[1.35, 1.5, 2.4]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={black}>
        <boxGeometry args={[1.2, 0.2, 3.5]} />
      </mesh>
      <mesh position={[-0.35, 0.55, 1.75]} material={lightFront}>
        <boxGeometry args={[0.28, 0.12, 0.08]} />
      </mesh>
      <mesh position={[0.35, 0.55, 1.75]} material={lightFront}>
        <boxGeometry args={[0.28, 0.12, 0.08]} />
      </mesh>
      <Wheel position={[-0.55, 0.3, 1.1]} />
      <Wheel position={[0.55, 0.3, 1.1]} />
      <Wheel position={[-0.55, 0.3, -1.1]} />
      <Wheel position={[0.55, 0.3, -1.1]} />
    </group>
  )
}

function VehicleModel({ kind }) {
  if (kind === 'bus') return <BusModel />
  if (kind === 'truck') return <TruckModel />
  if (kind === 'taxi') {
    return (
      <Sedan
        bodyMat={paint.taxi}
        accentMat={paint.taxiBlack}
        roofLight={(
          <mesh position={[0, 1.12, -0.05]} material={paint.taxiBlack}>
            <boxGeometry args={[0.45, 0.16, 0.35]} />
          </mesh>
        )}
      />
    )
  }
  if (kind === 'police') {
    return (
      <Sedan
        bodyMat={paint.police}
        accentMat={paint.chrome}
        roofLight={(
          <group position={[0, 1.12, -0.05]}>
            <mesh position={[-0.16, 0, 0]} material={lightBlue}>
              <boxGeometry args={[0.22, 0.12, 0.28]} />
            </mesh>
            <mesh position={[0.16, 0, 0]} material={lightRed}>
              <boxGeometry args={[0.22, 0.12, 0.28]} />
            </mesh>
          </group>
        )}
      />
    )
  }
  return <Sedan bodyMat={paint.car} accentMat={paint.carDark} />
}

function VehicleSlot({ index }) {
  const ref = useRef(null)
  const kindRef = useRef('car')
  const [kind, setKind] = useState('car')

  useFrame(() => {
    const item = world.vehicles[index]
    if (!ref.current) return
    if (!item?.active) {
      ref.current.visible = false
      return
    }
    ref.current.visible = true
    ref.current.position.set(LANES[item.lane], 0, item.z)
    ref.current.rotation.y = item.oncoming ? Math.PI : 0
    // Mount only the active kind — was mounting all 5 variants per slot (~70 cars)
    if (item.kind && item.kind !== kindRef.current) {
      kindRef.current = item.kind
      setKind(item.kind)
    }
  })

  return (
    <group ref={ref} visible={false}>
      <VehicleModel kind={kind} />
    </group>
  )
}

function Carriage({ z, loco }) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 1.2, 0]} material={loco ? trainNose : trainBody}>
        <boxGeometry args={[1.55, 2.15, 5.1]} />
      </mesh>
      <mesh position={[0, 2.35, 0]} material={trainRoof}>
        <boxGeometry args={[1.45, 0.2, 4.8]} />
      </mesh>
      <mesh position={[0, 1.55, 0]} material={glass}>
        <boxGeometry args={[1.56, 0.55, 4.2]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={trainStripe}>
        <boxGeometry args={[1.58, 0.22, 5.0]} />
      </mesh>
      {loco && (
        <>
          <mesh position={[0, 1.15, 2.55]} material={glass}>
            <boxGeometry args={[1.2, 0.7, 0.12]} />
          </mesh>
          <mesh position={[-0.4, 0.85, 2.6]} material={lightFront}>
            <boxGeometry args={[0.35, 0.28, 0.12]} />
          </mesh>
          <mesh position={[0.4, 0.85, 2.6]} material={lightFront}>
            <boxGeometry args={[0.35, 0.28, 0.12]} />
          </mesh>
          <mesh position={[0, 0.45, 2.55]} material={paint.chrome}>
            <boxGeometry args={[1.3, 0.25, 0.15]} />
          </mesh>
        </>
      )}
      {!loco && (
        <mesh position={[0.55, 0.85, 0.4]} material={trainStripe}>
          <boxGeometry args={[0.08, 0.9, 0.55]} />
        </mesh>
      )}
      <Wheel position={[-0.6, 0.32, 1.5]} />
      <Wheel position={[0.6, 0.32, 1.5]} />
      <Wheel position={[-0.6, 0.32, -1.5]} />
      <Wheel position={[0.6, 0.32, -1.5]} />
    </group>
  )
}

const TRAIN_CAR_STEP = 5.4

function TrainSlot({ index }) {
  const ref = useRef(null)
  const stripe = useRef(null)
  const rails = useRef(null)
  const color = useMemo(() => new THREE.Color(), [])
  // Cap carriages by graphics tier — 14×4 always-mounted trains crushed mobile FPS
  const maxCars = Math.max(4, Math.min(14, getQuality().trainCars || 8))
  const carOffsets = useMemo(() => {
    const mid = (maxCars - 1) / 2
    return Array.from({ length: maxCars }, (_, i) => (i - mid) * TRAIN_CAR_STEP)
  }, [maxCars])

  useFrame(() => {
    const item = world.trains[index]
    if (!ref.current) return
    if (!item?.active) {
      ref.current.visible = false
      return
    }
    ref.current.visible = true
    ref.current.position.set(LANES[item.lane], 0, item.z)
    ref.current.rotation.y = item.oncoming ? Math.PI : 0
    // Center coaches on item.z so visuals match collision length (no invisible hitbox)
    const cars = Math.min(maxCars, Math.max(3, item.cars || 4))
    const mid = (cars - 1) / 2
    const locoIndex = maxCars - 1
    for (let i = 0; i < maxCars; i += 1) {
      const child = ref.current.children[i]
      if (!child) continue
      if (i === locoIndex) {
        // Locomotive always at the front (+Z) of the consist
        child.visible = true
        child.position.z = ((cars - 1) - mid) * TRAIN_CAR_STEP
        continue
      }
      const coachSlot = i // 0 .. maxCars-2
      if (coachSlot < cars - 1) {
        child.visible = true
        child.position.z = (coachSlot - mid) * TRAIN_CAR_STEP
      } else {
        child.visible = false
      }
    }
    if (rails.current) {
      const len = item.length || cars * TRAIN_CAR_STEP
      rails.current.scale.z = len / Math.max(1, CONFIG.train.length)
    }
    if (stripe.current) {
      stripe.current.position.z = 0
      const accents = world.visual?.accent
      if (accents?.[0]) {
        color.set(accents[0])
        stripe.current.material.color.copy(color)
        stripe.current.material.emissive.copy(color)
      }
    }
  })

  return (
    <group ref={ref} visible={false}>
      {carOffsets.map((z, i) => (
        <Carriage key={i} z={z} loco={i === maxCars - 1} />
      ))}
      <group ref={rails}>
        <mesh position={[-0.45, 0.05, 0]} material={railMat}>
          <boxGeometry args={[0.08, 0.06, CONFIG.train.length]} />
        </mesh>
        <mesh position={[0.45, 0.05, 0]} material={railMat}>
          <boxGeometry args={[0.08, 0.06, CONFIG.train.length]} />
        </mesh>
      </group>
      <mesh ref={stripe} position={[0, 2.55, 0]} material={trainStripe}>
        <boxGeometry args={[0.8, 0.12, 0.8]} />
      </mesh>
    </group>
  )
}

export function TrafficField() {
  const slots = Math.min(VEHICLE_POOL, getQuality().vehiclePool || VEHICLE_POOL)
  return (
    <group>
      {Array.from({ length: slots }, (_, i) => (
        <VehicleSlot key={`v${i}`} index={i} />
      ))}
      {Array.from({ length: TRAIN_POOL }, (_, i) => (
        <TrainSlot key={`t${i}`} index={i} />
      ))}
    </group>
  )
}
