import { useState, useEffect } from 'react'
import { getCalibration } from './voiceCalibration'
import './styles.css'

function TrainPage() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [trainKey, setTrainKey] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [authError, setAuthError] = useState('')

  const [examples, setExamples] = useState([])
  const [examplePrompt, setExamplePrompt] = useState('')
  const [exampleContext, setExampleContext] = useState('')
  const [exampleReply, setExampleReply] = useState('')

  const tryKey = async (key) => {
    try {
      const res = await fetch('/api/examples', {
        headers: { 'X-Train-Key': key },
      })
      if (res.ok) {
        const data = await res.json()
        setExamples(data.examples || [])
        setAuthed(true)
        setTrainKey(key)
        localStorage.setItem('train-key', key)
        setAuthError('')
      } else {
        localStorage.removeItem('train-key')
        setAuthed(false)
        if (key) setAuthError('Wrong key.')
      }
    } catch (e) {
      setAuthError('Could not reach the server.')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('train-key')
    if (saved) {
      tryKey(saved)
    } else {
      setChecking(false)
    }
  }, [])

  const handleLogin = () => {
    if (!keyInput.trim()) return
    tryKey(keyInput.trim())
  }

  const addExample = async () => {
    const reply = exampleReply.trim()
    if (!reply) return
    try {
      const res = await fetch('/api/examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Train-Key': trainKey },
        body: JSON.stringify({
          prompt: examplePrompt.trim(),
          context: exampleContext.trim(),
          reply,
        }),
      })
      const data = await res.json()
      setExamples(data.examples || [])
      setExamplePrompt('')
      setExampleContext('')
      setExampleReply('')
    } catch (e) {
      console.error('Add example failed', e)
    }
  }

  const removeExample = async (index) => {
    try {
      const res = await fetch(`/api/examples/${index}`, {
        method: 'DELETE',
        headers: { 'X-Train-Key': trainKey },
      })
      const data = await res.json()
      setExamples(data.examples || [])
    } catch (e) {
      console.error('Remove example failed', e)
    }
  }

  const calibration = getCalibration(examples.length)

  if (checking) {
    return (
      <div className="app">
        <p className="hint">Checking access…</p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="app">
        <header>
          <div className="brand">
            <span className="mark">HB</span>
            <h1>Hinge Bot — Train</h1>
          </div>
          <p className="tagline">This page is just for you.</p>
        </header>
        <section className="panel gate">
          <h2>Enter your key</h2>
          <input
            type="password"
            placeholder="train key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {authError && <p className="error-banner">{authError}</p>}
          <button className="primary" onClick={handleLogin}>
            Unlock
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="mark">HB</span>
          <h1>Hinge Bot — Train</h1>
        </div>
        <p className="tagline">
          Add exchanges here. The public page only ever sees the count, never the text.
        </p>
      </header>

      <div className="hero">
        <div className="hero-top">
          <span className="eyebrow">Hinge Bot</span>
          <span className="calib-count">
            {calibration.count} example{calibration.count === 1 ? '' : 's'}
          </span>
        </div>
        <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="waveform">
          <path
            d={calibration.path}
            fill="none"
            stroke={calibration.color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <p className="calib-label">{calibration.label}</p>
      </div>

      <main className="single-col">
        <section className="panel">
          <h2>Your voice</h2>
          <p className="hint">
            Add real exchanges: what she said, any context, and how you actually replied.
          </p>
          <div>
            <label htmlFor="examplePrompt">What she said (optional)</label>
            <textarea
              id="examplePrompt"
              rows={2}
              placeholder="e.g. omg I can't believe you actually did that lol"
              value={examplePrompt}
              onChange={(e) => setExamplePrompt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="exampleContext">Context (optional)</label>
            <input
              type="text"
              id="exampleContext"
              placeholder="e.g. this was during an argument / we'd been talking for weeks"
              value={exampleContext}
              onChange={(e) => setExampleContext(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="exampleReply">What you replied</label>
            <textarea
              id="exampleReply"
              rows={2}
              placeholder="e.g. i mean... someone had to"
              value={exampleReply}
              onChange={(e) => setExampleReply(e.target.value)}
            />
          </div>
          <button className="add-btn" onClick={addExample}>
            Add to your voice
          </button>
          <div className="examples-list">
            {examples.length === 0 ? (
              <p className="empty-state">No examples yet.</p>
            ) : (
              examples.map((ex, i) => (
                <div className="example-item" key={i}>
                  <div className="example-text">
                    {ex.prompt && (
                      <div className="example-line her">
                        <span className="example-tag">Her</span>
                        <span className="line-text">{ex.prompt}</span>
                      </div>
                    )}
                    {ex.context && (
                      <div className="example-line ctx">
                        <span className="example-tag">Context</span>
                        <span className="line-text">{ex.context}</span>
                      </div>
                    )}
                    <div className="example-line you">
                      <span className="example-tag">You</span>
                      <span className="line-text">{ex.reply}</span>
                    </div>
                  </div>
                  <button aria-label="Remove example" onClick={() => removeExample(i)}>
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default TrainPage