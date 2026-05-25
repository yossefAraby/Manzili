'use client'
import { useTranslate } from '@/lib/i18n/LocaleContext'

// Roles for each team member. Names render RTL so they look right; the role
// itself stays LTR (English) since the team uses both languages day-to-day.
const team = [
    { name: "يوسف محمد السيد", role: "Team Leader / Project Orchestrator & Frontend Dev" },
    { name: "عبد الرحمن محمد", role: "Technical Lead & Backend Dev" },
    { name: "محمود ناجي ناجي", role: "Data Analyst (Formerly Mobile Dev)" },
    { name: "فارس هيثم احمد", role: "Frontend Dev" },
    { name: "احمد السيد احمد", role: "Data Analyst" },
    { name: "محمد عبد القادر عبدربه", role: "Backend Dev" },
    { name: "نور محمد عصمت", role: "Data Analyst" },
    { name: "محمود أحمد محمود", role: "Data Analyst" },
    { name: "علي السيد احمد", role: "Backend Dev" },
    { name: "ادهم صلاح السيد", role: "Data Analyst" },
    { name: "مروان محمود عبد السالم", role: "Data Analyst (Formerly Mobile Dev)" },
    { name: "يحيى محمد شحاته", role: "UI/UX Designer" },
    { name: "يوسف محمد عبد الحكيم", role: "Database Dev" },
]

export default function AboutPage() {
    const t = useTranslate()

    return (
        <div className="mx-6">
            <div className="max-w-3xl mx-auto py-12">
                <h1 className="text-2xl text-slate-500 mb-8">
                    {t('about.title')} <span className="text-slate-800 font-medium">Manzili</span>
                </h1>

                <p className="text-slate-700 leading-relaxed mb-10">
                    {t('about.description')}
                </p>

                <h2 className="text-lg font-medium text-slate-800 mb-4">{t('about.team')}</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {team.map(({ name, role }) => (
                        <li
                            key={name}
                            className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
                        >
                            <p className="text-slate-800 font-medium" dir="rtl">{name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{role}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
