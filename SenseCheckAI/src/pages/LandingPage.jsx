import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAppearAnimation } from '../hooks/useAppearAnimation'
import Navbar from '../components/Navbar'
import AuthModal from '../components/AuthModal'

/** ─── Feature cards data ───────────────────────────────────────────────── */
const FEATURES = [
  { icon: '📸', title: 'Screenshots',       desc: 'Screenshots of suspicious messages, chats, or notifications on any platform.' },
  { icon: '💬', title: 'SMS & Text',         desc: 'Paste suspicious text messages directly — no screenshot needed.' },
  { icon: '✉️', title: 'Emails',             desc: 'Phishing emails, spoofed sender addresses, and malicious email bodies.' },
  { icon: '🔗', title: 'Links & URLs',       desc: 'Lookalike domains, shortened URLs, and suspicious payment gateway links.' },
  { icon: '📱', title: 'WhatsApp Forwards',  desc: 'Viral forwards claiming prizes, government schemes, or emergency alerts.' },
  { icon: '📷', title: 'QR Codes',           desc: 'QR codes that redirect to phishing sites or trigger payments.' },
  { icon: '💳', title: 'Payment Pages',      desc: 'Fake UPI screens, payment confirmations, and KYC update requests.' },
  { icon: '🪪', title: 'KYC Documents',      desc: 'Suspicious requests for Aadhaar, PAN, or other identity document details.' },
]

/** ─── How it works steps ───────────────────────────────────────────────── */
const HIW = [
  {
    step: '01',
    icon: '📥',
    title: 'Submit Evidence',
    desc: 'Upload a screenshot, paste suspicious text, or enter a URL or link. Sense Check.ai accepts any format of suspicious digital content.',
  },
  {
    step: '02',
    icon: '🔍',
    title: 'AI Analyses It',
    desc: 'The AI extracts text via OCR, detects visual patterns, identifies threat indicators, and evaluates known scam signatures.',
  },
  {
    step: '03',
    icon: '🛡️',
    title: 'You Get Clarity',
    desc: 'Receive a clear verdict — Verified, Risky, or Highly Dangerous — with a full explanation of each finding and what to do next.',
  },
]

/** ─── Pipeline display in About ────────────────────────────────────────── */
const PIPELINE = [
  { label: 'Image / Text / Link Ingestion', color: '#6b7fff' },
  { label: 'Cloudinary Optimisation',       color: '#6b7fff' },
  { label: 'OCR + Vision Analysis',         color: '#fbbf24' },
  { label: 'Threat Signal Extraction',      color: '#f97316' },
  { label: 'Risk Scoring Engine',           color: '#ef4444' },
  { label: 'Explainable Verdict',           color: '#34d399' },
]

