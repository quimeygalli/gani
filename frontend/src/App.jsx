import { useState } from 'react'
import ChatSetup from './views/ChatSetup'
import Dashboard from './views/Dashboard'

export default function App() {
  const [view, setView] = useState('setup') // 'setup' | 'dashboard'

  return view === 'setup'
    ? <ChatSetup onSetupComplete={() => setView('dashboard')} />
    : <Dashboard onReset={() => setView('setup')} />
}
