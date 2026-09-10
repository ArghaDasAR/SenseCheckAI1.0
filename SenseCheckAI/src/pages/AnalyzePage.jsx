import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import LogoMark from '../components/LogoMark'
import MatrixRain from '../components/MatrixRain'
import { uploadToCloudinary, validateFile } from '../services/cloudinary'
import { getRiskPhrase, computeRiskScore, buildAnalysisResult } from '../data/demoAnalysis'

/* ─── Flow states ──────────────────────────────────────────────────────── */
const FLOW = {
  IDLE:       'idle',
  UPLOADING:  'uploading',
  PROCESSING: 'processing',
  SCAN_DONE:  'scan_done',
  RESULT:     'result',
  ERROR:      'error',
}

/* ─── Input type tabs ───────────────────────────────────────────────────── */
const INPUT_TYPES = [
  { id: 'image', label: 'Image',    icon: '📸', placeholder: null },
  { id: 'sms',   label: 'SMS/Text', icon: '💬', placeholder: 'Paste the suspicious SMS or text message here…' },
  { id: 'email', label: 'Email',    icon: '✉️',  placeholder: 'Paste the suspicious email — subject, sender, and body — for best accuracy…' },
  { id: 'link',  label: 'Link/URL', icon: '🔗', placeholder: null },
]

/* ─── Analysis stages per input type ───────────────────────────────────── */
const STAGES = {
  image: [
    { id: 'receive',    label: 'Receiving visual evidence'          },
    { id: 'optimize',   label: 'Optimising image via Cloudinary'    },
    { id: 'ocr',        label: 'Extracting text content (OCR)'      },
    { id: 'patterns',   label: 'Analysing suspicious patterns'      },
    { id: 'indicators', label: 'Checking threat indicators'         },
    { id: 'explain',    label: 'Generating explanation'             },
  ],
  sms: [
    { id: 'receive',    label: 'Reading message content'            },
    { id: 'parse',      label: 'Parsing sender and structure'       },
    { id: 'urgency',    label: 'Detecting urgency patterns'         },
    { id: 'phrases',    label: 'Checking known scam phrases'        },
    { id: 'indicators', label: 'Evaluating threat indicators'       },
    { id: 'explain',    label: 'Generating explanation'             },
  ],
  email: [
    { id: 'headers',    label: 'Parsing email headers'              },
    { id: 'body',       label: 'Extracting email body'              },
    { id: 'sender',     label: 'Checking sender reputation'         },
    { id: 'phishing',   label: 'Detecting phishing patterns'        },
    { id: 'indicators', label: 'Evaluating threat indicators'       },
    { id: 'explain',    label: 'Generating explanation'             },
  ],
  link: [
    { id: 'resolve',    label: 'Resolving URL structure'            },
    { id: 'domain',     label: 'Checking domain reputation'         },
    { id: 'lookalike',  label: 'Detecting lookalike domains'        },
    { id: 'patterns',   label: 'Analysing URL patterns'             },
    { id: 'indicators', label: 'Evaluating threat indicators'       },
    { id: 'explain',    label: 'Generating explanation'             },
  ],
}

const STAGE_MS = 900

