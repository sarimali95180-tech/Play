import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BURST_POOL, COIN_POOL, LANES, OBSTACLE_POOL, world } from './world'

const ACCENTS = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399', '#fb7185']
const BODY = ['#fda4af', '#93c5fd', '#fde68a', '#a7f3d0', '#c4b5fd']
const SIGN_COLORS = ['#38bdf8', '#f472b6', '#fbbf24', '#34d399']

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

function makeBuildings(far, lite = false) {
  const count = lite ? (far ? 6 : 7) : far ? 10 : 12
  const list = []
  let index = 0
  for (const side of [-1, 1]) {
    for (let n = 0; n < count; n += 1) {
      const width = (far ? 2.4 : 2.05) + hash(n * 13 + side * 5 + (far ? 20 : 0)) * (far ? 3.4 : 2.5)
      const depth = 2.5 + hash(n * 17 + (far ? 4 : 3)) * (far ? 3.6 : 3)
      const height = (far ? 7 : 3.6) + hash(n * 19 + side + (far ? 8 : 0)) * (far ? 20 : 14)
      const gap = far ? 11.4 : 4.25
      const x = side * (gap + width / 2 + hash(n + side + (far ? 3 : 1)) * (far ? 1.7 : 1.2))
      list.push({
        index,
        n,
        side,
        width,
        depth,
        height,
        x,
        color: BODY[(n + (side > 0 ? 1 : 0)) % BODY.length],
        accent: ACCENTS[(n + (side > 0 ? 2 : 0)) % ACCENTS.length],
      })
      index += 1
    }
  }
  return list
}

function makeSigns() {
  const list = []
  let index = 0
  for (const side of [-1, 1]) {
    for (let n = 0; n < 10; n += 1) {
      list.push({
        index,
        n,
        side,
        x: side * (5.1 + hash(n * 9 + side) * 1.4),
        y: 2.2 + hash(n * 5 + side * 3) * 4.5,
        w: 0.7 + hash(n + 2) * 1.1,
        h: 0.28 + hash(n + 7) * 0.45,
        color: SIGN_COLORS[(n + (side > 0 ? 1 : 0)) % SIGN_COLORS.length],
      })
      index += 1
    }
  }
  return list
}

function createWindows() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#e2e8f0'
  ctx.fillRect(0, 0, 64, 128)
  const colors = ['#bae6fd', '#fde68a', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fecaca', '#ffffff']
  for (let y = 5; y < 128; y += 11) {
    for (let x = 4; x < 64; x += 11) {
      const lit = (x * 17 + y * 11) % 11 > 2
      ctx.fillStyle = lit ? colors[(x + y) % colors.length] : '#cbd5e1'
      ctx.globalAlpha = lit ? 0.85 + ((x + y) % 5) * 0.03 : 1
      ctx.fillRect(x, y, 7, 7)
    }
  }
  ctx.globalAlpha = 1
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.needsUpdate = true
  return texture
}

function createRoadTexture() {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#5b6472'
  ctx.fillRect(0, 0, 128, 256)
  for (let i = 0; i < 900; i += 1) {
    const shade = 78 + (i % 28)
    ctx.fillStyle = `rgb(${shade},${shade - 2},${shade + 6})`
    ctx.fillRect((i * 37) % 128, (i * 53) % 256, 1 + (i % 2), 1)
  }
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fillRect(60, 0, 8, 256)
  ctx.fillStyle = 'rgba(56,189,248,0.18)'
  ctx.fillRect(2, 0, 4, 256)
  ctx.fillStyle = 'rgba(244,114,182,0.16)'
  ctx.fillRect(122, 0, 4, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 18)
  return texture
}

const stripeTexture = (() => {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1a0b16'
  ctx.fillRect(0, 0, 64, 32)
  ctx.fillStyle = '#ffb703'
  for (let i = -32; i < 96; i += 16) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 10, 0)
    ctx.lineTo(i - 6, 32)
    ctx.lineTo(i - 16, 32)
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
})()

