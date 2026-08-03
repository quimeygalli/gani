import { useEffect, useRef } from 'react'
import { useAuth } from '../auth'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function Login() {
  const { login } = useAuth()
  const btnRef = useRef(null)

  useEffect(() => {
    function initGoogle() {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
      })
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
      })
    }

    if (window.google?.accounts) {
      initGoogle()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = initGoogle
      document.head.appendChild(script)
    }
  }, [])

  async function handleCredential(response) {
    const res = await fetch('/api/auth/google/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: response.credential }),
    })
    if (!res.ok) return
    const data = await res.json()
    login(data.token, data.user)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 p-4">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center text-white text-2xl font-bold mx-auto">
          G
        </div>
        <h1 className="text-white text-2xl font-bold">Gani</h1>
        <p className="text-gray-400 text-sm">Your AI-powered daily planner</p>
      </div>
      <div ref={btnRef} />
    </div>
  )
}
