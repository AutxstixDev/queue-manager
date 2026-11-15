import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { errMsg } from '../api'

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
    <div className="auth-wrap">
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
    </div>
  )
}