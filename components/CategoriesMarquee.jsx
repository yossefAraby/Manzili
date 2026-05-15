'use client'

import { categories } from '@/assets/assets'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

/**
 * Hero category strip. Three behaviours have to coexist without fighting:
 *
 *   1. Continuous left-drifting marquee when idle.
 *   2. Drag-to-pan with the cursor (and touch) at any time.
 *   3. Each chip is a real <Link> to /shop?category=… so click still
 *      navigates — unless the click is the tail of a drag, then we eat it.
 *
 * Implementation:
 *   - The track is duplicated once (A | A). The CSS keyframe
 *     `marqueeScroll` (defined in globals.css) translates the whole track
 *     from 0% to -50%, i.e. exactly one copy's width, so the wrap is
 *     pixel-identical and invisible.
 *   - When the user grabs the strip we read the current animated transform
 *     via getComputedStyle, freeze it as an inline transform, disable the
 *     animation, then update the inline transform on pointer move. On
 *     release we re-attach the animation starting from the dragged offset
 *     (negative-delay trick) so it continues smoothly from where the user
 *     left it instead of snapping back to 0.
 *   - The outer container has overflow-hidden so there's no scrollbar to
 *     hide in the first place; the inner track is transformed, not scrolled.
 */

// Seconds for one full copy to traverse. Lower = faster.
const MARQUEE_DURATION = 40

