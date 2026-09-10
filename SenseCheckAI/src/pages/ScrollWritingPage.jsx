import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import LogoMark from '../components/LogoMark'

/* ─── Architecture pipeline nodes ─────────────────────────────────────────── */
const ARCH_NODES = [
  {
    step: '01',
    label: 'User Evidence',
    role: 'Multi-Modal Ingestion',
    sub: 'Accepts screenshots, WhatsApp forwards, SMS, emails & QR codes',
    details: 'Zero-trust intake buffer that accepts raw screenshots, image formats, text snippets, or links without requiring user registration or saving sensitive user data.',
    tech: ['Direct Upload', 'Client Validation', 'Ephemeral Buffer'],
  },
  {
    step: '02',
    label: 'Cloudinary CDN',
    role: 'Media Preparation',
    sub: 'Auto-format (f_auto), compression (q_auto) & contrast boost (e_improve)',
    details: 'Pre-processes raw evidence at the CDN edge. Applies lossless normalization, noise filtering, and edge contrast sharpening to maximize OCR text recovery.',
    tech: ['Cloudinary SDK', 'f_auto', 'q_auto', 'e_improve'],
  },
  {
    step: '03',
    label: 'OCR Engine',
    role: 'Text Extraction',
    sub: 'High-precision layout extraction recovering hidden text, URLs & metadata',
    details: 'Extracts complex multi-font text, obfuscated zero-width spaces, international script spoofs, and embedded alphanumeric tokens from screenshots.',
    tech: ['OCR Vision', 'Token Extraction', 'Obfuscation Filter'],
  },
  {
    step: '04',
    label: 'Vision Classifier',
    role: 'Visual Perception',
    sub: 'Detects fake bank headers, imitated brand logos & synthetic UI elements',
    details: 'Extracts spatial visual bounding boxes, color palettes, impersonated logos, fake urgency counters, and deceptive payment interface patterns.',
    tech: ['Visual Heuristics', 'Logo Matcher', 'Layout Parser'],
  },
  {
    step: '05',
    label: 'Threat Engine',
    role: 'Risk Scoring Matrix',
    sub: 'Cross-evaluates urgency cues, OTP demands, credential phishing & lookalike domains',
    details: 'Correlates extracted evidence against real-world scam topologies. Weighs psychological urgency vectors, impersonation signatures, and fraudulent payment instructions.',
    tech: ['Risk Matrix', 'Urgency Heuristics', 'Domain Spoof Check'],
  },
  {
    step: '06',
    label: 'Explanation Layer',
    role: 'Explainable AI (XAI)',
    sub: 'Generates transparent, human-readable reasoning and threat citations',
    details: 'Transforms raw ML probability tensors into clear, transparent justifications. Explains exactly which sentences, logos, or URLs triggered the threat flags.',
    tech: ['Plain-English XAI', 'Signal Attribution', 'Confidence Weighing'],
  },
  {
    step: '07',
    label: 'Actionable Decision',
    role: 'User Protection',
    sub: 'Definitive verdict (Safe / Suspicious / Risky) with prioritized safety steps',
    details: 'Delivers immediate zero-trust protective guidance: instructions on blocking senders, avoiding link clicks, verifying with official bank channels, and reporting scams.',
    tech: ['Decision Engine', 'Guidance Matrix', 'Confidence Score'],
  },
]

