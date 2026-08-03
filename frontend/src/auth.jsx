import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('gani_token'))

  useEffect(() => {
    if (!token) { setUser(null); return }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp * 1000 < Date.now()) {
        logout()
      } else {
        setUser({ id: payload.sub, email: payload.email, name: payload.name })
      }
    } catch {
      logout()
    }
  }, [token])

  const login = useCallback((newToken, userInfo) => {
    localStorage.setItem('gani_token', newToken)
    setToken(newToken)
    setUser(userInfo)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('gani_token')
    setToken(null)
    setUser(null)
  }, [])

  // Authenticated fetch — attaches Bearer token automatically
  const apiFetch = useCallback((url, opts = {}) => {
    return fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