const CategoriesMarquee = () => {
    const trackRef = useRef(null)
    const containerRef = useRef(null)
    const dragRef = useRef({
        active: false,
        startX: 0,
        startOffset: 0,
        offset: 0,
        moved: 0,
        copyWidth: 0,
    })
    const [paused, setPaused] = useState(false)
    const [showArrows, setShowArrows] = useState(false)

    // Show side arrows only when the chip row would actually overflow.
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const update = () => setShowArrows(el.scrollWidth > el.clientWidth + 4)
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    // Read the live translateX the animation has reached right now.
    const readCurrentTranslateX = () => {
        const el = trackRef.current
        if (!el) return 0
        const t = getComputedStyle(el).transform
        if (!t || t === 'none') return 0
        // matrix(a, b, c, d, tx, ty) or matrix3d(...) — we only need tx.
        const m = t.match(/matrix\(([^)]+)\)/) || t.match(/matrix3d\(([^)]+)\)/)
        if (!m) return 0
        const parts = m[1].split(',').map((v) => parseFloat(v))
        // 2d matrix has tx at index 4; 3d matrix has tx at index 12.
        return parts.length === 6 ? parts[4] : parts[12] || 0
    }

    const measureCopyWidth = () => {
        const el = trackRef.current
        if (!el) return 0
        // Track holds two copies side-by-side; one copy = half the track width.
        return el.scrollWidth / 2
    }

    const freezeAtCurrent = () => {
        const el = trackRef.current
        if (!el) return 0
        const tx = readCurrentTranslateX()
        el.style.animation = 'none'
        el.style.transform = `translateX(${tx}px)`
        return tx
    }

    const resumeAnimationFrom = (offsetPx) => {
        const el = trackRef.current
        if (!el) return
        const copyWidth = measureCopyWidth() || 1
        // The keyframe runs 0 → -copyWidth. Compute the negative delay that
        // places the animation's "current" frame at offsetPx so it picks up
        // exactly where the drag left off.
        const normalized = ((offsetPx % copyWidth) + copyWidth) % copyWidth // 0..copyWidth
        const progress = normalized / copyWidth // 0..1 (of one cycle, but our keyframe is 0..-50% of total which == one copy)
        const delaySec = -progress * MARQUEE_DURATION
        el.style.transform = ''
        el.style.animation = `marqueeScroll ${MARQUEE_DURATION}s linear ${delaySec}s infinite`
    }

    const onPointerDown = (e) => {
        const el = trackRef.current
        if (!el) return
        const tx = freezeAtCurrent()
        dragRef.current = {
            active: true,
            startX: e.clientX,
            startOffset: tx,
            offset: tx,
            moved: 0,
            copyWidth: measureCopyWidth(),
        }
        containerRef.current?.setPointerCapture?.(e.pointerId)
        containerRef.current?.classList.add('cursor-grabbing')
    }

    const onPointerMove = (e) => {
        const d = dragRef.current
        if (!d.active) return
        const dx = e.clientX - d.startX
        d.moved = Math.max(d.moved, Math.abs(dx))
        let next = d.startOffset + dx
        // Wrap within [-copyWidth, 0] so we can drag forever in either dir.
        const cw = d.copyWidth || 1
        if (next > 0) next -= cw
        if (next < -cw) next += cw
        d.offset = next
        const el = trackRef.current
        if (el) el.style.transform = `translateX(${next}px)`
    }

    const endDrag = (e) => {
        const d = dragRef.current
        if (!d.active) return
        d.active = false
        containerRef.current?.releasePointerCapture?.(e.pointerId)
        containerRef.current?.classList.remove('cursor-grabbing')
        // Only resume if we're not currently hovered-paused; otherwise keep
        // the inline transform and let onPointerLeave resume it.
        if (!paused) resumeAnimationFrom(d.offset)
    }

    const onPointerEnter = () => {
        setPaused(true)
        // Freeze the marquee in place so hovering feels intentional.
        if (!dragRef.current.active) freezeAtCurrent()
    }

    const onPointerLeave = (e) => {
        setPaused(false)
        if (dragRef.current.active) {
            endDrag(e)
            return
        }
        // Resume from wherever it was frozen.
        const el = trackRef.current
        if (!el) return
        const tx = readCurrentTranslateX()
        resumeAnimationFrom(tx)
    }

    // Eat the click that fires after a real drag so the chip doesn't navigate.
    const onClickCapture = (e) => {
        if (dragRef.current.moved > 4) {
            e.preventDefault()
            e.stopPropagation()
            dragRef.current.moved = 0
        }
    }

    // Arrow buttons nudge the strip by adjusting the inline offset.
    const nudge = (delta) => {
        const el = trackRef.current
        if (!el) return
        const tx = freezeAtCurrent()
        const cw = measureCopyWidth() || 1
        let next = tx + delta
        if (next > 0) next -= cw
        if (next < -cw) next += cw
        el.style.transition = 'transform 400ms ease-out'
        el.style.transform = `translateX(${next}px)`
        // After the smooth nudge, re-attach the animation from the new offset.
        window.setTimeout(() => {
            el.style.transition = ''
            if (!paused) resumeAnimationFrom(next)
        }, 420)
    }

    const renderChips = (copyKey) => (
        <div key={copyKey} className="flex gap-3 shrink-0 pr-3" aria-hidden={copyKey === 'b' ? 'true' : undefined}>
            {categories.map((cat) => (
                <Link
                    key={`${copyKey}-${cat}`}
                    href={`/shop?category=${encodeURIComponent(cat)}`}
                    draggable={false}
                    tabIndex={copyKey === 'a' ? 0 : -1}
                    className="shrink-0 px-5 py-2 bg-slate-100 rounded-lg text-slate-500 text-xs sm:text-sm font-medium hover:bg-slate-600 hover:text-white active:scale-95 transition-all duration-300 whitespace-nowrap"
                >
                    {cat}
                </Link>
            ))}
        </div>
    )

    return (
        <div className="relative max-w-7xl mx-auto select-none sm:my-20 my-10">
            {showArrows && (
                <button
                    type="button"
                    onClick={() => nudge(240)}
                    aria-label="Scroll categories left"
                    className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 transition"
                >
                    <ChevronLeftIcon size={18} />
                </button>
            )}

            <div className="absolute left-0 top-0 h-full w-12 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent" />

            <div
                ref={containerRef}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClickCapture={onClickCapture}
                className="overflow-hidden no-scrollbar px-6 py-2 cursor-grab"
                role="list"
            >
                <div
                    ref={trackRef}
                    className="flex w-max will-change-transform"
                    style={{ animation: `marqueeScroll ${MARQUEE_DURATION}s linear infinite` }}
                >
                    {renderChips('a')}
                    {renderChips('b')}
                </div>
            </div>

            <div className="absolute right-0 top-0 h-full w-16 sm:w-32 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent" />

            {showArrows && (
                <button
                    type="button"
                    onClick={() => nudge(-240)}
                    aria-label="Scroll categories right"
                    className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 transition"
                >
                    <ChevronRightIcon size={18} />
                </button>
            )}
        </div>
    )
}

export default CategoriesMarquee
