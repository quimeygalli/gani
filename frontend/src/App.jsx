import { useState } from 'react'
import { AuthProvider, useAuth } from './auth'
import Login from './views/Login'
import ChatSetup from './views/ChatSetup'
import Dashboard from './views/Dashboard'

function AppInner() {
  const { user } = useAuth()
  const [view, setView] = useState('setup')

  if (!user) return <Login />

  return view === 'setup'
    ? <ChatSetup onSetupComplete={() => setView('dashboard')} />
    : <Dashboard onReset={() => setView('setup')} />
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