export default function LandingPage() {
  useAppearAnimation()
  const [showAuth, setShowAuth] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const toastTimeoutRef = useRef(null)

  const showToast = (msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastMessage(msg)
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null)
      toastTimeoutRef.current = null
    }, 2400)
  }

  // Scroll-reveal for feature cards (Apple Liquid Glass) and HIW steps
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -48px 0px' }
    )

    // Feature cards — stagger by index
    document.querySelectorAll('.feature-card').forEach((el, i) => {
      el.style.transitionDelay = `${i * 55}ms`
      observer.observe(el)
    })

    // HIW steps — stagger
    document.querySelectorAll('.hiw-step').forEach((el, i) => {
      el.style.transitionDelay = `${i * 110}ms`
      observer.observe(el)
    })

    // About stat cells
    document.querySelectorAll('.about-stat-cell').forEach((el, i) => {
      el.style.transitionDelay = `${i * 75}ms`
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* FIXED PERSISTENT NAVBAR */}
      <Navbar ctaLabel="Analyze Now" ctaHref="/analyze" />

      {/* ══════════════════════════════════════════════════════════════════
          HERO VIEWPORT — exactly the screenshot, first 100vh
      ══════════════════════════════════════════════════════════════════ */}
      <div className="hero-viewport">
        {/* GRAIN OVERLAY */}
        <div className="grain" aria-hidden="true" />

        {/* BACKGROUND VIDEO */}
        <video
          className="hero-photo"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4"
            type="video/mp4"
          />
        </video>

        {/* PAGE GRID */}
        <div className="page">
          <div className="header-spacer" aria-hidden="true" />

          {/* HERO */}
          <main className="hero" id="top">
            <div className="hero-copy">
              {/* BADGE */}
              <div className="badge appear appear--pop" role="doc-subtitle">
                <svg
                  className="badge-star"
                  viewBox="0 0 24 24"
                  fill="#fff"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.45))', width: 18, height: 20 }}
                  aria-hidden="true"
                >
                  <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
                </svg>
                AI-Powered Scam Detection
              </div>

              {/* H1 */}
              <h1>
                <span className="headline-line">
                  <span className="appear appear--mask">
                    One screenshot can hide <em>a scam.</em>
                  </span>
                </span>
                <span className="headline-line">
                  <span className="appear appear--mask">
                    Sense Check.ai knows.
                  </span>
                </span>
              </h1>

              {/* LEDE */}
              <p className="lede appear appear--soft">
                Upload a suspicious message, payment page, or QR code.
                Sense Check.ai extracts signals, detects deception, and explains exactly why.
              </p>

              {/* ACTIONS */}
              <div className="hero-actions">
                <Link
                  to="/analyze"
                  className="btn btn-solid hero-btn appear appear--btn"
                >
                  Analyze Suspicious Content
                </Link>
                <Link
                  to="/scroll-writing"
                  className="btn btn-ghost hero-ghost hero-btn appear appear--side"
                >
                  See how it works
                </Link>
              </div>
            </div>
          </main>

          {/* STATS FOOTER */}
          <footer className="stats" aria-label="Platform statistics">
            {/* Stat 1 */}
            <div className="stat appear appear--stat">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="sg1" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="38%" stopColor="#ffffff" />
                    <stop offset="62%" stopColor="#3a3a3a" />
                  </linearGradient>
                  <linearGradient id="sg2" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="38%" stopColor="#3a3a3a" />
                    <stop offset="62%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
                <rect x="3.4"  y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#sg1)" />
                <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#sg2)" />
                <rect x="9.2"  y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
              </svg>
              50K+ scans completed
            </div>

            {/* Stat 2 — updated accuracy */}
            <div className="stat appear appear--stat">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
                <path
                  d="M12 7.1v7.4 M8.15 12.35L12 16.2l3.85-3.85"
                  stroke="#111"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              99.7%* test accuracy
            </div>

            {/* Stat 3 — with Join Now */}
            <div className="stat appear appear--stat">
              <svg viewBox="0 0 40 22" className="stat-icon-wide" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
                <polygon points="7,9 8,6 10,9" fill="#f4f4f4" />
                <polygon points="13.4,9 12.4,6 10.4,9" fill="#f4f4f4" />
                <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
                <circle cx="8.8" cy="11.5" r="0.7" fill="#1a1a1a" />
                <circle cx="11.6" cy="11.5" r="0.7" fill="#1a1a1a" />
                <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
                <circle cx="18" cy="10" r="1.7" fill="#111" />
                <circle cx="22.4" cy="10" r="1.7" fill="#111" />
                <ellipse cx="20.2" cy="12.5" rx="1.5" ry="1" fill="#111" />
                <path d="M18 15 Q20.2 18 22.4 15" stroke="#111" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
                <text x="30.2" y="15.1" fill="#ffffff" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="12.5" textAnchor="middle">e</text>
              </svg>
              <div className="stat-content">
                <span>1,200+ users protected</span>
                <button
                  className="join-now-btn"
                  onClick={() => setShowAuth(true)}
                  type="button"
                  aria-label="Join Sense Check.ai"
                >
                  Join Now →
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Accuracy footnote */}
      <p className="stat-footnote">
        * 99.7% accuracy measured in controlled test conditions with a curated dataset. Real-world results may vary based on content type and context.
      </p>

      {/* ══════════════════════════════════════════════════════════════════
          SCROLLABLE SECTIONS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="landing-sections">

        {/* ── SECTION 1: What can you analyze? ── */}
        <div className="section-sep" />
        <section id="features" aria-labelledby="features-title">
          <div className="lp-section">
            <p className="lp-section-label">What can you analyze?</p>
            <h2 id="features-title" className="lp-section-title">
              If it looks suspicious,<br /><em>send it to Sense Check.ai</em>
            </h2>
            <p className="lp-section-sub">
              Sense Check.ai handles every format scammers use — images, text, links, and QR codes.
              You don't need to know what type of scam it is. Just submit it.
            </p>
            <div className="feature-cards">
              {FEATURES.map(f => (
                <div key={f.title} className="feature-card">
                  <div className="feature-card-icon">{f.icon}</div>
                  <div className="feature-card-title">{f.title}</div>
                  <div className="feature-card-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: How It Works ── */}
        <div className="section-sep" />
        <section id="how-it-works-section" aria-labelledby="hiw-title">
          <div className="lp-section">
            <p className="lp-section-label">How it works</p>
            <h2 id="hiw-title" className="lp-section-title">
              Three steps to <em>clarity</em>
            </h2>
            <p className="lp-section-sub">
              No technical knowledge required. In seconds, Sense Check.ai gives you an explanation
              you can actually understand and act on.
            </p>
            <div className="hiw-steps">
              {HIW.map((step, i) => (
                <div key={step.step} className="hiw-step">
                  <div className="hiw-step-num">Step {step.step}</div>
                  <div className="hiw-step-icon">{step.icon}</div>
                  <div className="hiw-step-title">{step.title}</div>
                  <div className="hiw-step-desc">{step.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <Link to="/scroll-writing" className="btn btn-ghost" style={{ height: 44, padding: '0 24px', fontSize: 14 }}>
                See the full architecture →
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: About ── */}
        <div className="section-sep" />
        <section id="about-section" aria-labelledby="about-title">
          <div className="lp-section">
            <p className="lp-section-label">About Sense Check.ai</p>
            <div className="about-grid">
              <div>
                <h2 id="about-title" className="lp-section-title" style={{ marginBottom: 20 }}>
                  Think before<br /> <em>you trust.</em>
                </h2>
                <p className="lp-section-sub" style={{ marginBottom: 0 }}>
                  Sense Check.ai was built for a simple reason: scammers have become extremely sophisticated,
                  and most people don't have the tools to verify what they're looking at.
                </p>
                <p style={{ fontSize: 14.5, color: '#9a9a9a', lineHeight: 1.65, letterSpacing: '-0.01em', marginTop: 16, maxWidth: 480 }}>
                  Our AI extracts every signal from a suspicious screenshot — sender details, urgency language,
                  lookalike domains, credential requests — and explains exactly why something is dangerous.
                  We believe explainability is not optional: you should always understand why a tool tells you something is a scam.
                </p>
                <div className="about-stat-grid">
                  <div className="about-stat-cell">
                    <div className="about-stat-val">50K+</div>
                    <div className="about-stat-label">Scans analyzed</div>
                  </div>
                  <div className="about-stat-cell">
                    <div className="about-stat-val">99.7%*</div>
                    <div className="about-stat-label">Test accuracy</div>
                  </div>
                  <div className="about-stat-cell">
                    <div className="about-stat-val">8</div>
                    <div className="about-stat-label">Threat categories</div>
                  </div>
                  <div className="about-stat-cell">
                    <div className="about-stat-val">Real-time</div>
                    <div className="about-stat-label">Analysis engine</div>
                  </div>
                </div>
                <div style={{ marginTop: 28 }}>
                  <button
                    onClick={() => setShowAuth(true)}
                    className="btn btn-solid"
                    style={{ height: 44, padding: '0 24px', fontSize: 14, marginRight: 10 }}
                    type="button"
                  >
                    Join Now
                  </button>
                  <Link to="/analyze" className="btn btn-ghost" style={{ height: 44, padding: '0 24px', fontSize: 14 }}>
                    Try it free →
                  </Link>
                </div>
              </div>

              <div className="about-visual">
                <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a9a9a', marginBottom: 8 }}>
                  How the engine works
                </p>
                {PIPELINE.map((row, i) => (
                  <div key={row.label} style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="about-pipeline-row">
                      <div className="about-pipeline-dot" style={{ background: row.color, boxShadow: `0 0 8px ${row.color}80` }} />
                      {row.label}
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.06)', margin: '0 auto 0 32px' }} />
                    )}
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <p style={{ fontSize: 12, color: '#34d399', letterSpacing: '-0.005em', lineHeight: 1.5 }}>
                    ✓ Every verdict includes a human-readable explanation. The AI never just says "scam" — it always shows you why.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SITE FOOTER ── */}
        <div className="section-sep" />
        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="site-footer-top">
              {/* Brand & Community Column */}
              <div className="footer-brand-col">
                <div>
                  <div className="footer-brand-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <g transform="rotate(-30 12 12)">
                        <circle cx="7.3" cy="3.2" r="1.45"/>
                        <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8"/>
                        <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8"/>
                        <circle cx="16.7" cy="20.8" r="1.45"/>
                      </g>
                    </svg>
                    <span>Sense Check<span style={{ fontWeight: 400 }}>.ai</span></span>
                  </div>

                  <p className="footer-brand-desc" style={{ marginTop: 8 }}>
                    Think Before You Trust.<br />
                    AI-powered scam and phishing detection for everyone.
                  </p>
                </div>

                {/* Primary Quick CTAs */}
                <div className="footer-cta-row">
                  <button
                    onClick={() => setShowAuth(true)}
                    className="btn btn-solid footer-cta-btn"
                    type="button"
                  >
                    Sign Up Free
                  </button>
                  <Link to="/analyze" className="btn btn-ghost footer-cta-btn">
                    Analyze Now
                  </Link>
                </div>

                {/* Social Media Buttons (Display & Interactive) */}
                <div className="footer-social-group">
                  <span className="footer-group-label">Connect</span>
                  <div className="footer-social-buttons">
                    <button
                      type="button"
                      className="footer-social-btn"
                      onClick={() => showToast('Sense Check.ai on X — Launching soon!')}
                      aria-label="X (formerly Twitter)"
                      title="X (Twitter)"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="footer-social-btn"
                      onClick={() => showToast('Sense Check.ai on Facebook — Launching soon!')}
                      aria-label="Facebook"
                      title="Facebook"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="footer-social-btn"
                      onClick={() => showToast('Sense Check.ai on Instagram — Launching soon!')}
                      aria-label="Instagram"
                      title="Instagram"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="footer-social-btn"
                      onClick={() => showToast('Sense Check.ai on LinkedIn — Launching soon!')}
                      aria-label="LinkedIn"
                      title="LinkedIn"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="footer-social-btn"
                      onClick={() => showToast('Sense Check.ai on YouTube — Launching soon!')}
                      aria-label="YouTube"
                      title="YouTube"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="footer-social-btn"
                      onClick={() => showToast('Sense Check.ai WhatsApp Channel — Launching soon!')}
                      aria-label="WhatsApp"
                      title="WhatsApp"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="footer-social-btn"
                      onClick={() => showToast('Sense Check.ai Telegram Channel — Launching soon!')}
                      aria-label="Telegram"
                      title="Telegram"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.832.942z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Mobile App Buttons */}
                <div className="footer-store-group">
                  <span className="footer-group-label">Apps</span>
                  <div className="footer-store-badges">
                    <button
                      type="button"
                      className="footer-store-btn"
                      onClick={() => showToast('Sense Check.ai Android App — Coming soon to Google Play!')}
                      aria-label="Get it on Google Play"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M3.609 1.814L13.792 12 3.61 22.186a2.44 2.44 0 0 1-.61-.954V2.768c.15-.36.368-.691.61-.954zM15.207 13.414l2.428-2.428-12.92-7.398 10.492 9.826zm2.428-4.414l-2.428-2.428-10.492 9.826 12.92-7.398zm1.096 1.138l3.18 1.821a1.2 1.2 0 0 1 0 2.082l-3.18 1.821-2.122-2.122 2.122-2.802z"/>
                      </svg>
                      <div className="footer-store-text">
                        <span className="footer-store-sub">GET IT ON</span>
                        <span className="footer-store-title">Google Play</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="footer-store-btn"
                      onClick={() => showToast('Sense Check.ai iOS App — Coming soon to App Store!')}
                      aria-label="Download on the App Store"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.94.04-2.07.63-2.73 1.38-.57.65-1.07 1.72-1.03 2.76 1.05.08 2.12-.52 2.75-1.27z"/>
                      </svg>
                      <div className="footer-store-text">
                        <span className="footer-store-sub">Download on the</span>
                        <span className="footer-store-title">App Store</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Emergency helpline — most important */}
              <div>
                <p className="footer-col-title">Report Cyber Crime</p>
                <div className="footer-emergency">
                  <p className="footer-emergency-label">🚨 National Helpline</p>
                  <p className="footer-emergency-num">1930</p>
                  <p className="footer-emergency-sub">Cyber crime helpline — 24×7</p>
                </div>
                <div className="footer-links">
                  <a
                    className="footer-link"
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    cybercrime.gov.in
                    <span>National Cyber Crime Reporting Portal</span>
                  </a>
                  <a
                    className="footer-link"
                    href="https://consumerhelpline.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    consumerhelpline.gov.in
                    <span>Consumer protection portal</span>
                  </a>
                </div>
              </div>

              {/* Resources */}
              <div>
                <p className="footer-col-title">Stay Informed</p>
                <div className="footer-links">
                  <a
                    className="footer-link"
                    href="https://www.cert-in.org.in"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    cert-in.org.in
                    <span>CERT-In — Indian Cyber Emergency Response</span>
                  </a>
                  <a
                    className="footer-link"
                    href="https://rbi.org.in"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    rbi.org.in
                    <span>Reserve Bank of India — official fraud guidance</span>
                  </a>
                  <a
                    className="footer-link"
                    href="https://www.mha.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    mha.gov.in
                    <span>Ministry of Home Affairs</span>
                  </a>
                  <a
                    className="footer-link"
                    href="https://www.meity.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    meity.gov.in
                    <span>Ministry of Electronics & IT</span>
                  </a>
                </div>
              </div>

              {/* Product links */}
              <div>
                <p className="footer-col-title">Sense Check.ai</p>
                <div className="footer-links">
                  <Link className="footer-link" to="/analyze">Analyze Content</Link>
                  <Link className="footer-link" to="/scroll-writing">How It Works</Link>
                  <Link className="footer-link" to="/scroll-writing#architecture">Architecture</Link>
                  <a
                    className="footer-link"
                    href="#about-section"
                    onClick={e => { e.preventDefault(); document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' }) }}
                  >
                    About
                  </a>
                  <button
                    className="footer-link"
                    onClick={() => setShowAuth(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left', padding: 0 }}
                    type="button"
                  >
                    Sign Up / Sign In
                  </button>
                </div>
              </div>
            </div>

            <div className="site-footer-bottom">
              <p className="footer-copyright">
                © {new Date().getFullYear()} Sense Check.ai — All rights reserved.
              </p>
              <p className="footer-disclaimer">
                * 99.7% accuracy measured in controlled test conditions. Real-world results may vary.
                Sense Check.ai is a decision-support tool. Always verify with official sources.
              </p>
            </div>
          </div>
        </footer>

        {/* Floating toast notification */}
        {toastMessage && (
          <div className="footer-toast" role="status" aria-live="polite">
            <span className="footer-toast-dot" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </>
  )
}
