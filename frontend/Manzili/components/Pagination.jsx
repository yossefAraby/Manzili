'use client'
import { useTranslate } from '@/lib/i18n/LocaleContext'

export default function Pagination({ currentPage, totalPages, onChange }) {
    const t = useTranslate();
    if (totalPages <= 1) return null

    const pages = []
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
    const end = Math.min(totalPages, start + 4)
    for (let i = start; i <= end; i++) pages.push(i)

    const btn = 'px-3 py-1.5 rounded-lg border text-sm transition'
    const active = 'bg-slate-800 text-white border-slate-800'
    const inactive = 'border-slate-200 text-slate-600 hover:bg-slate-50'
    const disabled = 'border-slate-100 text-slate-300 cursor-not-allowed'

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
