'use client'

import { categories } from '@/assets/assets'
import Link from 'next/link'
import { useState } from 'react'

/**
 * Hero category strip — continuous left-drifting marquee.
 *
 * The track is duplicated once (A | A). The CSS keyframe `marqueeScroll`
 * (in globals.css) translates the whole track from 0% to -50%, i.e. exactly
 * one copy's width, so the wrap is pixel-identical and invisible.
 *
 * Hover pauses the animation via `animation-play-state: paused` — no JS
 * transform reads, no freeze/resume math, no manual drag/arrows. The
 * previous implementation tried to capture the current translateX on
 * pointer-leave and re-attach the animation from that offset; the round-trip
 * through `getComputedStyle` + a negative-delay restart introduced a visible
 * "teleport" because the read frame and the resume frame were never quite
 * the same. Letting the browser keep the animation running and just toggling
 * play-state is glitch-free.
 */

const MARQUEE_DURATION = 40

const CategoriesMarquee = () => {
    const [paused, setPaused] = useState(false)

    const renderChips = (copyKey) => (
        <div key={copyKey} className="flex gap-3 shrink-0 pr-3" aria-hidden={copyKey === 'b' ? 'true' : undefined}>
            {categories.map((cat) => (
                <Link
                    key={`${copyKey}-${cat}`}
                    href={`/shop?category=${encodeURIComponent(cat)}`}
                    draggable={false}
                    tabIndex={copyKey === 'a' ? 0 : -1}
                    className="shrink-0 px-5 py-2 bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm font-medium hover:bg-slate-600 hover:text-white active:scale-95 transition-colors duration-300 whitespace-nowrap"
                >
                    {cat}
                </Link>
            ))}
        </div>
    )

    return (
        <div className="relative max-w-7xl mx-auto select-none sm:my-20 my-10">
            <div className="absolute left-0 top-0 h-full w-12 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />

            <div
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                className="overflow-hidden no-scrollbar px-6 py-2"
                role="list"
            >
                <div
                    className="flex w-max will-change-transform"
                    style={{
                        animation: `marqueeScroll ${MARQUEE_DURATION}s linear infinite`,
                        animationPlayState: paused ? 'paused' : 'running',
                    }}
                >
                    {renderChips('a')}
                    {renderChips('b')}
                </div>
            </div>

            <div className="absolute right-0 top-0 h-full w-16 sm:w-32 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />
        </div>
    )
}

export default CategoriesMarquee
