import { useEffect, useState } from 'react'
import {
  AUDIO_ASSET_VERSION,
  clearAudioCache,
  getAudioStatus,
  playArrestFinale,
  playDogBark,
  playPoliceVoice,
  preloadAudio,
  unlockDialogue,
} from '../game/dialogue'
import { getAudioContextState, unlockAudio } from '../game/audio'

/**
 * Audio tools panel — only shown when opened from the main menu Audio screen.
 */
export function AudioMenuPanel({ embedded = false }) {
  const [status, setStatus] = useState(() => getAudioStatus())
  const [flash, setFlash] = useState('')

  useEffect(() => {
    void preloadAudio({ bust: false }).then(() => setStatus(getAudioStatus()))
    const id = setInterval(() => setStatus(getAudioStatus()), 800)
    return () => clearInterval(id)
  }, [])

  const refresh = () => setStatus(getAudioStatus())

  const note = (msg) => {
    setFlash(msg)
    refresh()
    window.setTimeout(() => setFlash(''), 2500)
  }

  return (
    <div className={`audio-menu-panel ${embedded ? 'embedded' : ''}`} aria-label="Audio panel">
      <div className="audio-dev-body">
        <button
          type="button"
          onClick={async () => {
            clearAudioCache()
            unlockAudio()
            await unlockDialogue()
            await preloadAudio({ bust: true })
            note(`Cache cleared · ${AUDIO_ASSET_VERSION}`)
          }}
        >
          Clear Cache + Unlock
        </button>
        <button
          type="button"
          onClick={async () => {
            await unlockDialogue()
            const ok = playPoliceVoice('start', { force: true })
            note(ok ? 'Playing start VO' : 'start VO failed')
          }}
        >
          Test Start VO
        </button>
        <button
          type="button"
          onClick={async () => {
            await unlockDialogue()
            const ok = playPoliceVoice('chase', { force: true })
            note(ok ? 'Playing chase VO' : 'chase VO failed')
          }}
        >
          Test Police Voice
        </button>
        <button
          type="button"
          onClick={async () => {
            await unlockDialogue()
            const ok = playDogBark('short')
            note(ok ? 'Playing bark' : 'Dog bark failed')
          }}
        >
          Test Dog Bark
        </button>
        <button
          type="button"
          onClick={async () => {
            await unlockDialogue()
            const ok = playArrestFinale()
            note(ok ? 'Arrest VO → bark' : 'Arrest finale failed')
          }}
        >
          Test Arrest Dialogue
        </button>
        <button
          type="button"
          onClick={async () => {
            await unlockDialogue()
            const ok = playPoliceVoice('magnet', { force: true })
            note(ok ? 'Playing magnet VO' : 'Magnet VO failed')
          }}
        >
          Test Magnet VO
        </button>
        <button
          type="button"
          onClick={async () => {
            await unlockDialogue()
            const ok = playPoliceVoice('trainJump', { force: true })
            note(ok ? 'Playing train VO' : 'Train VO failed')
          }}
        >
          Test Train VO
        </button>
        <button type="button" onClick={refresh}>
          Show Audio Status
        </button>
        {flash && <div className="audio-dev-flash">{flash}</div>}
        <pre className="audio-dev-status">
          {`Asset ver: ${AUDIO_ASSET_VERSION}
AudioContext: ${status.contextState || getAudioContextState()}
Unlocked: ${status.unlocked ? 'yes' : 'no'}
Current: ${status.currentFilename || '(none)'}
Speaking: ${status.speaking ? 'yes' : 'no'}
Load errors:
${(status.loadErrors || []).length ? status.loadErrors.join('\n') : '  (none)'}
Playback errors:
${(status.playbackErrors || []).length ? status.playbackErrors.join('\n') : '  (none)'}`}
        </pre>
      </div>
    </div>
  )
}

/** @deprecated floating HUD panel removed — use menu Audio screen */
export function AudioDevPanel() {
  return null
}
