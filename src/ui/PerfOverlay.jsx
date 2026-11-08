import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { createFrameStats, getQuality, tickAutoQuality } from '../game/perf'
import { world } from '../game/world'

/**
 * DEV-only metrics. Mounted inside the Canvas so renderer.info is available.
 * Hidden for production players.
 */
export function PerfOverlayBridge({ enabled }) {
  const gl = useThree((s) => s.gl)
  const setDpr = useThree((s) => s.setDpr)
  const stats = useRef(createFrameStats())
  const bus = useRef({ fps: 0, avgMs: 0, low1: 0, calls: 0, tris: 0, geometries: 0, textures: 0 })

  useFrame(() => {
    if (!enabled) return
    stats.current.sample()
    const snap = stats.current.snapshot()
    tickAutoQuality(snap.fps, setDpr)
    const info = gl.info
    bus.current = {
      fps: snap.fps,
      avgMs: snap.avgMs,
      low1: snap.low1,
      calls: info.render?.calls ?? 0,
      tris: info.render?.triangles ?? 0,
      geometries: info.memory?.geometries ?? 0,
      textures: info.memory?.textures ?? 0,
    }
    // Expose for the HTML overlay (outside Canvas)
    window.__NEON_PERF__ = bus.current
  })

  return null
}

export function PerfOverlayHud() {
  const [open, setOpen] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    const id = window.setInterval(() => {
      const q = getQuality()
      const p = window.__NEON_PERF__ || {}
      let activeParticles = 0
      for (const b of world.bursts) if (b.active) activeParticles += 1
      let activeMeshes = 0
      for (const o of world.obstacles) if (o.active) activeMeshes += 1
      for (const v of world.vehicles) if (v.active) activeMeshes += 1
      for (const t of world.trains) if (t.active) activeMeshes += 1
      for (const c of world.coins) if (c.active) activeMeshes += 1
      setData({
        ...p,
        preset: q.preset,
        effective: q.effective,
        dpr: q.dpr,
        activeMeshes,
        activeParticles,
        speed: world.speed,
        status: world.status,
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [])

  if (!import.meta.env.DEV || !open) {
    if (!import.meta.env.DEV) return null
    return (
      <button type="button" className="perf-fab" onClick={() => setOpen(true)} aria-label="Show perf">
        FPS
      </button>
    )
  }

  const fps = data?.fps || 0
  return (
    <div className="perf-overlay" role="status" aria-label="Developer performance metrics">
      <header>
        <strong>PERF · DEV</strong>
        <button type="button" onClick={() => setOpen(false)}>Hide</button>
      </header>
      <ul>
        <li>FPS <em>{fps.toFixed(0)}</em></li>
        <li>Avg frame <em>{(data?.avgMs || 0).toFixed(1)} ms</em></li>
        <li>1% low <em>{(data?.low1 || 0).toFixed(0)}</em></li>
        <li>Draw calls <em>{data?.calls ?? '—'}</em></li>
        <li>Triangles <em>{data?.tris ?? '—'}</em></li>
        <li>Geometries <em>{data?.geometries ?? '—'}</em></li>
        <li>Textures <em>{data?.textures ?? '—'}</em></li>
        <li>Active props <em>{data?.activeMeshes ?? 0}</em></li>
        <li>Burst FX <em>{data?.activeParticles ?? 0}</em></li>
        <li>Preset <em>{data?.preset}/{data?.effective}</em></li>
        <li>DPR <em>{(data?.dpr || 1).toFixed(2)}</em></li>
        <li>Speed <em>{(data?.speed || 0).toFixed(1)}</em></li>
      </ul>
      <p className="perf-note">GPU timer queries not used — FPS from rAF. Values approximate.</p>
    </div>
  )
}
