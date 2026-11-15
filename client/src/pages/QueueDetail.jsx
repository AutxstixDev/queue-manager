import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useToast } from '../context/ToastContext'
import './QueueDetail.css'

const fmt = (n) => `T-${String(n).padStart(3, '0')}`
const minsSince = (d) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000))
const LONG_WAIT_MIN = 15

export default function QueueDetail() {
  const { id } = useParams()
  const toast = useToast()
  const inputRef = useRef(null)
  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/queues/${id}/tokens`)
      setData(res.data)
    } catch (e) {
      if (e.response?.status === 404 || e.response?.status === 400) setNotFound(true)
    }
  }, [id])

  // load once, then refresh every 5s
  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [load])

  // runs an API call, shows a toast, refreshes the list
  const run = async (fn, msg) => {
    setBusy(true)
    try {
      const res = await fn()
      if (msg) toast(typeof msg === 'function' ? msg(res.data) : msg)
      await load()
      return true
    } catch (e) {
      toast(errMsg(e), 'error')
      await load()
      return false
    } finally {
      setBusy(false)
    }
  }

  const add = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const ok = await run(
      () => api.post(`/queues/${id}/tokens`, { personName: name.trim() }),
      (t) => `Token ${fmt(t.tokenNumber)} created for ${t.personName}`
    )
    if (ok) {
      setName('')
      inputRef.current?.focus()
    }
  }

  const move = (t, direction) => run(() => api.patch(`/tokens/${t._id}/move`, { direction }))

  const cancel = (t) => {
    if (!window.confirm(`Cancel ${fmt(t.tokenNumber)} (${t.personName})?`)) return
    run(() => api.patch(`/tokens/${t._id}/cancel`), `${fmt(t.tokenNumber)} cancelled`)
  }

  const serveNext = () =>
    run(
      () => api.post(`/queues/${id}/serve-next`),
      (t) => `Now serving ${fmt(t.tokenNumber)} · ${t.personName}`
    )

  if (notFound)
    return (
      <div className="qd">
        <div className="qd-wrap">
          <div className="qd-empty">Queue not found. <Link to="/">Back to queues</Link></div>
        </div>
      </div>
    )

  if (!data)
    return (
      <div className="qd">
        <div className="qd-wrap"><p className="qd-muted">Loading…</p></div>
      </div>
    )

  const { queue, waiting, serving } = data
  const servingMins = serving?.servedAt ? minsSince(serving.servedAt) : null

  return (
    <div className="qd">
      <div className="qd-wrap">
        <header className="qd-head">
          <div>
            <Link to="/" className="qd-back">← All queues</Link>
            <h1 className="qd-title">{queue.name}</h1>
            <div className="qd-chips">
              <span className="qd-chip">{waiting.length} waiting</span>
              <span className="qd-chip qd-chip-muted">{serving ? 'Serving now' : 'Idle'}</span>
            </div>
          </div>
          <Link className="qd-btn qd-btn-ghost" to={`/dashboard/${id}`}>View analytics</Link>
        </header>

        <div className="qd-grid">
          <aside className="qd-side">
            <section className="qd-hero">
              <div className="qd-hero-label">Now serving</div>
              {serving ? (
                <>
                  <div className="qd-hero-number">{fmt(serving.tokenNumber)}</div>
                  <div className="qd-hero-name">{serving.personName}</div>
                  {servingMins !== null && (
                    <div className="qd-hero-meta">
                      {servingMins < 1 ? 'Just started' : `Serving for ${servingMins} min`}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="qd-hero-number qd-hero-idle">—</div>
                  <div className="qd-hero-name">Nobody being served</div>
                </>
              )}
              <button className="qd-btn qd-btn-light qd-btn-block" onClick={serveNext}
                disabled={busy || waiting.length === 0}>
                Serve next
              </button>
              <div className="qd-hero-next">
                {waiting[0]
                  ? <>Up next: <strong>{fmt(waiting[0].tokenNumber)} · {waiting[0].personName}</strong></>
                  : 'The queue is empty'}
              </div>
            </section>

            <form className="qd-panel" onSubmit={add}>
              <label className="qd-label" htmlFor="qd-name">Add a person</label>
              <input id="qd-name" ref={inputRef} className="qd-input" placeholder="Person's name"
                value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              <button className="qd-btn qd-btn-primary qd-btn-block" disabled={busy || !name.trim()}>
                Add to queue
              </button>
              <p className="qd-hint">A token number is created automatically.</p>
            </form>
          </aside>

          <section className="qd-list">
            <div className="qd-list-head">
              Waiting <span className="qd-count">{waiting.length}</span>
            </div>

            {waiting.length === 0 ? (
              <div className="qd-empty">
                <svg width="56" height="61" viewBox="0 0 64 70" aria-hidden="true">
                  <circle cx="32" cy="19" r="14" />
                  <path d="M5 68c0-18 12-30 27-30s27 12 27 30z" />
                </svg>
                No one is waiting. Add someone to get started.
              </div>
            ) : (
              waiting.map((t, i) => {
                const waited = minsSince(t.createdAt)
                return (
                  <div key={t._id} className={`qd-row${i === 0 ? ' qd-row-next' : ''}`}>
                    <span className="qd-pos">{i + 1}</span>
                    <span className="qd-avatar">{t.personName.charAt(0).toUpperCase()}</span>
                    <div className="qd-who">
                      <div className="qd-name">
                        {t.personName}
                        {i === 0 && <span className="qd-next-tag">Next up</span>}
                      </div>
                      <div className="qd-sub">
                        <span className="qd-token">{fmt(t.tokenNumber)}</span>
                        {' · '}
                        <span className={waited >= LONG_WAIT_MIN ? 'qd-wait-long' : ''}>
                          {waited < 1 ? 'just joined' : `waiting ${waited} min`}
                        </span>
                      </div>
                    </div>
                    <div className="qd-actions">
                      <button className="qd-icon" title="Move up" aria-label="Move up"
                        disabled={busy || i === 0} onClick={() => move(t, 'up')}>▲</button>
                      <button className="qd-icon" title="Move down" aria-label="Move down"
                        disabled={busy || i === waiting.length - 1} onClick={() => move(t, 'down')}>▼</button>
                      <button className="qd-icon qd-icon-danger" title="Cancel token" aria-label="Cancel token"
                        disabled={busy} onClick={() => cancel(t)}>✕</button>
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </div>
      </div>
    </div>
  )
}