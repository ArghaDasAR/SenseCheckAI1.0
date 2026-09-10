import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import LogoMark from './LogoMark'

const NAV_LINKS = [
  { label: 'How It Works', to: '/scroll-writing',               anchor: null },
  { label: 'Analyze',      to: '/analyze',                       anchor: null },
  { label: 'Architecture', to: '/scroll-writing#architecture',   anchor: 'architecture' },
  { label: 'About',        to: '/#about-section',                anchor: 'about-section' },
]

export default function Navbar({ ctaLabel = 'Analyze Now', ctaHref = '/analyze' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()
  const burgerRef = useRef(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 901) closeMenu() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [closeMenu])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeMenu])

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    return () => document.body.classList.remove('menu-open')
  }, [menuOpen])

  /**
   * Handle nav link clicks:
   * - Same page with hash → smooth scroll
   * - Cross-page with hash → navigate then scroll
   * - No hash → normal navigation
   */
  const handleLinkClick = useCallback((e, link) => {
    closeMenu()

    if (!link.anchor) return // let <Link> handle it normally

    e.preventDefault()

    const { pathname } = location
    const [basePath]   = link.to.split('#')
    const targetPath   = basePath || '/'

    const scrollToAnchor = () => {
      setTimeout(() => {
        const el = document.getElementById(link.anchor)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }

    if (pathname === targetPath || (targetPath === '/' && pathname === '/')) {
      scrollToAnchor()
    } else {
      navigate(targetPath)
      scrollToAnchor()
    }
  }, [location, navigate, closeMenu])

  return (
    <>
      {/* BACKDROP */}
      <div className="menu-backdrop" onClick={closeMenu} aria-hidden="true" />

      <header className={`header${scrolled ? ' header--scrolled' : ''}`}>

      {/* LEFT — LOGO */}
      <Link
        to="/"
        className="logo appear appear--scale"
        aria-label="Sense Check.ai — Home"
      >
        <LogoMark />
        <span>Sense Check<span className="logo-suffix">.ai</span></span>
      </Link>

      {/* CENTER — NAV */}
      <nav id="site-nav" aria-label="Primary navigation" role="navigation">
        {NAV_LINKS.map((link, i) => {
          const animClass = i % 2 === 0 ? 'appear--scale' : 'appear--soft'
          return (
            <Link
              key={link.label}
              to={link.to}
              className={`appear ${animClass}`}
              onClick={(e) => handleLinkClick(e, link)}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* RIGHT — CTA */}
      <Link
        to={ctaHref}
        className="btn btn-solid header-cta appear appear--scale"
      >
        {ctaLabel}
      </Link>

      {/* BURGER */}
      <button
        ref={burgerRef}
        className="burger appear appear--scale"
        aria-controls="site-nav"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setMenuOpen(p => !p)}
        type="button"
      >
        <div className="bar" />
        <div className="bar" />
        <div className="bar" />
      </button>
    </header>
    </>
  )
}
