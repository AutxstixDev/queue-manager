import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errMsg } from '../api'
import { useToast } from '../context/ToastContext'

export default function Queues() {
  const toast = useToast()
  const [queues, setQueues] = useState(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/queues')
      setQueues(data)
    } catch (e) {
      toast(errMsg(e), 'error')
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      await api.post('/queues', { name: name.trim() })
      toast(`Queue "${name.trim()}" created`)
      setName('')
      await load()
    } catch (err) {
      toast(errMsg(err), 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Your queues</h1>
      </div>

      <form className="card form-row" onSubmit={create}>
        <input className="input" placeholder="New queue name (e.g. Front Desk)"
          value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="btn btn-primary" disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : 'Create queue'}
        </button>
      </form>

      {queues === null && <p className="muted">Loading…</p>}
      {queues && queues.length === 0 && (
        <div className="empty">No queues yet. Create your first one above.</div>
      )}

      <div className="grid">
        {queues?.map((q) => (
          <div key={q._id} className="card queue-card">
            <h3>{q.name}</h3>
            <div className="queue-count">
              <span className="big">{q.waiting}</span>
              <span className="muted">waiting</span>
            </div>
            <div className="actions">
              <Link className="btn btn-primary" to={`/queues/${q._id}`}>Manage</Link>
              <Link className="btn btn-ghost" to={`/dashboard/${q._id}`}>Analytics</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}