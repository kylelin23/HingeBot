import { useState, useEffect } from 'react'
import { getCalibration } from './voiceCalibration'
import './styles.css'

function ReplyPage() {
  const [voiceCount, setVoiceCount] = useState(0)
  const [herMessage, setHerMessage] = useState('')
  const [contextNote, setContextNote] = useState('')
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIndex, setCopiedIndex] = useState(null)

  useEffect(() => {
    fetch('/api/voice-status')
      .then((r) => r.json())
      .then((d) => setVoiceCount(d.count || 0))
      .catch(() => {})
  }, [])

  const calibration = getCalibration(voiceCount)

  const generateReplies = async () => {
    setError('')
    if (!herMessage.trim()) {
      setError('Paste what she sent first.')
      return
    }
    setLoading(true)
    setReplies([])
    try {
      const response = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          herMessage: herMessage.trim(),
          context: contextNote.trim(),
          vibe: 'flirtier',
        }),
      })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      const data = await response.json()
      const text = (data.content || []).map((b) => b.text || '').join('\n').trim()
      const clean = text.replace(/```json|```/g, '').trim()
      let parsed
      try {
        parsed = JSON.parse(clean)
      } catch (e) {
        parsed = { replies: [clean] }
      }
      let result = Array.isArray(parsed.replies) ? parsed.replies.filter(Boolean) : [clean]
      if (result.length === 0) result = [clean]
      setReplies(result)
    } catch (err) {
      console.error('Generate failed', err)
      setError("Couldn't reach the server — try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  const copyReply = (text, index) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 1200)
      })
      .catch(() => {})
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="mark">HB</span>
          <h1>Hinge Bot</h1>
        </div>
        <p className="tagline">Get replies in my voice (trained by my previous messages)</p>
      </header>

      <main className="single-col">
        <section className="panel">
          <h2>Her message</h2>
          <p className="hint">Paste what she sent here.</p>
          <div>
            <label htmlFor="herMessage">Her message</label>
            <textarea
              id="herMessage"
              rows={4}
              placeholder="paste what she sent here"
              value={herMessage}
              onChange={(e) => setHerMessage(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="contextNote">Context (optional)</label>
            <input
              type="text"
              id="contextNote"
              placeholder="e.g. we matched yesterday, this is the first message"
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
            />
          </div>
          {error && <p className="error-banner">{error}</p>}
          <button className="primary" onClick={generateReplies} disabled={loading}>
            {loading ? 'Drafting…' : 'Draft replies'}
          </button>
        </section>
      </main>

      {replies.length > 0 && (
        <section className="output">
          <h2>Drafted replies</h2>
          <div>
            {replies.map((text, i) => (
              <div className="reply-card" key={i}>
                <p>{text}</p>
                <button onClick={() => copyReply(text, i)}>
                  {copiedIndex === i ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
          <button className="secondary" onClick={generateReplies} disabled={loading}>
            Try again
          </button>
        </section>
      )}
    </div>
  )
}

export default ReplyPage