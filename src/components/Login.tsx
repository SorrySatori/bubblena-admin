import { useState } from 'react'
import type { FormEvent } from 'react'
import './Login.css'

interface LoginProps {
  onLoginSuccess: () => void
}

function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simple credential validation
    const validUsername = 'kapybara'
    const validPassword = 'TajnyHeslo666'

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (username === validUsername && password === validPassword) {
        // Store credentials in localStorage (base64 encoded for basic obfuscation)
        const credentials = btoa(`${username}:${password}`)
        localStorage.setItem('adminAuth', credentials)
        onLoginSuccess()
      } else {
        setError('Nesprávné přihlašovací údaje')
      }
      setLoading(false)
    }, 500)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🛍️ Bubblena Admin</h1>
          <p>Přihlaste se pro správu objednávek</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Uživatelské jméno</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Zadejte uživatelské jméno"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Heslo</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Zadejte heslo"
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Přihlašování...' : 'Přihlásit se'}
          </button>
        </form>

        <div className="login-footer">
          <p className="hint">Default: kapybara / TajnyHeslo666</p>
        </div>
      </div>
    </div>
  )
}

export default Login
