import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { errMsg } from '../api'

function Person({ size, tone, opacity = 1 }) {
  return (
    <svg
      className={`person ${tone}`}
      style={{ opacity }}
      width={size}
      height={Math.round(size * 1.1)}
      viewBox="0 0 64 70"
      aria-hidden="true"
    >
      <circle cx="32" cy="19" r="14" />
      <path d="M5 68c0-18 12-30 27-30s27 12 27 30z" />
    </svg>
  )
}

function Arrow({ dir }) {
  return (
    <svg
      className="arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === 'up' ? <path d="M12 20V5M5 12l7-7 7 7" /> : <path d="M12 4v15M5 12l7 7 7-7" />}
    </svg>
  )
}

export default function Login() {
  const { authenticate } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authenticate(mode, email, password)
    } catch (err) {
      toast(errMsg(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* left: people moving up the queue */}
      <aside className="crowd crowd-left" aria-hidden="true">
        <Person size={52} tone="blue" opacity={0.4} />
        <Arrow dir="up" />
        <Person size={74} tone="blue" opacity={0.7} />
        <Arrow dir="up" />
        <Person size={100} tone="blue" opacity={1} />
      </aside>

      <main className="login-center">
        <form className="card auth-card" onSubmit={submit}>
          <h1 className="brand-lg">QueueFlow</h1>
          <p className="muted">
            {mode === 'login' ? 'Sign in to manage your queues' : 'Create a manager account'}
          </p>
          <label>Email</label>
          <input className="input" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <label>Password</label>
          <input className="input" type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button type="button" className="link-btn"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? "Don't have an account? Register" : 'Already registered? Sign in'}
          </button>
          <button type="button" className="link-btn"
            onClick={() => { setMode('login'); setEmail('demo@example.com'); setPassword('demo1234') }}>
            Use demo account
          </button>
        </form>

        <p className="tagline">
          Keeping the flow in <span className="tag-box">queue</span>!
        </p>
      </main>

      {/* right: people moving down the queue */}
      <aside className="crowd crowd-right" aria-hidden="true">
        <Person size={74} tone="grey" opacity={1} />
        <Arrow dir="down" />
        <Person size={74} tone="grey" opacity={0.7} />
        <Arrow dir="down" />
        <Person size={74} tone="grey" opacity={0.4} />
      </aside>
    </div>
  )
}