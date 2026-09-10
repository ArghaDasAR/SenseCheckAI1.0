import { useEffect, useRef } from 'react'

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF<>{}|/\\#@!%^&*'

/**
 * MatrixRain — canvas-based falling character animation.
 * Shows green digital rain, stylised like classic cyberpunk terminals.
 *
 * @param {boolean} active  - play when true
 * @param {number}  opacity - overlay opacity (default 0.18)
 */
export default function MatrixRain({ active = false, opacity = 0.18, className = '' }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const dropsRef  = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const FONT_SIZE = 13

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const cols = Math.floor(canvas.width / FONT_SIZE)
      dropsRef.current = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * (canvas.height / FONT_SIZE))
      )
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = () => {
      if (!active) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      // Fade trail
      ctx.fillStyle = 'rgba(0, 4, 2, 0.07)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${FONT_SIZE}px 'Courier New', monospace`

      dropsRef.current.forEach((y, col) => {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const x    = col * FONT_SIZE

        // Head character — brightest
        const isHead = y === dropsRef.current[col]
        ctx.fillStyle = isHead ? '#afffcc' : `rgba(0, 255, 65, ${Math.random() * 0.5 + 0.3})`
        ctx.fillText(char, x, y * FONT_SIZE)

        // Reset column randomly
        if (y * FONT_SIZE > canvas.height && Math.random() > 0.975) {
          dropsRef.current[col] = 0
        } else {
          dropsRef.current[col]++
        }
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: active ? opacity : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.8s ease',
        display: 'block',
      }}
      aria-hidden="true"
    />
  )
}
