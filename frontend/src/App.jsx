import { AuthProvider, useAuth } from './auth'
import Login from './views/Login'
import Dashboard from './views/Dashboard'

function AppInner() {
  const { user } = useAuth()
  if (!user) return <Login />
  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
