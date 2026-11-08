import { Canvas } from '@react-three/fiber'
import { Component, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Scene } from './game/Scene'
import { useGameInput } from './game/useInput'
import { meta } from './game/meta'
import { isMobileClient, resolveDprCap } from './game/perf'
import { Hud } from './ui/Hud'
import { WebGLFallback } from './ui/WebGLFallback'

class GameErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <WebGLFallback error={this.state.error} />
    }
    return this.props.children
  }
}

export default function App() {
  useGameInput()
  const mobile = useMemo(() => isMobileClient(), [])
  const [dprCap] = useState(() => resolveDprCap(meta.settings?.graphics || 'auto'))

  return (
    <div className="app">
      <GameErrorBoundary>
        <Canvas
          className="game-canvas"
          dpr={dprCap}
          shadows={false}
          flat={mobile}
          gl={{
            antialias: !mobile && dprCap > 1.05,
            alpha: false,
            stencil: false,
            depth: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            // ACES is prettier but costly on phones — keep it snappy there
            gl.toneMapping = mobile ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = mobile ? 1 : 1.12
            gl.outputColorSpace = THREE.SRGBColorSpace
            gl.setClearColor('#87ceeb', 1)
            gl.setPixelRatio(dprCap)
          }}
        >
          <Scene dprCap={dprCap} mobile={mobile} />
        </Canvas>
        <div className="vignette" />
      </GameErrorBoundary>
      <Hud />
    </div>
  )
}
