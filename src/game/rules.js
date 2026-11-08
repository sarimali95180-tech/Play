/**
 * Pure gameplay decision helpers — kept free of React/Three so they can be unit-tested.
 */

/** Collision outcome before Game Over / chase penalties. */
export function collisionAbsorb(powers, immunity = 0) {
  if (immunity > 0) return 'immune'
  if (powers?.shield > 0) return 'shield'
  if (powers?.hoverboard > 0) return 'hoverboard'
  return 'crash'
}

/** Shield-protected collisions must never raise chase danger. */
export function chaseGainOnCollision(absorbKind, stumbleGain) {
  if (absorbKind === 'shield' || absorbKind === 'immune') return 0
  return stumbleGain
}

/** Magnet still active after `elapsed` seconds of unpaused play. */
export function magnetRemaining(duration, elapsedWhilePlaying) {
  return Math.max(0, duration - Math.max(0, elapsedWhilePlaying))
}

/** Coins may be collected only once while active and in range. */
export function canCollectCoin(coin, alreadyCollectedIds) {
  if (!coin || !coin.active) return false
  if (coin.id != null && alreadyCollectedIds?.has?.(coin.id)) return false
  return true
}

/** Default chase reset after Game Over / restart. */
export function defaultChaseState() {
  return { tension: 0.18, intro: 0, state: 'far', gap: 3.4, catchTimer: 0, catchPhase: 0 }
}

/** Map tension → pursuit distance (higher tension = smaller gap). */
export function chaseGapFromTension(tension, gapFar, gapNear) {
  const t = Math.max(0, Math.min(1, tension))
  return gapFar - t * (gapFar - gapNear)
}
