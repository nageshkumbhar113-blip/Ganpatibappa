'use client'

import { useEffect, useState } from 'react'

interface Props {
  images: string[]
  intervalMs?: number
}

/**
 * Auto-rotating background for the hero section. Renders nothing (parent
 * keeps its gradient/overlay/content) when there is only one image or none —
 * a single banner doesn't need carousel machinery, and the caller already
 * has a static <img>/background-image fallback for that case.
 */
export function HeroCarousel({ images, intervalMs = 4500 }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (images.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), intervalMs)
    return () => clearInterval(t)
  }, [images.length, intervalMs])

  if (images.length === 0) return null

  return (
    <>
      {images.map((src, i) => (
        <div
          key={src + i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${src})`, opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </>
  )
}