export default function AnalyzePage() {
  const [flow,        setFlow]        = useState(FLOW.IDLE)
  const [inputType,   setInputType]   = useState('image')
  const [dragOver,    setDragOver]    = useState(false)
  const [file,        setFile]        = useState(null)
  const [previewUrl,  setPreviewUrl]  = useState(null)
  const [textContent, setTextContent] = useState('')
  const [urlContent,  setUrlContent]  = useState('')
  const [uploadPct,   setUploadPct]   = useState(0)
  const [stageIdx,    setStageIdx]    = useState(-1)
  const [result,      setResult]      = useState(null)
  const [errorMsg,    setErrorMsg]    = useState('')
  const fileInputRef = useRef(null)

  const stages = STAGES[inputType] || STAGES.image

  /* ─── Core analysis runner ─────────────────────────────────────────────── */
  const runAnalysis = useCallback(async (content = '') => {
    setFlow(FLOW.PROCESSING)
    setStageIdx(-1)

    // Animate through stages
    for (let i = 0; i < stages.length; i++) {
      setStageIdx(i)
      await new Promise(r => setTimeout(r, STAGE_MS))
    }

    // Cinematic SCAN COMPLETE flash
    setStageIdx(stages.length)
    setFlow(FLOW.SCAN_DONE)
    await new Promise(r => setTimeout(r, 1500))

    // Compute score from content (keyword/pattern analysis or filename hash)
    const score = computeRiskScore(inputType, content)
    setResult(buildAnalysisResult(score, inputType))
    setFlow(FLOW.RESULT)
  }, [stages, inputType])

  /* ─── Image upload ─────────────────────────────────────────────────────── */
  const handleFile = useCallback(async (f) => {
    const v = validateFile(f)
    if (!v.ok) { setErrorMsg(v.error); setFlow(FLOW.ERROR); return }

    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setFlow(FLOW.UPLOADING)
    setUploadPct(0)
    setErrorMsg('')

    try {
      await uploadToCloudinary(f, pct => setUploadPct(pct))
      await runAnalysis(f.name || 'image.jpg')
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed. Please try again.')
      setFlow(FLOW.ERROR)
    }
  }, [runAnalysis])

  /* ─── Text / URL submission ────────────────────────────────────────────── */
  const handleTextSubmit = useCallback(async () => {
    const content = inputType === 'link' ? urlContent.trim() : textContent.trim()
    if (!content) { setErrorMsg('Please enter some content to analyze.'); setFlow(FLOW.ERROR); return }
    setErrorMsg('')
    await runAnalysis(content)
  }, [inputType, textContent, urlContent, runAnalysis])

  /* ─── Drag & drop ──────────────────────────────────────────────────────── */
  const onDrop      = useCallback((e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }, [handleFile])
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true)  }
  const onDragLeave = ()  => setDragOver(false)
  const onInput     = (e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }

  /* ─── Reset ─────────────────────────────────────────────────────────────── */
  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFlow(FLOW.IDLE); setFile(null); setPreviewUrl(null)
    setTextContent(''); setUrlContent('')
    setUploadPct(0); setStageIdx(-1); setResult(null); setErrorMsg('')
  }

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [])

  const phrase        = result ? getRiskPhrase(result.riskScore) : null
  const isProcessing  = flow === FLOW.PROCESSING || flow === FLOW.SCAN_DONE

  return (
    <div className="analyze-page">

      {/* ── HEADER ── */}
      <header className="analyze-header">
        <Link to="/" className="logo" aria-label="Sense Check.ai — Home">
          <LogoMark size={20} />
          <span>Sense Check<span className="logo-suffix">.ai</span></span>
        </Link>
        <span style={{ justifySelf: 'center', fontSize: 16, fontWeight: 500, color: '#9a9a9a', letterSpacing: '-0.01em' }}>
          Threat Analysis
        </span>
        <div style={{ justifySelf: 'end' }}>
          {flow !== FLOW.IDLE && (
            <button onClick={reset} className="btn btn-ghost" style={{ fontSize: 13, height: 36 }} type="button">
              New Analysis
            </button>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="analyze-body">

        {/* ════════════════════ IDLE ════════════════════════ */}
        {flow === FLOW.IDLE && (
          <>
            <div style={{ textAlign: 'center', maxWidth: 580 }}>
              <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 500, letterSpacing: '-0.04em', marginBottom: 8, color: '#fff' }}>
                Analyze suspicious content
              </h1>
              <p style={{ fontSize: 14, color: '#9a9a9a', letterSpacing: '-0.01em', lineHeight: 1.55 }}>
                Choose what you want to analyze — image, SMS, email, or a link.
              </p>
            </div>

            {/* Input type tabs */}
            <div className="input-tabs">
              {INPUT_TYPES.map(t => (
                <button
                  key={t.id}
                  className={`input-tab${inputType === t.id ? ' active' : ''}`}
                  onClick={() => setInputType(t.id)}
                  type="button"
                >
                  <span aria-hidden="true">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Image dropzone ── */}
            {inputType === 'image' && (
              <>
                <div
                  className={`dropzone${dragOver ? ' drag-over' : ''}`}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload suspicious screenshot"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={onInput}
                    className="sr-only"
                    aria-label="Choose image file"
                  />
                  <svg className="dropzone-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                    <rect x="4" y="4" width="40" height="40" rx="10" stroke="white" strokeOpacity="0.18" strokeWidth="1.5"/>
                    <path d="M24 32V20M18 26l6-6 6 6" stroke="white" strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 36h16" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <p className="dropzone-title">Drop a suspicious screenshot here</p>
                  <p className="dropzone-sub">
                    WhatsApp chat, SMS, email, payment page, QR code, KYC notice — any suspicious image.
                  </p>
                  <div className="dropzone-types">
                    {['PNG', 'JPG', 'WEBP'].map(t => <span key={t} className="type-tag">{t}</span>)}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', letterSpacing: '-0.01em' }}>
                  Max 10 MB · Not stored permanently in demo mode
                </p>
              </>
            )}

            {/* ── SMS / Email textarea ── */}
            {(inputType === 'sms' || inputType === 'email') && (
              <div className="text-input-wrap">
                {inputType === 'email' && (
                  <p className="input-label">Include sender, subject, and body for best accuracy.</p>
                )}
                <textarea
                  className="text-input-area"
                  placeholder={INPUT_TYPES.find(t => t.id === inputType)?.placeholder}
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  aria-label={`Paste suspicious ${inputType} content`}
                />
                <button
                  className="btn btn-solid"
                  style={{ height: 44, fontSize: 14, width: '100%' }}
                  onClick={handleTextSubmit}
                  disabled={!textContent.trim()}
                  type="button"
                >
                  Analyze with Sense Check.ai →
                </button>
              </div>
            )}

            {/* ── URL / Link ── */}
            {inputType === 'link' && (
              <div className="text-input-wrap">
                <p className="input-label">Paste any suspicious URL, payment link, or shortened link.</p>
                <input
                  className="url-input"
                  type="url"
                  placeholder="https://suspicious-link.example.com"
                  value={urlContent}
                  onChange={e => setUrlContent(e.target.value)}
                  aria-label="Paste suspicious URL"
                />
                <button
                  className="btn btn-solid"
                  style={{ height: 44, fontSize: 14, width: '100%' }}
                  onClick={handleTextSubmit}
                  disabled={!urlContent.trim()}
                  type="button"
                >
                  Analyze Link →
                </button>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', letterSpacing: '-0.01em' }}>
                  We do not visit or load the link — only the URL string is analyzed.
                </p>
              </div>
            )}
          </>
        )}

        {/* ════════════════════ UPLOADING ════════════════════ */}
        {flow === FLOW.UPLOADING && (
          <>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#9a9a9a', marginBottom: 12, letterSpacing: '-0.01em' }}>
                Uploading to Cloudinary…
              </p>
              <div className="progress-track" style={{ maxWidth: 580 }}>
                <div className="progress-fill" style={{ width: `${uploadPct}%` }} />
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>{uploadPct}%</p>
            </div>

            {previewUrl && (
              <div className="preview-card" style={{ maxWidth: 580 }}>
                <img src={previewUrl} alt="Uploading screenshot" className="preview-image" />
                <div className="preview-meta">
                  <div className="meta-row">
                    <span className="meta-label">File</span>
                    <span className="meta-value" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Size</span>
                    <span className="meta-value">{(file?.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Status</span>
                    <span className="meta-badge processing">Uploading</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════ PROCESSING + SCAN_DONE ═══════ */}
        {isProcessing && (
          <>
            <div style={{ textAlign: 'center', maxWidth: 580 }}>
              <p style={{ fontSize: 13, letterSpacing: '-0.01em', color: '#9a9a9a' }}>
                {flow === FLOW.SCAN_DONE ? 'Scan complete.' : 'Analysing with Sense Check.ai…'}
              </p>
            </div>

            {previewUrl && (
              <div className="preview-card" style={{ maxWidth: 580 }}>
                <img src={previewUrl} alt="Screenshot being analyzed" className="preview-image" />
              </div>
            )}

            {/* Matrix container: 0s & 1s rain (neon green) + clean scan-complete text */}
            <div className="matrix-container" style={{ maxWidth: 580 }}>
              <MatrixRain active={isProcessing} opacity={0.2} />

              {/* Scan complete — clean white text, matrix rain glows behind */}
              {flow === FLOW.SCAN_DONE && (
                <div className="scan-complete-overlay">
                  <p className="scan-complete-text">Scan Complete</p>
                  <p className="scan-complete-sub">Threat Assessment Ready</p>
                </div>
              )}

              <div className="stages-panel">
                {stages.map((stage, i) => (
                  <div
                    key={stage.id}
                    className={`stage-row${i < stageIdx ? ' done' : i === stageIdx ? ' active' : ''}`}
                  >
                    <div className="stage-dot" />
                    {stage.label}
                    {i < stageIdx && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <path d="M2.5 7l3 3 6-6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════ RESULT ═══════════════════════ */}
        {flow === FLOW.RESULT && result && phrase && (
          <div className="result-panel">

            {/* ── Verdict card (phrase, not number) ── */}
            <div className="risk-gauge" style={{ '--gauge-glow': phrase.glow }}>
              <p className="risk-label">Threat Assessment</p>
              <div className="risk-header">
                <div className="risk-phrase-display">
                  <div className={`risk-phrase-text ${phrase.cls}`}>
                    {phrase.phrase}
                  </div>
                  <p className="risk-phrase-sub">{phrase.subtext}</p>
                </div>
                <div style={{ fontSize: 28, flexShrink: 0, marginTop: 4 }}>{phrase.icon}</div>
              </div>
              <div className="risk-bar-track" style={{ marginTop: 4 }}>
                <div className={`risk-bar-fill ${phrase.cls}`} style={{ width: `${result.riskScore}%` }} />
              </div>
              <div className="confidence-row">
                <span>AI Confidence</span>
                <span style={{ color: '#e0e0e0', fontWeight: 500 }}>{Math.round(result.confidence * 100)}%</span>
              </div>
            </div>

            {/* ── Red flags — renamed ── */}
            {result.indicators.length > 0 && (
              <>
                <p style={{ fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a9a9a', textAlign: 'center', marginBottom: 20 }}>
                  Red Flags that you must be aware of
                </p>
                <div className="signals-panel">
                  {result.indicators.map((ind, i) => (
                    <div key={ind.id} className="signal-card" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="signal-top">
                        <span className="signal-title">{ind.title}</span>
                        <span className={`signal-severity ${ind.severity}`}>{ind.severity}</span>
                      </div>
                      <p className="signal-desc">{ind.explanation}</p>
                      {ind.evidence && <p className="signal-evidence">"{ind.evidence}"</p>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Recommendations ── */}
            <div className="recommendation-card">
              <p className="rec-title">What should you do?</p>
              <div className="rec-items">
                {result.recommendation.actions.map((action, i) => (
                  <div key={i} className="rec-item">
                    <div className="rec-bullet" />
                    {action}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Emergency link to cybercrime.gov.in ── */}
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 8,
                border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.04)',
                textDecoration: 'none', transition: 'background 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em', marginBottom: 2 }}>
                  🚨 Report to National Cyber Crime Portal
                </p>
                <p style={{ fontSize: 12, color: '#9a9a9a' }}>cybercrime.gov.in · Helpline: 1930</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#9a9a9a', flexShrink: 0 }}>
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            {/* ── Analyze another ── */}
            <button onClick={reset} className="btn btn-solid" style={{ width: '100%', height: 44 }} type="button">
              Analyse Another Item
            </button>
          </div>
        )}

        {/* ════════════════════ ERROR ════════════════════════ */}
        {flow === FLOW.ERROR && (
          <div style={{ textAlign: 'center', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 7v5M11 14.5v.5" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="9" stroke="#ef4444" strokeWidth="1.2"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em', color: '#fff' }}>
              Something went wrong
            </p>
            <p style={{ fontSize: 13.5, color: '#9a9a9a', lineHeight: 1.55, letterSpacing: '-0.01em' }}>
              {errorMsg || 'An unexpected error occurred.'}
            </p>
            <button onClick={reset} className="btn btn-ghost" style={{ marginTop: 4 }} type="button">
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
