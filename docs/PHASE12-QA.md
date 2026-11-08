# Phase 12 — QA checklist

## Automated (run locally)
- [x] `npm run build`
- [x] `npm test` (gameplay + economy)

## Manual — Desktop Chrome / Safari
- [ ] New game → countdown → run
- [ ] Pause (P / Esc) → Resume
- [ ] Near miss → brief slow-mo (disable with Reduced motion)
- [ ] Mystery purple crate → reward toast + wallet/power
- [ ] Daily popup claim once per calendar day
- [ ] Day 7 jackpot = 2000 coins after 7 consecutive claims
- [ ] Shop buy / equip character & board
- [ ] Endless Shield vs Normal high scores separate
- [ ] Arrest cinematic (~5s) + Urdu VO + dog bark → Game Over stats
- [ ] Settings: music / SFX / police / dog / graphics / fullscreen

## Manual — Mobile (iPhone Safari / Android Chrome)
- [ ] Swipe L/R/U/D during run (no page scroll)
- [ ] Safe-area HUD (notch / home indicator)
- [ ] Portrait + landscape: Play still tappable
- [ ] Touch targets on Pause / Restart / Home

## Not verified in this agent session
- Device FPS on mid-range phones
- Fullscreen on iOS (limited)
- Real GLB characters (none present under `public/models/characters/`)

## Before public launch
1. Drop validated character GLBs + licenses
2. Compress textures / optional Draco
3. Add privacy note if analytics ever added
4. Manual pass on target devices from checklist above
