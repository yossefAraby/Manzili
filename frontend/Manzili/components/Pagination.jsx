'use client'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import { useTranslate } from '@/lib/i18n/LocaleContext'

/**
 * Clean numbered pager. The current page is fully controlled by the parent (the shop keeps it in
 * the URL as ?page=N, so pages are shareable and the back/forward buttons work).
 *
 * Renders:
 *   - an item-count summary ("Showing 1–12 of 37") when `totalItems` is supplied, and
 *   - First ‹ Prev | 1 … p-1 p p+1 … N | Next › Last  — whenever there's more than one page.
 *
 * Props: page (or legacy `currentPage`), totalPages, totalItems?, pageSize?, onChange(nextPage).
 * Back-compatible with the older call sites that pass only { currentPage, totalPages, onChange }.
 */
export default function Pagination({ page, currentPage, totalPages = 1, totalItems = 0, pageSize = 12, onChange }) {
    const t = useTranslate()

    const tp = Math.max(1, totalPages)
    const current = Math.min(Math.max(1, page ?? currentPage ?? 1), tp)
    const hasCount = Number(totalItems) > 0

    // Nothing to show at all → render nothing.
    if (!hasCount && tp <= 1) return null

    const from = (current - 1) * pageSize + 1
    const to = Math.min(totalItems, current * pageSize)

    // Compact window with ellipses: 1 … p-1 p p+1 … N
    const win = []
    if (tp <= 7) {
        for (let i = 1; i <= tp; i++) win.push(i)
    } else {
        win.push(1)
        const s = Math.max(2, current - 1)
        const e = Math.min(tp - 1, current + 1)
        if (s > 2) win.push('…')
        for (let i = s; i <= e; i++) win.push(i)
        if (e < tp - 1) win.push('…')
        win.push(tp)
    }

    const go = (p) => {
        const next = Math.min(tp, Math.max(1, p))
        if (next !== current) onChange(next)
    }

    const nav = 'w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition'
    const num = (p) =>
        `min-w-9 h-9 px-3 inline-flex items-center justify-center rounded-lg text-sm font-medium transition ${p === current ? 'bg-[#1c355e] text-white' : 'text-slate-600 hover:bg-slate-100'}`

    return (
        <div className="mt-10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            {hasCount
                ? <p className="text-sm text-slate-500">{t('pagination.showing', { from, to, total: totalItems })}</p>
                : <span aria-hidden="true" />}

            {tp > 1 && (
                <nav className="flex items-center gap-1" aria-label="Pagination">
                    <button type="button" className={nav} onClick={() => go(1)} disabled={current === 1} aria-label="First page"><ChevronsLeftIcon size={16} /></button>
                    <button type="button" className={nav} onClick={() => go(current - 1)} disabled={current === 1} aria-label="Previous page"><ChevronLeftIcon size={16} /></button>
                    {win.map((p, i) => p === '…'
                        ? <span key={`e${i}`} className="px-1.5 text-slate-400 select-none">…</span>
                        : <button type="button" key={p} className={num(p)} onClick={() => go(p)} aria-current={p === current ? 'page' : undefined}>{p}</button>
                    )}
                    <button type="button" className={nav} onClick={() => go(current + 1)} disabled={current === tp} aria-label="Next page"><ChevronRightIcon size={16} /></button>
                    <button type="button" className={nav} onClick={() => go(tp)} disabled={current === tp} aria-label="Last page"><ChevronsRightIcon size={16} /></button>
                </nav>
            )}
        </div>
    )
}
