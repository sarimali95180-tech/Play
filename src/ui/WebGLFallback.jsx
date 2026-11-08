export function WebGLFallback({ error }) {
  return (
    <div className="webgl-fallback">
      <div className="webgl-card">
        <p className="eyebrow">Graphics needed</p>
        <h1>WebGL is off</h1>
        <p className="lede">
          NEON RUSH 3D needs WebGL. Your browser blocked GPU graphics, so the game cannot draw.
        </p>
        {error && <p className="webgl-error">{String(error.message || error)}</p>}
        <ol>
          <li>
            In Chrome open <code>chrome://settings/system</code>
          </li>
          <li>
            Enable <strong>Use graphics acceleration when available</strong>
          </li>
          <li>Quit Chrome completely (Cmd+Q), then reopen</li>
          <li>
            Open <code>http://127.0.0.1:5173/</code> and press <strong>Cmd+Shift+R</strong>
          </li>
        </ol>
        <p className="lede">
          Faster check: open the same URL in <strong>Safari</strong>. If Safari works, Chrome GPU is the problem.
        </p>
        <p className="lede">
          Also open <code>chrome://gpu</code> and look for WebGL. If it says Disabled, turn hardware acceleration on.
        </p>
      </div>
    </div>
  )
}
