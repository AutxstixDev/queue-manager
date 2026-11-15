import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api, { errMsg } from '../api'
import { useToast } from '../context/ToastContext'

const Stat = ({ label, value, unit }) => (
  <div className="card stat">
    <div className="muted">{label}</div>
    <div className="stat-value">{value}<span className="stat-unit">{unit}</span></div>
  </div>
)

export default function Dashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [queues, setQueues] = useState(null)
  const [stats, setStats] = useState(null)

  // load my queues; if none selected, jump to the first
  useEffect(() => {
    api.get('/queues')
      .then(({ data }) => {
        setQueues(data)
        if (!id && data.length) navigate(`/dashboard/${data[0]._id}`, { replace: true })
      })
      .catch((e) => toast(errMsg(e), 'error'))
  }, [id, navigate, toast])

  // load analytics for the selected queue, refresh every 10s
  useEffect(() => {
    if (!id) return
    setStats(null)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const load = () =>
      api.get(`/queues/${id}/analytics`, { params: { tz } })
        .then(({ data }) => setStats(data))
        .catch(() => {})
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [id])

  if (queues && queues.length === 0)
    return (
      <div className="container">
        <div className="empty">Create a queue first to see analytics. <Link to="/">Go to queues</Link></div>
      </div>
    )

  const trend = stats?.lengthTrend.map((p) => ({
    length: p.length,
    label: new Date(p.time).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric' }),
  }))
  const hours = stats?.peakHours.map((h) => ({ hour: `${h.hour}:00`, tokens: h.tokens }))
  const s = stats?.summary

  return (
    <div className="container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <select className="input select" value={id || ''} onChange={(e) => navigate(`/dashboard/${e.target.value}`)}>
          {queues?.map((q) => <option key={q._id} value={q._id}>{q.name}</option>)}
        </select>
      </div>

      {!stats && <p className="muted">Loading…</p>}

      {stats && s.total === 0 && (
        <div className="empty">No data yet. Add and serve some tokens to see analytics.</div>
      )}

      {stats && s.total > 0 && (
        <>
          <div className="stats">
            <Stat label="Average wait" value={s.avgWaitMin} unit=" min" />
            <Stat label="Longest wait" value={s.maxWaitMin} unit=" min" />
            <Stat label="Waiting now" value={s.waiting} />
            <Stat label="Served" value={s.served} />
            <Stat label="Cancelled" value={s.cancelled} />
          </div>

          <div className="card chart-card">
            <h3>Queue length over time</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={40} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="stepAfter" dataKey="length" name="People waiting" stroke="#4f46e5"
                  strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-grid">
            <div className="card chart-card">
              <h3>Average wait per day (min)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.dailyWait}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgWaitMin" name="Avg wait (min)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card chart-card">
              <h3>Busiest hours (tokens issued)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="tokens" name="Tokens" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}