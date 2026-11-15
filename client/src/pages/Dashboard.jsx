import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api, { errMsg } from '../api'
import { useToast } from '../context/ToastContext'

// chart palette (matches the blue/grey theme in index.css)
const BLUE = '#2563eb'
const SLATE = '#94a3b8'
const GRID = '#e2e8f0'
const barCursor = { fill: 'rgba(37, 99, 235, 0.06)' }

const fmtDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })

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

  const s = stats?.summary

  // chart data
  const trend = stats?.lengthTrend.map((p) => ({
    length: p.length,
    label: new Date(p.time).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric' }),
  }))
  const daily = stats?.dailyWait.map((d) => ({ day: fmtDay(d.date), avgWaitMin: d.avgWaitMin }))
  const hours = stats?.peakHours.map((h) => ({ hour: `${h.hour}:00`, tokens: h.tokens }))

  // insights
  const peak = stats
    ? stats.peakHours.reduce((a, b) => (b.tokens > a.tokens ? b : a), stats.peakHours[0])
    : null
  const finished = s ? s.served + s.cancelled : 0
  const cancelRate = finished ? Math.round((s.cancelled / finished) * 100) : 0
  const outcome = s
    ? [
        { name: 'Served', value: s.served, color: BLUE },
        { name: 'Cancelled', value: s.cancelled, color: SLATE },
      ]
    : []

  return (
    <div className="container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          <span className="live-pill">Live · updates every 10s</span>
          <select className="input select" value={id || ''}
            onChange={(e) => navigate(`/dashboard/${e.target.value}`)}>
            {queues?.map((q) => <option key={q._id} value={q._id}>{q.name}</option>)}
          </select>
        </div>
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
            <p className="chart-sub">How many people were waiting after each add, serve or cancel</p>
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="lengthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BLUE} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={40} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="stepAfter" dataKey="length" name="People waiting"
                  stroke={BLUE} strokeWidth={2} fill="url(#lengthFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-grid">
            <div className="card chart-card">
              <h3>Average wait per day</h3>
              <p className="chart-sub">Minutes from joining the queue to being served</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip cursor={barCursor} />
                  <Bar dataKey="avgWaitMin" name="Avg wait (min)" fill={BLUE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card chart-card">
              <h3>Busiest hours</h3>
              <p className="chart-sub">Tokens issued by hour of day (peak in blue)</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hours}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={barCursor} />
                  <Bar dataKey="tokens" name="Tokens" radius={[6, 6, 0, 0]}>
                    {hours.map((h, i) => (
                      <Cell key={i} fill={h.tokens > 0 && h.tokens === peak.tokens ? BLUE : SLATE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-grid">
            <div className="card chart-card">
              <h3>Served vs cancelled</h3>
              <p className="chart-sub">Outcome of every token that has left the queue</p>
              {finished === 0 ? (
                <div className="empty plain">No finished tokens yet.</div>
              ) : (
                <div className="donut-row">
                  <PieChart width={170} height={170}>
                    <Pie data={outcome} dataKey="value" nameKey="name" innerRadius={52}
                      outerRadius={80} paddingAngle={3} stroke="none">
                      {outcome.map((o) => <Cell key={o.name} fill={o.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                  <div className="legend">
                    {outcome.map((o) => (
                      <div key={o.name} className="legend-item">
                        <span className="dot" style={{ background: o.color }} />
                        {o.name} <strong>{o.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="card chart-card">
              <h3>Quick insights</h3>
              <p className="chart-sub">Worked out from this queue's history</p>
              <div className="insights">
                <div className="insight">
                  <span>Busiest hour</span>
                  <strong>{peak.tokens ? `${String(peak.hour).padStart(2, '0')}:00` : '—'}</strong>
                </div>
                <div className="insight">
                  <span>Tokens in that hour</span>
                  <strong>{peak.tokens}</strong>
                </div>
                <div className="insight">
                  <span>Cancellation rate</span>
                  <strong>{cancelRate}%</strong>
                </div>
                <div className="insight">
                  <span>Tokens issued, all time</span>
                  <strong>{s.total}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}