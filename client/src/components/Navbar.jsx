import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { email, logout } = useAuth()
  return (
    <header className="navbar">
      <div className="nav-inner">
        <span className="brand">QueueFlow</span>
        <nav>
          <NavLink to="/" end>Queues</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </nav>
        <div className="nav-right">
          <span className="muted hide-sm">{email}</span>
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        </div>
      </div>
    </header>
  )
}