/**
 * Economy / reward integrity checks. Run: node scripts/economy-checks.mjs
 * Uses an in-memory localStorage shim — does not touch the browser store.
 */
import assert from 'node:assert/strict'

const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}

const Meta = await import('../src/game/meta.js')

let passed = 0
function check(name, fn) {
  fn()
  passed += 1
  console.log(`ok - ${name}`)
}

function reset() {
  mem.clear()
  Meta.refreshMetaFromStorage()
}

check('duplicate character purchase blocked', () => {
  reset()
  Meta.meta.wallet = 20000
  const first = Meta.buyCharacter('maya')
  const second = Meta.buyCharacter('maya')
  assert.equal(first.ok, true)
  assert.equal(second.ok, false)
  assert.equal(second.reason, 'owned')
})

check('duplicate hoverboard purchase blocked', () => {
  reset()
  Meta.meta.wallet = 20000
  assert.equal(Meta.buyHoverboard('fire').ok, true)
  assert.equal(Meta.buyHoverboard('fire').reason, 'owned')
})

check('insufficient funds blocked', () => {
  reset()
  Meta.meta.wallet = 10
  const r = Meta.buyCharacter('robo')
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'funds')
  assert.equal(Meta.meta.wallet, 10)
})

check('daily mission claim once', () => {
  reset()
  Meta.bumpDaily('jumps', 30)
  const a = Meta.claimDaily('jump20')
  const b = Meta.claimDaily('jump20')
  assert.equal(a.ok, true)
  assert.equal(b.reason, 'claimed')
})

check('daily login once per day + streak', () => {
  reset()
  const day1 = new Date(2026, 0, 1, 12)
  const r1 = Meta.claimDailyLogin(day1)
  assert.equal(r1.ok, true)
  assert.equal(r1.day, 1)
  assert.equal(Meta.claimDailyLogin(day1).reason, 'claimed')
  const day2 = new Date(2026, 0, 2, 12)
  const r2 = Meta.claimDailyLogin(day2)
  assert.equal(r2.ok, true)
  assert.equal(r2.day, 2)
  assert.equal(r2.reward, Meta.DAILY_LOGIN_REWARDS[1].coins)
})

check('day 7 special reward amount', () => {
  assert.equal(Meta.DAILY_LOGIN_REWARDS[6].coins, 2000)
  assert.equal(Meta.DAILY_LOGIN_REWARDS[6].special, true)
})

check('bank run grants xp and coins without double wallet inflate', () => {
  reset()
  const before = Meta.meta.wallet
  const r = Meta.bankRunRewards({ coins: 40, distance: 200 })
  assert.equal(r.coins, 40)
  assert.ok(r.xp > 0)
  assert.equal(Meta.meta.wallet, before + 40)
  assert.equal(Meta.meta.lifetimeCoins, 40)
})

check('levelFromXp monotonic', () => {
  assert.equal(Meta.levelFromXp(0), 1)
  assert.ok(Meta.levelFromXp(100) >= 2)
  assert.ok(Meta.levelFromXp(1000) >= Meta.levelFromXp(250))
})

check('login status reports canClaim after fresh meta', () => {
  reset()
  const st = Meta.loginRewardStatus(new Date(2030, 5, 1))
  assert.equal(st.canClaim, true)
})

check('character prices include cyber girl', () => {
  assert.equal(Meta.ECONOMY.characterPrices.alex, 0)
  assert.equal(Meta.ECONOMY.characterPrices.cyber, 12000)
  assert.ok(Object.keys(Meta.ECONOMY.boardPrices).length >= 8)
})

check('achievement claim once', () => {
  reset()
  Meta.meta.runs = 5
  const a = Meta.claimAchievement('first_run')
  const b = Meta.claimAchievement('first_run')
  assert.equal(a.ok, true)
  assert.equal(b.reason, 'claimed')
})

console.log(`\n${passed} economy checks passed`)