const roadTexture = createRoadTexture()
const roadMat = new THREE.MeshStandardMaterial({
  color: '#4b5563',
  map: roadTexture || undefined,
  roughness: 0.88,
  metalness: 0.06,
})
const shoulderMat = new THREE.MeshStandardMaterial({ color: '#d6d3d1', roughness: 1, metalness: 0 })
const groundMat = new THREE.MeshStandardMaterial({ color: '#86efac', roughness: 1, metalness: 0 })
const curbLeft = new THREE.MeshBasicMaterial({ color: '#f472b6', toneMapped: false })
const curbRight = new THREE.MeshBasicMaterial({ color: '#38bdf8', toneMapped: false })
const glowRail = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.7 })
const dashMat = new THREE.MeshBasicMaterial({ color: '#f8fafc', toneMapped: false })
const coinMat = new THREE.MeshStandardMaterial({
  color: '#ffe566',
  emissive: '#ffb703',
  emissiveIntensity: 1.7,
  roughness: 0.22,
  metalness: 0.7,
  toneMapped: false,
  side: THREE.DoubleSide,
})
const coinCoreMat = new THREE.MeshBasicMaterial({ color: '#fff3b0', toneMapped: false })
const barrierMat = new THREE.MeshStandardMaterial({
  color: '#2a1020',
  roughness: 0.45,
  metalness: 0.4,
  emissive: '#ff2bd6',
  emissiveIntensity: 0.32,
  map: stripeTexture,
})
const wallMat = new THREE.MeshStandardMaterial({
  color: '#101828',
  roughness: 0.36,
  metalness: 0.6,
  emissive: '#22d3ee',
  emissiveIntensity: 0.42,
})
const beamMat = new THREE.MeshBasicMaterial({ color: '#ffb703', toneMapped: false })
const postMat = new THREE.MeshStandardMaterial({
  color: '#241208',
  emissive: '#ff8a00',
  emissiveIntensity: 0.5,
  roughness: 0.4,
  metalness: 0.4,
})
const burstMat = new THREE.MeshBasicMaterial({
  color: '#ffe566',
  toneMapped: false,
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide,
  depthWrite: false,
})
const burstInnerMat = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  toneMapped: false,
  transparent: true,
  opacity: 0.7,
  depthWrite: false,
})
const shadowMat = new THREE.MeshBasicMaterial({
  color: '#020008',
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
})

