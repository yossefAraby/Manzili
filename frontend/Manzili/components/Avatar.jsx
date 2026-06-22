'use client'
import Image from 'next/image'

// A small fixed palette; the colour is picked deterministically from the name so
// the same person always gets the same colour.
const COLORS = [
  '#1c355e', '#2582eb', '#e67e22', '#16a34a', '#9333ea',
  '#dc2626', '#0891b2', '#ca8a04', '#db2777', '#4f46e5',
]

function colorFor(name) {
  const s = String(name || '?')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

function isRealSrc(src) {
  return typeof src === 'string' && src.trim() !== '' && !src.includes('placeholder')
}

/**
 * Avatar — shows the user's photo when set, otherwise a coloured circle with the
 * first letter of their name (deterministic colour per name). Used for the buyer
 * and seller across the platform; the default is generated, never a stock image.
 */
export default function Avatar({ name, src, size = 32, className = '' }) {
  const initial = (String(name || '').trim().charAt(0) || '?').toUpperCase()
  const box = { width: size, height: size }

  if (isRealSrc(src)) {
    return (
      <span className={`inline-block rounded-full overflow-hidden bg-slate-100 shrink-0 ${className}`} style={box}>
        <Image
          src={src}
          alt={name || ''}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized={src.startsWith('data:')}
        />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white font-semibold select-none shrink-0 ${className}`}
      style={{ ...box, backgroundColor: colorFor(name), fontSize: Math.round(size * 0.45) }}
      aria-label={name || ''}
      title={name || ''}
    >
      {initial}
    </span>
  )
}
