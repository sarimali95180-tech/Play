import { useEffect } from 'react'
import {
  backToMenu,
  beginRun,
  debugBiome,
  debugGrant,
  debugToggleGodShield,
  queueJump,
  queueLane,
  queueSlide,
  resumeRun,
  skipCatchSequence,
  toggleMute,
  togglePause,
  world,
} from './world.js'

export function useGameInput() {
  useEffect(() => {
    const onKey = (event) => {
      const code = event.code
      const blocksScroll = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Space',
        'KeyA',
        'KeyD',
        'KeyW',
        'KeyS',
        'Escape',
        'KeyP',
      ]
      if (blocksScroll.includes(code)) event.preventDefault()

      if (world.status === 'menu' && (code === 'Enter' || code === 'Space')) {
        event.preventDefault()
        beginRun()
        return
      }
      if (world.status === 'gameover' && (code === 'Enter' || code === 'Space' || code === 'KeyR')) {
        event.preventDefault()
        beginRun()
        return
      }
      if (world.status === 'catching' && (code === 'Escape' || code === 'Space' || code === 'Enter')) {
        event.preventDefault()
        skipCatchSequence()
        return
      }
      if (world.status === 'gameover' && code === 'Escape') {
        backToMenu()
        return
      }
      if (code === 'KeyM') {
        event.preventDefault()
        toggleMute()
        return
      }
      // Permanent shield toggle — only protects while ON; otherwise hits end the run
      if (code === 'Digit0' || code === 'Numpad0' || event.key === '0') {
        event.preventDefault()
        debugToggleGodShield()
        return
      }
      if (import.meta.env.DEV) {
        if (code === 'Digit1' || code === 'Numpad1') debugGrant('magnet')
        if (code === 'Digit2' || code === 'Numpad2') debugGrant('jetpack')
        if (code === 'Digit3' || code === 'Numpad3') debugGrant('shield')
        if (code === 'Digit4' || code === 'Numpad4') debugGrant('multiplier')
        if (code === 'Digit5' || code === 'Numpad5') debugGrant('hoverboard')
        if (code === 'BracketRight') debugBiome(1)
        if (code === 'BracketLeft') debugBiome(-1)
      }
      if (world.status === 'countdown') return
      if ((world.status === 'playing' || world.status === 'paused') && (code === 'Escape' || code === 'KeyP')) {
        event.preventDefault()
        togglePause()
        return
      }
      if (world.status === 'paused' && (code === 'Enter' || code === 'Space')) {
        event.preventDefault()
        resumeRun()
        return
      }
      if (world.status !== 'playing') return

      const oneShot = code === 'Space' || code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowDown' || code === 'KeyS'
      if (event.repeat && oneShot) return

      if (code === 'ArrowLeft' || code === 'KeyA') queueLane(1)
      else if (code === 'ArrowRight' || code === 'KeyD') queueLane(-1)
      else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') queueJump()
      else if (code === 'ArrowDown' || code === 'KeyS') queueSlide()
    }

    let tracking = false
    let startX = 0
    let startY = 0
    let startTime = 0

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return
      const target = event.target
      if (target instanceof Element && target.closest('button, a, input, textarea, select, .panel')) return
      tracking = true
      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
      startTime = performance.now()
    }

    const onTouchMove = (event) => {
      if (world.status === 'playing' || world.status === 'countdown') event.preventDefault()
    }

    const onTouchEnd = (event) => {
      if (!tracking) return
      tracking = false
      if (world.status === 'gameover') {
        const touch = event.changedTouches[0]
        if (!touch) return
        if (Math.hypot(touch.clientX - startX, touch.clientY - startY) < 18) beginRun()
        return
      }
      if (world.status !== 'playing') return
      const touch = event.changedTouches[0]
      if (!touch) return
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      // Slightly lower threshold + velocity feel for phones
      if (Math.max(absX, absY) < 22) return
      if (performance.now() - startTime > 650) return
      if (absX > absY * 0.85) queueLane(dx > 0 ? -1 : 1)
      else if (dy < 0) queueJump()
      else queueSlide()
    }

    window.addEventListener('keydown', onKey, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])
}
