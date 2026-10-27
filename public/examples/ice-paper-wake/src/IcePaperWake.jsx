import { useEffect, useRef } from 'react'
import { createIcePaperWake } from './gl/standalone.js'
import { connectParameters } from './parameters.js'

export default function IcePaperWake({ imageUrl }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const wake = createIcePaperWake(canvasRef.current, { imageUrl })
    const disconnect = connectParameters(wake.config)
    return () => { disconnect(); wake.dispose() }
  }, [imageUrl])

  return <section className="wake-stage"><div className="wake-shell"><canvas ref={canvasRef} className="wake-canvas" aria-label="Interactive paper wake" /></div><p className="wake-caption">Move the pointer across the paper</p></section>
}
