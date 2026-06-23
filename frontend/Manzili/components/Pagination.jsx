'use client'
import { useTranslate } from '@/lib/i18n/LocaleContext'

export default function Pagination({
    currentPage,
    totalPages,
    onChange,
    pageSize,
    onPageSizeChange,
    pageSizeOptions = [12, 24, 48],
}) {
    const t = useTranslate();
    const showPageSize = typeof onPageSizeChange === 'function' && pageSize != null
    // Nothing to page through AND no page-size control → render nothing.
    if (totalPages <= 1 && !showPageSize) return null

    const pages = []
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
    const end = Math.min(totalPages, start + 4)
    for (let i = start; i <= end; i++) pages.push(i)

    const btn = 'px-3 py-1.5 rounded-lg border text-sm transition'
    const active = 'bg-slate-800 text-white border-slate-800'
    const inactive = 'border-slate-200 text-slate-600 hover:bg-slate-50'
    const disabled = 'border-slate-100 text-slate-300 cursor-not-allowed'

    // Page-size selector — lets the shopper change how many items load per page,
    // right at the navigator. Each change refetches just that page from the server.
    const pageSizeControl = showPageSize ? (
        <label className="flex items-center gap-2 text-xs text-slate-500">
            {t('pagination.perPage')}
            <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-slate-400"
            >
                {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>{n}</option>
                ))}
            </select>
        </label>
    ) : null

    // When there's only a single page, just show the page-size selector (no page buttons).
    if (totalPages <= 1) {
        return (
            <div className="flex items-center justify-center gap-1.5 mt-10 mb-8 flex-wrap">
                {pageSizeControl}
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center gap-1.5 mt-10 mb-8 flex-wrap">
            <button
                onClick={() => onChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`${btn} ${currentPage === 1 ? disabled : inactive}`}
            >
                {t('pagination.prev')}
            </button>

            {start > 1 && (
                <>
                    <button onClick={() => onChange(1)} className={`${btn} ${inactive}`}>1</button>
                    {start > 2 && <span className="text-slate-400 px-1">…</span>}
                </>
            )}

            {pages.map(p => (
                <button key={p} onClick={() => onChange(p)}
                    className={`${btn} ${p === currentPage ? active : inactive}`}>
                    {p}
                </button>
            ))}

            {end < totalPages && (
                <>
                    {end < totalPages - 1 && <span className="text-slate-400 px-1">…</span>}
                    <button onClick={() => onChange(totalPages)} className={`${btn} ${inactive}`}>{totalPages}</button>
                </>
            )}

            <button
                onClick={() => onChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`${btn} ${currentPage === totalPages ? disabled : inactive}`}
            >
                {t('pagination.next')}
            </button>

            <span className="text-xs text-slate-400 ml-2">{t('pagination.page', { current: currentPage, total: totalPages })}</span>
        </div>
    )
}
