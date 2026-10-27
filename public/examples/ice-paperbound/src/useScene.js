import { useLayoutEffect } from 'react'
import { gsap } from './vendor/gsap.js'

// @gsap/react's scoped lifecycle, without adding a global runtime dependency.
export function useGSAP(setup, { scope }) {
  useLayoutEffect(() => {
    const context = gsap.context(setup, scope)
    return () => context.revert()
  }, [scope])
}