/* ─── Section data ────────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    id: 's01', step: '01',
    title: 'The', em: 'Screenshot.',
    body: "A suspicious message arrives. It could be a WhatsApp forward, an SMS from an unknown number, an email asking you to verify your account, or a QR code you were asked to scan. Something feels off — but you can't quite tell why.",
    extra: 'tags',
  },
  {
    id: 's02', step: '02',
    title: 'The', em: 'Evidence.',
    body: "Sense Check.ai receives your content as evidence. Whether it's an image, pasted text, email body, or a link — the system works directly with what you have. Nothing is lost in translation.",
  },
  {
    id: 's03', step: '03',
    title: 'The Media', em: 'Layer.',
    body: 'Cloudinary receives the uploaded image and prepares it for analysis. Automatic format selection, quality optimisation, and visual enhancements ensure the AI receives a clean, high-fidelity version of the evidence.',
    extra: 'cloudinary',
  },
  {
    id: 's04', step: '04',
    title: 'The Intelligence', em: 'Layer.',
    body: 'OCR and computer vision extract every text fragment, visual layout signal, and structural pattern. Sender identifiers, URLs, financial amounts, urgency keywords, and impersonation markers are all isolated as structured data.',
    extra: 'intelligence',
  },
  {
    id: 's05', step: '05',
    title: 'The Detection', em: 'Layer.',
    body: 'The threat engine evaluates extracted signals against known scam patterns. Each signal is scored individually — urgency language, identity impersonation, credential requests, suspicious payment instructions, and lookalike domains all have distinct detection logic.',
    extra: 'detection',
  },
  {
    id: 's06', step: '06',
    title: 'The', em: 'Explanation.',
    body: 'Sense Check.ai does not just say "scam detected". It explains why. Each threat signal is described in plain language: what was found, why it is suspicious, and what evidence supports the conclusion. You get reasoning, not just a verdict.',
  },
  {
    id: 'architecture', step: '06',
    title: 'The full', em: 'pipeline.',
    extra: 'architecture',
  },
  {
    id: 's08', step: '07',
    title: 'The', em: 'Decision.',
    body: "You receive a clear, actionable recommendation — not just a verdict, but specific steps to take based on exactly what was found. Sense Check.ai is a decision-support system. The final decision always belongs to you.",
    extra: 'decision',
  },
]

const SECTION_IDS = SECTIONS.map(s => s.id)

export default function ScrollWritingPage() {
  const snapRef = useRef(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [activeNode, setActiveNode] = useState(-1)
  const [selectedNode, setSelectedNode] = useState(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const simTimerRef = useRef(null)
  const archTriggered = useRef(false)

  /* ─── Dot click navigation ─────────────────────────────────────────────── */
  const goTo = useCallback((idx) => {
    const container = snapRef.current
    const el = document.getElementById(SECTION_IDS[idx])
    if (container && el) {
      container.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
    }
    setCurrentIdx(idx)
  }, [])

  /* ─── Hash navigation on mount & URL changes ───────────────────────────── */
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '')
      if (!hash) return
      const idx = SECTION_IDS.indexOf(hash)
      if (idx !== -1) {
        goTo(idx)
      }
    }
    const t = setTimeout(handleHash, 120)
    window.addEventListener('hashchange', handleHash)
    return () => {
      clearTimeout(t)
      window.removeEventListener('hashchange', handleHash)
    }
  }, [goTo])

  /* ─── Section wheel / keyboard / touch navigation ─────────────────────── */
  useEffect(() => {
    const container = snapRef.current
    if (!container) return

    let locked = false

    const navigate = (dir) => {
      if (locked) return
      locked = true

      setCurrentIdx(prev => {
        const next = Math.max(0, Math.min(SECTION_IDS.length - 1, prev + dir))
        const el = document.getElementById(SECTION_IDS[next])
        if (el) container.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
        return next
      })

      setTimeout(() => { locked = false }, 800)
    }

    const onWheel = (e) => { e.preventDefault(); navigate(e.deltaY > 0 ? 1 : -1) }
    let touchY = 0
    const onTouchStart = (e) => { touchY = e.touches[0].clientY }
    const onTouchEnd = (e) => {
      const dy = touchY - e.changedTouches[0].clientY
      if (Math.abs(dy) > 50) navigate(dy > 0 ? 1 : -1)
    }
    const onKey = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') navigate(1)
      if (e.key === 'ArrowUp'   || e.key === 'PageUp')   navigate(-1)
    }

    container.addEventListener('wheel',      onWheel,      { passive: false })
    container.addEventListener('touchstart', onTouchStart, { passive: true  })
    container.addEventListener('touchend',   onTouchEnd,   { passive: true  })
    window.addEventListener('keydown', onKey)

    return () => {
      container.removeEventListener('wheel',      onWheel)
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchend',   onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  /* ─── Track active section with IntersectionObserver ───────────────────── */
  useEffect(() => {
    const container = snapRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            const idx = SECTION_IDS.indexOf(entry.target.id)
            if (idx !== -1) {
              setCurrentIdx(idx)
            }
          }
        })
      },
      {
        root: container,
        threshold: [0.45],
      }
    )

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  /* ─── Simulate pipeline pulse ─────────────────────────────────────────── */
  const simulateTrace = useCallback(() => {
    if (isSimulating) return
    setIsSimulating(true)
    let step = 0
    setActiveNode(0)

    if (simTimerRef.current) clearInterval(simTimerRef.current)

    simTimerRef.current = setInterval(() => {
      step += 1
      if (step < ARCH_NODES.length) {
        setActiveNode(step)
      } else {
        clearInterval(simTimerRef.current)
        simTimerRef.current = null
        setTimeout(() => {
          setActiveNode(-1)
          setIsSimulating(false)
        }, 1200)
      }
    }, 420)
  }, [isSimulating])

  /* ─── Architecture initial trigger when entering section 6 ─────────────── */
  useEffect(() => {
    if (currentIdx === 6 && !archTriggered.current) {
      archTriggered.current = true
      simulateTrace()
    }
  }, [currentIdx, simulateTrace])

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#000', color: '#fff', overflow: 'hidden',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>

      {/* ── STICKY HEADER ── */}
      <header className="scroll-header" style={{ flexShrink: 0 }}>
        <Link to="/" className="logo" aria-label="Sense Check.ai — Home">
          <LogoMark size={18} />
          <span>Sense Check<span className="logo-suffix">.ai</span></span>
        </Link>
        <span style={{ justifySelf: 'center', fontSize: 12.5, color: '#9a9a9a', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          How It Works
        </span>
        <div style={{ justifySelf: 'end' }}>
          <Link to="/analyze" className="btn btn-solid" style={{ fontSize: 13, height: 36, padding: '0 14px' }}>
            Analyze Now
          </Link>
        </div>
      </header>

      {/* ── SNAP SCROLL CONTAINER ── */}
      <div
        ref={snapRef}
        style={{
          flex: 1,
          overflowY: 'scroll',
          overflowX: 'hidden',
          scrollSnapType: 'y mandatory',
          scrollBehavior: 'smooth',
          position: 'relative',
        }}
      >
        {SECTIONS.map((sec) => (
          <section
            key={sec.id}
            id={sec.id}
            style={{
              minHeight: '100%',
              scrollSnapAlign: 'start',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: sec.id === 'architecture'
                ? 'clamp(24px, 4vh, 44px) max(24px, 4vw)'
                : 'clamp(40px, 8vh, 80px) max(32px, 5vw)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* Giant ghost number behind section */}
            <span aria-hidden="true" style={{
              position: 'absolute', right: 48, bottom: 24,
              fontSize: 'clamp(72px, 13vw, 150px)',
              fontWeight: 800, letterSpacing: '-0.06em',
              color: 'rgba(255,255,255,0.022)',
              lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
            }}>
              {sec.id === 'architecture' ? '06' : sec.step}
            </span>

            <div
              className="scroll-section-inner"
              style={{
                maxWidth: sec.id === 'architecture' ? 1040 : 720,
                width: '100%',
                margin: 'auto 0',
              }}
            >
              {sec.id === 'architecture' ? (
                /* ─── ARCHITECTURE TWO-COLUMN PIPELINE ─── */
                <div className="arch-pipeline-container">
                  {/* Left Column: Overview, Metrics, Controls & Inspector */}
                  <div className="arch-pipeline-info">
                    <div className="arch-status-badge">
                      <span className="arch-pulse-dot" />
                      <span>End-to-End Multimodal Pipeline</span>
                    </div>

                    <div>
                      <p className="scroll-step" style={{ marginBottom: 6, fontSize: 11 }}>
                        Architecture 06
                      </p>
                      <h2 style={{ fontSize: 'clamp(28px, 3.8vw, 44px)', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1.08, margin: 0 }}>
                        The full <em style={{ fontStyle: 'italic', fontFamily: '"Instrument Serif", serif', color: '#9a9a9a', fontSize: '1.05em' }}>pipeline.</em>
                      </h2>
                    </div>

                    <p className="scroll-body" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: '#94a3b8' }}>
                      Multimodal architecture from raw evidence ingestion to instant, explainable risk decisions.
                    </p>

                    {/* Metrics Grid */}
                    <div className="arch-metrics-grid">
                      <div className="arch-metric-card">
                        <div className="arch-metric-val">~320ms</div>
                        <div className="arch-metric-label">Pipeline Latency</div>
                      </div>
                      <div className="arch-metric-card">
                        <div className="arch-metric-val">100% Zero Retention</div>
                        <div className="arch-metric-label">Privacy Guarantee</div>
                      </div>
                      <div className="arch-metric-card">
                        <div className="arch-metric-val">Vision + OCR + NLP</div>
                        <div className="arch-metric-label">Multimodal Perception</div>
                      </div>
                      <div className="arch-metric-card">
                        <div className="arch-metric-val">Cloudinary Edge</div>
                        <div className="arch-metric-label">Auto Optimization</div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="arch-actions">
                      <button
                        type="button"
                        onClick={simulateTrace}
                        className="arch-simulate-btn"
                        disabled={isSimulating}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>{isSimulating ? 'Tracing Stream...' : 'Simulate Pipeline Flow'}</span>
                      </button>
                      <span className="arch-hint-text">
                        {selectedNode !== null ? 'Click card again to close details' : 'Click any node to inspect specs'}
                      </span>
                    </div>

                    {/* Selected Node Details Box */}
                    {selectedNode !== null && (
                      <div className="arch-inspector-box">
                        <div className="arch-inspector-header">
                          <span className="arch-inspector-badge">{ARCH_NODES[selectedNode].step}</span>
                          <span className="arch-inspector-name">{ARCH_NODES[selectedNode].label}</span>
                        </div>
                        <p className="arch-inspector-desc">{ARCH_NODES[selectedNode].details}</p>
                        <div className="arch-inspector-tags">
                          {ARCH_NODES[selectedNode].tech.map(t => (
                            <span key={t} className="arch-tech-pill">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Pipeline Nodes Rail */}
                  <div className="arch-nodes-rail">
                    {ARCH_NODES.map((node, j) => {
                      const isPulsing = activeNode === j;
                      const isSelected = selectedNode === j;
                      return (
                        <div key={node.label} className="arch-node-wrapper">
                          <div
                            className={`arch-node-card${isPulsing ? ' node-pulsing' : ''}${isSelected ? ' node-selected' : ''}`}
                            onClick={() => setSelectedNode(prev => prev === j ? null : j)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="arch-node-rail-left">
                              <div className={`arch-node-dot${isPulsing ? ' dot-active' : ''}`} />
                              <span className="arch-node-step-tag">{node.step}</span>
                            </div>
                            <div className="arch-node-content">
                              <div className="arch-node-heading-row">
                                <span className="arch-node-title">{node.label}</span>
                                <span className="arch-node-role">{node.role}</span>
                              </div>
                              <div className="arch-node-sub">{node.sub}</div>
                            </div>
                          </div>
                          {j < ARCH_NODES.length - 1 && (
                            <div className={`arch-connector-line${isPulsing ? ' connector-active' : ''}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ─── STANDARD SECTION CONTENT ─── */
                <>
                  {/* Step label */}
                  <p className="scroll-step">
                    {isNaN(Number(sec.step)) ? sec.step : `Scroll ${sec.step}`}
                  </p>

                  {/* Title */}
                  <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 56px)', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 12 }}>
                    {sec.title} {sec.em && <em style={{ fontStyle: 'italic', fontFamily: '"Instrument Serif", serif', color: '#9a9a9a', fontSize: '1.05em' }}>{sec.em}</em>}
                  </h2>

                  {/* Body text */}
                  {sec.body && <p className="scroll-body">{sec.body}</p>}

                  {/* ── Extra content per section ── */}
                  {sec.extra === 'tags' && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 28 }}>
                      {['WhatsApp', 'SMS', 'Email', 'Payment QR', 'KYC notice', 'Transaction alert'].map(tag => (
                        <span key={tag} className="type-tag" style={{ fontSize: 12.5 }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {sec.extra === 'cloudinary' && (
                    <div style={{ marginTop: 28 }}>
                      <span className="cloudinary-pill">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2Z" stroke="#a0b8ff" strokeWidth="1.2" />
                          <path d="M5.5 8 8 5.5 10.5 8M8 5.5v5" stroke="#a0b8ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Powered by Cloudinary
                      </span>
                      <div className="feature-grid" style={{ marginTop: 16 }}>
                        {[
                          { title: 'Auto Format',   desc: <><span className="tag-code">f_auto</span> — WebP, AVIF, or JPEG delivered automatically</> },
                          { title: 'Auto Quality',  desc: <><span className="tag-code">q_auto</span> — Optimal compression without visual loss</> },
                          { title: 'Enhancement',   desc: <><span className="tag-code">e_improve</span> — Visual clarity for better OCR results</> },
                          { title: 'Asset Routing', desc: 'Metadata routes content types to specialised pipelines' },
                        ].map(f => (
                          <div key={f.title} className="feature-cell">
                            <p className="feature-cell-title">{f.title}</p>
                            <p className="feature-cell-desc">{f.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sec.extra === 'intelligence' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 28 }}>
                      {[
                        { label: 'OCR',                sub: 'Text extraction from image'       },
                        { label: 'Layout Analysis',    sub: 'Visual structure interpretation'  },
                        { label: 'URL Detection',      sub: 'Link pattern extraction'          },
                        { label: 'Entity Recognition', sub: 'Sender, amount, institution'      },
                      ].map(n => (
                        <div key={n.label} className="arch-node active">
                          <div className="arch-node-dot" />
                          <div>
                            <div style={{ fontWeight: 500 }}>{n.label}</div>
                            <div style={{ fontSize: 11.5, color: '#9a9a9a', marginTop: 2 }}>{n.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {sec.extra === 'detection' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 28 }}>
                      {[
                        { label: 'Urgency / Pressure',     sev: 'high'   },
                        { label: 'Identity Impersonation',  sev: 'high'   },
                        { label: 'Credential Request',      sev: 'high'   },
                        { label: 'Suspicious Link',         sev: 'medium' },
                        { label: 'Payment Instruction',     sev: 'medium' },
                      ].map(s => (
                        <div key={s.label} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 16px', borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
                        }}>
                          <span style={{ fontSize: 13.5, letterSpacing: '-0.01em' }}>{s.label}</span>
                          <span className={`signal-severity ${s.sev}`}>{s.sev}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {sec.extra === 'decision' && (
                    <>
                      <div style={{ marginTop: 28, padding: '20px 20px 16px', borderRadius: 10, border: '1px solid rgba(249,115,22,0.2)', background: 'rgba(249,115,22,0.04)' }}>
                        <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9a9a', marginBottom: 10 }}>
                          Example Output
                        </p>
                        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.04em', color: '#f97316', lineHeight: 1, marginBottom: 6 }}>
                          Risky
                        </div>
                        <div style={{ fontSize: 13, color: '#9a9a9a', marginBottom: 16, letterSpacing: '-0.01em' }}>
                          Significant threat indicators present — 89% confidence
                        </div>
                        {[
                          "Do not click any link in the message.",
                          "Do not share any OTP or password.",
                          "Call your bank's official number to verify.",
                        ].map((a, j) => (
                          <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6, fontSize: 13.5, color: '#e0e0e0', letterSpacing: '-0.01em' }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.35)', flexShrink: 0, marginTop: 7 }} />
                            {a}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 24, textAlign: 'center' }}>
                        <Link to="/analyze" className="btn btn-solid" style={{ height: 44, padding: '0 24px', fontSize: 14 }}>
                          Try Sense Check.ai
                        </Link>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </section>
        ))}
      </div>

      {/* ── SIDE PROGRESS DOTS ── */}
      <nav
        aria-label="Section navigation"
        style={{
          position: 'fixed', right: 18, top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column',
          gap: 7, zIndex: 30,
        }}
      >
        {SECTIONS.map((sec, i) => (
          <button
            key={sec.id}
            onClick={() => goTo(i)}
            aria-label={`Jump to ${isNaN(Number(sec.step)) ? sec.step : `Scroll ${sec.step}`}`}
            title={isNaN(Number(sec.step)) ? sec.step : `Scroll ${sec.step}`}
            type="button"
            style={{
              width:  i === currentIdx ? 5 : 4,
              height: i === currentIdx ? 22 : 4,
              borderRadius: 3,
              background: i === currentIdx ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.18)',
              border: 'none', padding: 0, cursor: 'pointer',
              transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
              display: 'block',
            }}
          />
        ))}
      </nav>

    </div>
  )
}
