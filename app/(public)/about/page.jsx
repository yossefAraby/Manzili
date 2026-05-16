'use client'

const team = [
    "يوسف محمد السيد",
    "عبد الرحمن محمد",
    "محمود ناجي ناجي",
    "فارس هيثم احمد",
    "احمد السيد احمد",
    "محمد عبد القادر",
    "نور محمد عصمت",
    "محمود أحمد محمود",
    "علي السيد احمد",
    "ادهم صلاح السيد",
    "مروان محمود عبد",
    "يحيى محمد شحاته",
    "يوسف محمد عبد",
]

export default function AboutPage() {
    return (
        <div className="mx-6">
            <div className="max-w-3xl mx-auto py-12">
                <h1 className="text-2xl text-slate-500 mb-8">
                    About <span className="text-slate-800 font-medium">Manzili</span>
                </h1>

                <p className="text-slate-700 leading-relaxed mb-10">
                    Manzili is a multi-vendor marketplace dedicated to handmade products. Built as an MIS
                    graduation project under the supervision of Dr. Abeer, it connects Egyptian artisans
                    with buyers who value handcrafted work — through a curated gallery of ready-to-buy
                    pieces and a custom-commission portal for bespoke requests.
                </p>

                <h2 className="text-lg font-medium text-slate-800 mb-4">Team</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-slate-700" dir="rtl">
                    {team.map((name) => (
                        <li key={name} className="py-1 border-b border-slate-100 last:border-0">
                            {name}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
