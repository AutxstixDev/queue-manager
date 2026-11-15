import { createContext, useContext, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [email, setEmail] = useState(localStorage.getItem('email'))

  // mode is 'login' or 'register'
  const authenticate = async (mode, email, password) => {
    const { data } = await api.post(`/auth/${mode}`, { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('email', data.email)
    setToken(data.token)
    setEmail(data.email)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    setToken(null)
    setEmail(null)
  }

  return (
    <AuthContext.Provider value={{ token, email, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  )
}