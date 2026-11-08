/**
 * Lightweight automated checks for shield priority, magnet duration,
 * single coin collect, and chase reset. Run: npm run test:gameplay
 */
import assert from 'node:assert/strict'
import {
  canCollectCoin,
  chaseGapFromTension,
  chaseGainOnCollision,
  collisionAbsorb,
  defaultChaseState,
  magnetRemaining,
} from '../src/game/rules.js'
import { CONFIG } from '../src/game/config.js'

let passed = 0
function check(name, fn) {
  fn()
  passed += 1
  console.log(`ok - ${name}`)
}

check('shield has priority over crash', () => {
  assert.equal(collisionAbsorb({ shield: 1, hoverboard: 1 }, 0), 'shield')
})

check('immunity blocks collision before shield check order for absorb path', () => {
  assert.equal(collisionAbsorb({ shield: 0 }, 1.5), 'immune')
})

check('no shield / board => crash', () => {
  assert.equal(collisionAbsorb({ shield: 0, hoverboard: 0 }, 0), 'crash')
})

check('shield collision adds zero chase danger', () => {
  assert.equal(chaseGainOnCollision('shield', CONFIG.chase.stumbleGain), 0)
})

check('crash collision applies chase gain', () => {
  assert.equal(chaseGainOnCollision('crash', CONFIG.chase.stumbleGain), CONFIG.chase.stumbleGain)
})

check('magnet duration is 15 seconds', () => {
  assert.equal(CONFIG.magnet.duration, 15)
  assert.equal(magnetRemaining(CONFIG.magnet.duration, 0), 15)
  assert.equal(magnetRemaining(CONFIG.magnet.duration, 7), 8)
  assert.equal(magnetRemaining(CONFIG.magnet.duration, 20), 0)
})

check('shield immunity is ~1.5s', () => {
  assert.equal(CONFIG.shield.immunity, 1.5)
})

check('coin collected exactly once', () => {
  const coin = { id: 'c1', active: true }
  const seen = new Set()
  assert.equal(canCollectCoin(coin, seen), true)
  seen.add(coin.id)
  coin.active = false
  assert.equal(canCollectCoin(coin, seen), false)
})

check('chase reset state', () => {
  const c = defaultChaseState()
  assert.equal(c.state, 'far')
  assert.ok(c.tension < 0.3)
  assert.equal(c.intro, 0)
  assert.equal(c.catchTimer, 0)
})

check('chase gap shrinks with tension', () => {
  const far = chaseGapFromTension(0, CONFIG.chase.gapFar, CONFIG.chase.gapNear)
  const near = chaseGapFromTension(1, CONFIG.chase.gapFar, CONFIG.chase.gapNear)
  assert.ok(Math.abs(far - CONFIG.chase.gapFar) < 1e-9)
  assert.ok(Math.abs(near - CONFIG.chase.gapNear) < 1e-6)
  assert.ok(near < far)
  // Pack must stay in front of typical camera z (~-8.4)
  assert.ok(CONFIG.chase.gapFar <= 4.0, 'gapFar keeps dog close behind player')
})

check('biome first change at 400m with 10 worlds', () => {
  assert.equal(CONFIG.biome.firstChangeAt, 400)
  assert.equal(CONFIG.biome.randomGapMin, 300)
  assert.equal(CONFIG.biome.randomGapMax, 700)
  assert.equal(CONFIG.biome.order.length, 10)
})

check('arrest sequence is ~5 seconds', () => {
  assert.equal(CONFIG.chase.catchDuration, 5)
})

check('near-miss gain cannot alone reach catch threshold', () => {
  assert.ok(CONFIG.chase.nearMissGain < CONFIG.chase.catchThreshold - 0.1)
  assert.ok(CONFIG.chase.nearMissBoostTime >= 3 && CONFIG.chase.nearMissBoostTime <= 5)
})

console.log(`\n${passed} checks passed`)
