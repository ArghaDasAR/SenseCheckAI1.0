import { useEffect, useRef } from 'react'

/**
 * useAppearAnimation — mirrors the IIFE animation-fallback logic
 * from the original index.html.
 *
 * On mount:
 *  1. Adds animationend listener to each .appear element → adds .is-in
 *  2. After 2 rAFs, if no animation is running, force .is-in on all
 */
export function useAppearAnimation() {
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const appears    = document.querySelectorAll('.appear')
    const heroPhoto  = document.querySelector('.hero-photo')

    // 1. animationend listener
    appears.forEach(el => {
      el.addEventListener('animationend', () => el.classList.add('is-in'), { once: true })
    })
    if (heroPhoto) {
      heroPhoto.addEventListener('animationend', () => heroPhoto.classList.add('is-in'), { once: true })
    }

    // 2. Fallback — force is-in if browser doesn't run animations
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let hasRunning = false
        if (appears.length > 0) {
          const anims = appears[0].getAnimations?.() ?? []
          if (anims.some(a => a.playState === 'running' || a.playState === 'finished')) {
            hasRunning = true
          }
        }
        if (!hasRunning) {
          appears.forEach(el => el.classList.add('is-in'))
          if (heroPhoto) heroPhoto.classList.add('is-in')
        }
      })
    })
  }, [])
}
