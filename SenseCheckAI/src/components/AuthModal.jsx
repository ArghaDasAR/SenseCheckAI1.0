import { useState } from 'react'

/**
 * AuthModal — Sign In / Sign Up glass-morphism modal.
 * Prototype: client-side only, no real authentication.
 */
export default function AuthModal({ onClose }) {
  const [tab,     setTab]     = useState('signin')
  const [done,    setDone]    = useState(false)
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    if (tab === 'signup') {
      if (!name.trim())          return setErr('Please enter your full name.')
      if (!email.includes('@'))  return setErr('Please enter a valid email address.')
      if (pass.length < 6)       return setErr('Password must be at least 6 characters.')
      if (pass !== confirm)      return setErr('Passwords do not match.')
    } else {
      if (!email.includes('@'))  return setErr('Please enter a valid email address.')
      if (!pass)                 return setErr('Please enter your password.')
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1400)) // simulate network
    setLoading(false)
    setDone(true)
  }

  return (
    <div
      className="auth-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={tab === 'signin' ? 'Sign In' : 'Sign Up'}
    >
      <div className="auth-card">
        {/* Close */}
        <button className="auth-close" onClick={onClose} aria-label="Close dialog" type="button">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {done ? (
          /* ── SUCCESS STATE ── */
          <div className="auth-success">
            <div className="auth-success-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="#22c55e" strokeWidth="1.5"/>
                <path d="M8 14l4 4 8-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="auth-title" style={{ marginTop: 16 }}>
              {tab === 'signup' ? `Welcome, ${name.split(' ')[0]}!` : 'Welcome back!'}
            </h2>
            <p className="auth-sub">You're now part of the Sense Check.ai community.</p>
            <button className="btn btn-solid auth-submit" onClick={onClose} type="button">
              Get Started →
            </button>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div className="auth-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
                <g transform="rotate(-30 12 12)">
                  <circle cx="7.3" cy="3.2" r="1.45"/>
                  <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8"/>
                  <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8"/>
                  <circle cx="16.7" cy="20.8" r="1.45"/>
                </g>
              </svg>
              <span style={{ fontWeight: 600, letterSpacing: '-0.03em', fontSize: 15 }}>
                <span>Sense Check<span style={{ fontWeight: 400 }}>.ai</span></span>
              </span>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <button
                className={`auth-tab${tab === 'signin' ? ' active' : ''}`}
                onClick={() => { setTab('signin'); setErr('') }}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
                onClick={() => { setTab('signup'); setErr('') }}
                type="button"
              >
                Sign Up
              </button>
            </div>

            <h2 className="auth-title">
              {tab === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="auth-sub">
              {tab === 'signin'
                ? 'Sign in to save your analysis history and access premium features.'
                : 'Join Sense Check.ai to protect yourself and your community from scams.'}
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              {tab === 'signup' && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-name">Full Name</label>
                  <input
                    id="auth-name"
                    className="auth-input"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              )}
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-pass">Password</label>
                <input
                  id="auth-pass"
                  className="auth-input"
                  type="password"
                  placeholder={tab === 'signup' ? 'At least 6 characters' : 'Your password'}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
              </div>
              {tab === 'signup' && (
                <div className="auth-field">
                  <label className="auth-label" htmlFor="auth-confirm">Confirm Password</label>
                  <input
                    id="auth-confirm"
                    className="auth-input"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              {err && <p className="auth-error">{err}</p>}

              <button
                className="btn btn-solid auth-submit"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Please wait…'
                  : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch">
              {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                className="auth-switch-btn"
                onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setErr('') }}
                type="button"
              >
                {tab === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
