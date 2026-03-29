import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode]       = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'reset') {
      const { error } = await resetPassword(email)
      setLoading(false)
      if (error) return setError(error.message)
      setMessage('Check your email for a password reset link.')
      return
    }

    if (mode === 'signup' && password !== confirm) {
      setLoading(false)
      return setError('Passwords do not match.')
    }

    if (mode === 'signup' && password.length < 6) {
      setLoading(false)
      return setError('Password must be at least 6 characters.')
    }

    const fn = mode === 'signup' ? signUp : signIn
    const { error } = await fn(email, password)
    setLoading(false)
    if (error) return setError(error.message)
    if (mode === 'signup') {
      setMessage('Account created! Check your email to confirm, then sign in.')
      setMode('login')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0F0A05 0%, #1C1008 50%, #0F0A05 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'Barlow', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 12, filter: 'drop-shadow(0 0 20px rgba(255,140,0,0.5))' }}>🏆</div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 42,
            letterSpacing: 3,
            background: 'linear-gradient(135deg, #FF8C00, #FFD700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            lineHeight: 1,
          }}>Competition Pro</h1>
          <p style={{ color: '#8B7355', fontSize: 14, marginTop: 6, letterSpacing: 1 }}>
            BBQ COMMAND CENTER
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(145deg, #1C1008, #2A1A0A)',
          border: '1px solid #3D2410',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,140,0,0.05)',
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22,
            color: '#F5E6D0',
            letterSpacing: 2,
            marginBottom: 24,
          }}>
            {mode === 'login' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </div>

          {error && (
            <div style={{
              background: 'rgba(229,57,53,0.1)',
              border: '1px solid rgba(229,57,53,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#EF9A9A',
              fontSize: 13,
              marginBottom: 16,
            }}>{error}</div>
          )}

          {message && (
            <div style={{
              background: 'rgba(76,175,80,0.1)',
              border: '1px solid rgba(76,175,80,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#A5D6A7',
              fontSize: 13,
              marginBottom: 16,
            }}>{message}</div>
          )}

          <form onSubmit={handle}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#8B7355', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'reset' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#8B7355', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === 'signup' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#8B7355', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={inputStyle}
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: loading ? '#3D2410' : 'linear-gradient(135deg, #FF4D00, #FF8C00)',
                border: 'none',
                borderRadius: 10,
                color: loading ? '#8B7355' : '#fff',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 18,
                letterSpacing: 2,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Please wait...' : (
                mode === 'login' ? 'Sign In' :
                mode === 'signup' ? 'Create Account' :
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* Mode switchers */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} style={linkStyle}>
                  Don't have an account? Sign up
                </button>
                <button onClick={() => { setMode('reset'); setError(''); setMessage(''); }} style={{ ...linkStyle, color: '#5A4A3A', fontSize: 12 }}>
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} style={linkStyle}>
                Already have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} style={linkStyle}>
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#3D2410', fontSize: 11, marginTop: 24 }}>
          Your data is private and only accessible to you.
        </p>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  background: 'rgba(0,0,0,0.4)',
  border: '1px solid #3D2410',
  borderRadius: 8,
  color: '#F5E6D0',
  fontSize: 14,
  fontFamily: "'Barlow', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const linkStyle = {
  background: 'none',
  border: 'none',
  color: '#FF8C00',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: "'Barlow', sans-serif",
  textDecoration: 'underline',
  padding: 0,
}
