import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Queues from './pages/Queues'
import QueueDetail from './pages/QueueDetail'
import Dashboard from './pages/Dashboard'

function Protected({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token } = useAuth()
  return (
    <>
      {token && <Navbar />}
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<Protected><Queues /></Protected>} />
        <Route path="/queues/:id" element={<Protected><QueueDetail /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/dashboard/:id" element={<Protected><Dashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}