function Buildings({ far, lite = false }) {
  const body = useRef(null)
  const windows = useRef(null)
  const strips = useRef(null)
  const data = useMemo(() => makeBuildings(far, lite), [far, lite])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const windowTex = useMemo(() => (far || lite ? null : createWindows()), [far, lite])
  const spacing = far ? 14 : 9
  const parallax = far ? 0.7 : 1
  const lastBiome = useRef('')

  const place = () => {
    if (!body.current) return
    const span = spacing * (data.length / 2)
    const scroll = (world.distance * parallax) % span
    for (const building of data) {
      let z = building.n * spacing - scroll
      if (z < -spacing) z += span
      z += far ? 8 : 4
      dummy.position.set(building.x, building.height / 2, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(building.width, building.height, building.depth)
      dummy.updateMatrix()
      body.current.setMatrixAt(building.index, dummy.matrix)

      if (windows.current) {
        const faceX = building.x - building.side * (building.width / 2 + 0.05)
        dummy.position.set(faceX, building.height * 0.52, z)
        dummy.scale.set(0.05, building.height * 0.78, building.depth * 0.7)
        dummy.updateMatrix()
        windows.current.setMatrixAt(building.index, dummy.matrix)
      }
      if (strips.current) {
        const faceX = building.x - building.side * (building.width / 2 + 0.08)
        dummy.position.set(faceX, building.height * 0.5, z)
        dummy.scale.set(0.09, building.height * 0.94, 0.12)
        dummy.updateMatrix()
        strips.current.setMatrixAt(building.index, dummy.matrix)
      }
    }
    body.current.instanceMatrix.needsUpdate = true
    if (windows.current) windows.current.instanceMatrix.needsUpdate = true
    if (strips.current) strips.current.instanceMatrix.needsUpdate = true
  }

  const paintBiome = () => {
    if (!body.current) return
    const v = world.visual
    const bodies = v?.body?.length ? v.body : null
    const accents = v?.accent || ACCENTS
    for (const building of data) {
      color.set(bodies ? bodies[building.n % bodies.length] : building.color)
      body.current.setColorAt(building.index, color)
      if (strips.current) {
        color.set(accents[building.n % accents.length])
        strips.current.setColorAt(building.index, color)
      }
    }
    body.current.instanceColor.needsUpdate = true
    if (strips.current?.instanceColor) strips.current.instanceColor.needsUpdate = true
  }

  useLayoutEffect(() => {
    paintBiome()
    place()
  }, [color, data])

  useFrame(() => {
    place()
    // Repaint only when biome changes — was rewriting every instance every frame
    const id = world.biomeId
    if (id !== lastBiome.current) {
      lastBiome.current = id
      paintBiome()
    }
    const yScale = id === 'desert' ? 0.45 : id === 'jungle' ? 0.75 : id === 'snow' ? 0.85 : id === 'sky' ? 1.25 : 1
    if (body.current?.parent) body.current.parent.scale.y = yScale
  })

  return (
    <group>
      <instancedMesh ref={body} args={[null, null, data.length]} frustumCulled={!far}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.84} metalness={0.22} />
      </instancedMesh>
      {windowTex && (
        <instancedMesh ref={windows} args={[null, null, data.length]} frustumCulled>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial map={windowTex} toneMapped={false} />
        </instancedMesh>
      )}
      <instancedMesh ref={strips} args={[null, null, data.length]} frustumCulled={!far}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

function NeonSigns() {
  const mesh = useRef(null)
  const data = useMemo(() => makeSigns(), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const spacing = 11

  useLayoutEffect(() => {
    data.forEach((sign) => {
      color.set(sign.color)
      mesh.current.setColorAt(sign.index, color)
    })
    mesh.current.instanceColor.needsUpdate = true
  }, [color, data])

  useFrame(() => {
    if (!mesh.current) return
    const span = spacing * (data.length / 2)
    const scroll = world.distance % span
    const pulse = 0.92 + Math.sin(world.elapsed * 3.2) * 0.08
    const accents = world.visual?.accent || SIGN_COLORS
    const id = world.biomeId
    const showSigns = id === 'neon' || id === 'sky' || id === 'snow'
    mesh.current.visible = showSigns
    for (const sign of data) {
      let z = sign.n * spacing - scroll
      if (z < -spacing) z += span
      z += 6
      dummy.position.set(sign.x, sign.y * (id === 'sky' ? 1.35 : 1), z)
      dummy.rotation.set(0, sign.side > 0 ? -0.2 : 0.2, 0)
      dummy.scale.set(sign.w * pulse, sign.h * pulse, 0.08)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(sign.index, dummy.matrix)
      color.set(accents[sign.n % accents.length])
      mesh.current.setColorAt(sign.index, color)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    mesh.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, data.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

function RoadMarks() {
  const dashes = useRef(null)
  const posts = useRef(null)
  const lamps = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const dashState = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        x: i % 2 === 0 ? -1.1 : 1.1,
        z: Math.floor(i / 2) * 4.3 - 8,
      })),
    [],
  )
  const postState = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        x: i % 2 === 0 ? -3.95 : 3.95,
        z: Math.floor(i / 2) * 12 - 6,
        accent: i % 2 === 0,
      })),
    [],
  )

  const placeMarks = () => {
    if (!dashes.current || !posts.current || !lamps.current) return
    const spanDash = 24 * 4.3
    const scroll = world.distance % spanDash
    dashState.forEach((dash, index) => {
      let z = dash.z - scroll
      if (z < -12) z += spanDash
      dummy.position.set(dash.x, 0.05, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      dashes.current.setMatrixAt(index, dummy.matrix)
    })
    dashes.current.instanceMatrix.needsUpdate = true

    const spanPost = 8 * 12
    const postScroll = world.distance % spanPost
    postState.forEach((post, index) => {
      let z = post.z - postScroll
      if (z < -14) z += spanPost
      dummy.position.set(post.x, 0.9, z)
      dummy.scale.set(1, 1, 1)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      posts.current.setMatrixAt(index, dummy.matrix)

      dummy.position.set(post.x, 1.78, z)
      dummy.scale.set(1.4, 1.4, 1.4)
      dummy.updateMatrix()
      lamps.current.setMatrixAt(index, dummy.matrix)
    })
    posts.current.instanceMatrix.needsUpdate = true
    lamps.current.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(placeMarks, [dashState, dummy, postState])
  useFrame(placeMarks)

  return (
    <group>
      <instancedMesh ref={dashes} args={[null, null, dashState.length]} frustumCulled={false}>
        <boxGeometry args={[0.09, 0.035, 1.4]} />
        <primitive object={dashMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={posts} args={[null, null, postState.length]} frustumCulled={false}>
        <boxGeometry args={[0.1, 1.75, 0.1]} />
        <meshBasicMaterial color="#67e8f9" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={lamps} args={[null, null, postState.length]} frustumCulled={false}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#e879f9" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

function Coins() {
  const mesh = useRef(null)
  const cores = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useLayoutEffect(() => {
    for (let i = 0; i < COIN_POOL; i += 1) {
      dummy.position.set(0, -20, 0)
      dummy.scale.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
      cores.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    cores.current.instanceMatrix.needsUpdate = true
  }, [dummy])

  useFrame(() => {
    for (let i = 0; i < COIN_POOL; i += 1) {
      const coin = world.coins[i]
      if (!coin.active) {
        dummy.position.set(0, -30, 0)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(i, dummy.matrix)
        cores.current.setMatrixAt(i, dummy.matrix)
        continue
      }
      const bob = Math.sin(world.elapsed * 4.4 + i) * 0.08
      const high = coin.y > 1.5 ? 1.14 : 1
      const cx = typeof coin.x === 'number' ? coin.x : LANES[coin.lane]
      dummy.position.set(cx, coin.y + bob, coin.z)
      dummy.rotation.set(Math.PI / 2, coin.spin * 1.2, coin.spin)
      dummy.scale.set(high, high, high)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)

      dummy.scale.set(high * 0.35, high * 0.35, high * 0.12)
      dummy.rotation.set(0, coin.spin * 2, 0)
      dummy.updateMatrix()
      cores.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    cores.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={mesh} args={[null, null, COIN_POOL]} frustumCulled={false}>
        <torusGeometry args={[0.27, 0.075, 8, 16]} />
        <primitive object={coinMat} attach="material" />
      </instancedMesh>
      <instancedMesh ref={cores} args={[null, null, COIN_POOL]} frustumCulled={false}>
        <circleGeometry args={[0.14, 12]} />
        <primitive object={coinCoreMat} attach="material" />
      </instancedMesh>
    </group>
  )
}

function Bursts() {
  const rings = useRef([])
  const sparks = useRef([])
  const ringMats = useMemo(() => Array.from({ length: BURST_POOL }, () => burstMat.clone()), [])
  const sparkMats = useMemo(() => Array.from({ length: BURST_POOL }, () => burstInnerMat.clone()), [])

  useFrame(() => {
    for (let i = 0; i < BURST_POOL; i += 1) {
      const burst = world.bursts[i]
      const ring = rings.current[i]
      const spark = sparks.current[i]
      if (!ring || !spark) continue
      if (!burst.active) {
        ring.visible = false
        spark.visible = false
        continue
      }
      ring.visible = true
      spark.visible = true
      const k = 1 - burst.life / 0.32
      ring.position.set(burst.x, burst.y, burst.z)
      spark.position.set(burst.x, burst.y, burst.z)
      ring.scale.setScalar(0.35 + k * 1.9)
      spark.scale.setScalar(0.45 + (1 - k) * 0.8)
      ring.material.opacity = Math.max(0, 0.9 * (1 - k))
      spark.material.opacity = Math.max(0, 0.75 * (1 - k))
      ring.rotation.z = k * 2.5
    }
  })

  return (
    <group>
      {ringMats.map((material, i) => (
        <group key={i}>
          <mesh
            ref={(node) => {
              rings.current[i] = node
            }}
            visible={false}
            rotation={[Math.PI / 2, 0, 0]}
            material={material}
          >
            <ringGeometry args={[0.16, 0.3, 18]} />
          </mesh>
          <mesh
            ref={(node) => {
              sparks.current[i] = node
            }}
            visible={false}
            material={sparkMats[i]}
          >
            <sphereGeometry args={[0.12, 8, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function ObstacleSlot({ index }) {
  const group = useRef(null)
  const barrier = useRef(null)
  const overhead = useRef(null)
  const wall = useRef(null)

  useFrame(() => {
    const obstacle = world.obstacles[index]
    if (!obstacle?.active) {
      group.current.visible = false
      return
    }
    group.current.visible = true
    group.current.position.set(LANES[obstacle.lane], 0, obstacle.z)
    barrier.current.visible = obstacle.type === 'barrier'
    overhead.current.visible = obstacle.type === 'overhead'
    wall.current.visible = obstacle.type === 'wall'
  })

  return (
    <group ref={group} visible={false}>
      <group ref={barrier}>
        <mesh position={[0, 0.42, 0]} material={barrierMat}>
          <boxGeometry args={[1.18, 0.78, 0.68]} />
        </mesh>
        <mesh position={[0, 0.86, 0]}>
          <boxGeometry args={[1.22, 0.08, 0.08]} />
          <primitive object={beamMat} attach="material" />
        </mesh>
        <mesh position={[-0.42, 0.2, 0.36]} material={postMat}>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
        </mesh>
        <mesh position={[0.42, 0.2, 0.36]} material={postMat}>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
        </mesh>
      </group>
      <group ref={overhead}>
        <mesh position={[-0.5, 0.58, 0]} material={postMat}>
          <boxGeometry args={[0.12, 1.16, 0.12]} />
        </mesh>
        <mesh position={[0.5, 0.58, 0]} material={postMat}>
          <boxGeometry args={[0.12, 1.16, 0.12]} />
        </mesh>
        <mesh position={[0, 1.24, 0]}>
          <boxGeometry args={[1.3, 0.24, 0.3]} />
          <primitive object={beamMat} attach="material" />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[1.1, 0.07, 0.08]} />
          <meshBasicMaterial color="#fff1a8" toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.24, 0.18]}>
          <boxGeometry args={[1.05, 0.06, 0.04]} />
          <meshBasicMaterial color="#ff4fd8" toneMapped={false} />
        </mesh>
      </group>
      <group ref={wall}>
        <mesh position={[0, 1.05, 0]} material={wallMat}>
          <boxGeometry args={[1.3, 2.08, 0.3]} />
        </mesh>
        <mesh position={[0, 1.05, 0.17]}>
          <boxGeometry args={[1.4, 0.09, 0.04]} />
          <meshBasicMaterial color="#67e8f9" toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.92, 0.17]}>
          <boxGeometry args={[0.09, 0.55, 0.04]} />
          <meshBasicMaterial color="#ff4fd8" toneMapped={false} />
        </mesh>
        <mesh position={[-0.45, 0.35, 0.17]}>
          <boxGeometry args={[0.2, 0.08, 0.04]} />
          <meshBasicMaterial color="#f6e27a" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

function Shadow() {
  const ref = useRef(null)
  useFrame(() => {
    const player = world.player
    const air = Math.max(0.38, 1 - player.y * 0.28)
    ref.current.position.set(player.x, 0.03, 0.05)
    ref.current.scale.set(air * (1 + Math.abs(player.lean) * 0.5), air, 1)
    ref.current.material.opacity = 0.26 + air * 0.14
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.48, 18]} />
      <primitive object={shadowMat} attach="material" />
    </mesh>
  )
}

function RoadScroll() {
  useFrame(() => {
    if (roadTexture) {
      roadTexture.offset.y = (world.distance * 0.035) % 1
    }
  })
  return null
}

function BiomeRoadSync() {
  useFrame(() => {
    const v = world.visual
    if (!v) return
    if (v.road) roadMat.color.set(v.road)
    if (v.bg || v.fog) groundMat.color.set(v.bg || v.fog)
    if (v.curbA) curbLeft.color.set(v.curbA)
    if (v.curbB) curbRight.color.set(v.curbB)
    if (v.body?.[0]) shoulderMat.color.set(v.body[0])
    if (v.accent?.[1]) glowRail.color.set(v.accent[1])
  })
  return null
}

export function Track({ mobile = false } = {}) {
  return (
    <group>
      <BiomeRoadSync />
      <RoadScroll />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 24]} frustumCulled={false}>
        <planeGeometry args={[110, 180]} />
        <primitive object={groundMat} attach="material" />
      </mesh>
      <mesh position={[0, -0.09, 30]} frustumCulled={false}>
        <boxGeometry args={[9.6, 0.08, 140]} />
        <primitive object={shoulderMat} attach="material" />
      </mesh>
      <mesh position={[0, -0.02, 30]} frustumCulled={false}>
        <boxGeometry args={[7.2, 0.12, 140]} />
        <primitive object={roadMat} attach="material" />
      </mesh>
      <mesh position={[-3.62, 0.1, 30]} frustumCulled={false}>
        <boxGeometry args={[0.11, 0.18, 140]} />
        <primitive object={curbLeft} attach="material" />
      </mesh>
      <mesh position={[3.62, 0.1, 30]} frustumCulled={false}>
        <boxGeometry args={[0.11, 0.18, 140]} />
        <primitive object={curbRight} attach="material" />
      </mesh>
      <mesh position={[-3.35, 0.04, 30]} frustumCulled={false}>
        <boxGeometry args={[0.04, 0.05, 140]} />
        <primitive object={glowRail} attach="material" />
      </mesh>
      <mesh position={[3.35, 0.04, 30]} frustumCulled={false}>
        <boxGeometry args={[0.04, 0.05, 140]} />
        <primitive object={glowRail} attach="material" />
      </mesh>
      <RoadMarks />
      <Buildings far={false} lite={mobile} />
      <Buildings far lite={mobile} />
      {!mobile && <NeonSigns />}
      <Coins />
      <Bursts />
      <Shadow />
      {Array.from({ length: OBSTACLE_POOL }, (_, index) => (
        <ObstacleSlot key={index} index={index} />
      ))}
    </group>
  )
}
