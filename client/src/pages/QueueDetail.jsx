import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useToast } from '../context/ToastContext'

const fmt = (n) => `T-${String(n).padStart(3, '0')}`
const minsAgo = (d) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000))

export default function QueueDetail() {
  const { id } = useParams()
  const toast = useToast()
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
    if (ok) setName('')
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
      <div className="container">
        <div className="empty">Queue not found. <Link to="/">Back to queues</Link></div>
      </div>
    )
  if (!data) return <div className="container"><p className="muted">Loading…</p></div>

  const { queue, waiting, serving } = data

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <Link to="/" className="muted">← All queues</Link>
          <h1>{queue.name}</h1>
        </div>
        <Link className="btn btn-ghost" to={`/dashboard/${id}`}>View analytics</Link>
      </div>

      <div className="serving-banner">
        <div>
          <div className="label">Now serving</div>
          {serving ? (
            <div className="serving-main">
              <span className="serving-number">{fmt(serving.tokenNumber)}</span>
              <span className="serving-name">{serving.personName}</span>
            </div>
          ) : (
            <div className="serving-name">Nobody yet</div>
          )}
        </div>
        <button className="btn btn-light" onClick={serveNext} disabled={busy || waiting.length === 0}>
          Serve next
        </button>
      </div>

      <form className="card form-row" onSubmit={add}>
        <input className="input" placeholder="Person's name" value={name}
          onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="btn btn-primary" disabled={busy || !name.trim()}>Add to queue</button>
      </form>

      <div className="card list-card">
        <div className="list-title">
          Waiting <span className="badge">{waiting.length}</span>
        </div>
        {waiting.length === 0 && <div className="empty plain">No one is waiting.</div>}
        {waiting.map((t, i) => (
          <div key={t._id} className="token-row">
            <span className="token-pos">{i + 1}</span>
            <span className="token-badge">{fmt(t.tokenNumber)}</span>
            <span className="token-name">{t.personName}</span>
            <span className="token-meta">waiting {minsAgo(t.createdAt)} min</span>
            <div className="actions">
              <button className="icon-btn" title="Move up" disabled={busy || i === 0}
                onClick={() => move(t, 'up')}>▲</button>
              <button className="icon-btn" title="Move down" disabled={busy || i === waiting.length - 1}
                onClick={() => move(t, 'down')}>▼</button>
              <button className="icon-btn danger" title="Cancel token" disabled={busy}
                onClick={() => cancel(t)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}