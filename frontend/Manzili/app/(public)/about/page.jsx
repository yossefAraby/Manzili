'use client'

import Link from "next/link"
import {
    Sparkles,
    PenTool,
    HandHeart,
    Truck,
    ShieldCheck,
    Compass,
    PackageCheck,
    Quote,
} from "lucide-react"
import { useLocale } from "@/lib/i18n/LocaleContext"

// Real team members. Names always render RTL so they look right; the role label
// is translated per-locale below.
const teamMembers = [
    { name: "يوسف محمد السيد", roleKey: "leader" },
    { name: "عبد الرحمن محمد", roleKey: "techLead" },
    { name: "محمود ناجي ناجي", roleKey: "dataFormerlyMobile" },
    { name: "فارس هيثم احمد", roleKey: "frontend" },
    { name: "احمد السيد احمد", roleKey: "data" },
    { name: "محمد عبد القادر عبدربه", roleKey: "backend" },
    { name: "نور محمد عصمت", roleKey: "data" },
    { name: "محمود أحمد محمود", roleKey: "data" },
    { name: "علي السيد احمد", roleKey: "backend" },
    { name: "ادهم صلاح السيد", roleKey: "data" },
    { name: "مروان محمود عبد السالم", roleKey: "dataFormerlyMobile" },
    { name: "يحيى محمد شحاته", roleKey: "designer" },
    { name: "يوسف محمد عبد الحكيم", roleKey: "database" },
]

const content = {
    en: {
        roles: {
            leader: "Team Leader / Project Orchestrator & Frontend Dev",
            techLead: "Technical Lead & Backend Dev",
            dataFormerlyMobile: "Data Analyst (Formerly Mobile Dev)",
            frontend: "Frontend Dev",
            data: "Data Analyst",
            backend: "Backend Dev",
            designer: "UI/UX Designer",
            database: "Database Dev",
        },
        heroTitlePre: "The marketplace where genuine",
        heroTitleAccent: "Egyptian handmade craft",
        heroTitlePost: "finds its home",
        heroSubtitle:
            "Manzili connects independent Egyptian artisans with people who value the real thing. Discover one-of-a-kind handmade pieces, commission bespoke creations made just for you, and have it all delivered to your door — securely and with care.",
        ctaExplore: "Explore the marketplace",
        ctaBespoke: "Request a bespoke item",
        storyTitle: "Our story",
        storyTagline: "Manzili means “my home.”",
        storyP1:
            "Across Egypt, talented makers shape beautiful things by hand — carving wood, weaving textiles, blending fragrances, glazing porcelain. Too often that work stays hidden in small workshops, undersold to middlemen or lost in a sea of mass-produced imitations online.",
        storyP2:
            "We built Manzili to change that. It is a home for genuine handmade craft — a place where every piece is authentic, every maker is local, and every customer knows exactly who made what they're buying and why it matters.",
        storyP3:
            "Our mission is simple: give Egyptian artisans a fair, modern marketplace, and give the people who love their work a trustworthy place to find it.",
        diffTitlePre: "What makes",
        diffTitlePost: "different",
        diffSubtitle:
            "A marketplace built around the maker — and around trust on every side of the sale.",
        differentiators: [
            {
                icon: HandHeart,
                title: "Genuine handmade only",
                description:
                    "Every listing on Manzili is made by hand by a real Egyptian maker. No mass-produced imports, no drop-shipped filler — just authentic craft with a story behind it.",
            },
            {
                icon: PenTool,
                title: "Customize this for me",
                description:
                    "Love a piece but want it your way? Start a bespoke request, share your idea and references, and work directly with the artisan to shape a one-of-a-kind order from price to finish.",
            },
            {
                icon: Sparkles,
                title: "Local artisans, front and centre",
                description:
                    "We put independent Egyptian craftspeople in front of customers who value their work — giving small workshops their own storefront and a fair share of every sale.",
            },
            {
                icon: Truck,
                title: "Bosta-tracked delivery",
                description:
                    "Orders ship through Bosta with live tracking from the workshop to your door, so you always know exactly where your handmade piece is on its way to you.",
            },
            {
                icon: ShieldCheck,
                title: "Secure Stripe payments",
                description:
                    "Checkout is handled by Stripe with encrypted, PCI-compliant payments. Your card details never touch our servers — buy and sell with confidence.",
            },
        ],
        howTitle: "How it works",
        howSubtitle:
            "From the first browse to the knock on your door — three simple steps.",
        howItWorks: [
            {
                step: "01",
                icon: Compass,
                title: "Discover",
                description:
                    "Browse curated collections of genuine Egyptian handmade craft — woodwork, textiles, fragrances, porcelain and more — from makers across the country.",
            },
            {
                step: "02",
                icon: PenTool,
                title: "Customize or order",
                description:
                    "Buy a ready-made piece, or send a “Customize this for me” request and collaborate with the maker on a bespoke creation built just for you.",
            },
            {
                step: "03",
                icon: PackageCheck,
                title: "Track & receive",
                description:
                    "Pay securely with Stripe, then follow your Bosta shipment in real time until your handmade order arrives safely at your door.",
            },
        ],
        quote:
            "Real hands, real materials, real stories — handmade in Egypt, delivered with care.",
        values: [
            {
                title: "Authenticity",
                description:
                    "If it isn't truly handmade, it doesn't belong on Manzili. We protect the meaning of the word.",
            },
            {
                title: "Fairness",
                description:
                    "Makers set their own prices and keep the lion's share. A fair marketplace is a lasting one.",
            },
            {
                title: "Craft heritage",
                description:
                    "Egyptian craft carries generations of skill. We help keep that tradition alive and earning.",
            },
        ],
        stats: [
            { value: "100%", label: "Genuine handmade" },
            { value: "7", label: "Craft categories" },
            { value: "Bosta", label: "Tracked delivery" },
            { value: "Stripe", label: "Secure payments" },
        ],
        teamTitle: "The team behind Manzili",
        teamSubtitle:
            "A graduation project built by a group of students who believe Egyptian craft deserves a home of its own online.",
    },
    ar: {
        roles: {
            leader: "قائد الفريق / منسّق المشروع ومطوّر واجهات أمامية",
            techLead: "قائد تقني ومطوّر خلفية",
            dataFormerlyMobile: "محلّل بيانات (سابقًا مطوّر تطبيقات موبايل)",
            frontend: "مطوّر واجهات أمامية",
            data: "محلّل بيانات",
            backend: "مطوّر خلفية",
            designer: "مصمّم تجربة وواجهة المستخدم",
            database: "مطوّر قواعد بيانات",
        },
        heroTitlePre: "السوق الذي تجد فيه",
        heroTitleAccent: "المشغولات اليدوية المصرية الأصيلة",
        heroTitlePost: "بيتها",
        heroSubtitle:
            "منزلي يربط الحرفيين المصريين المستقلين بمن يقدّرون الأصالة. اكتشف قطعًا يدوية فريدة، واطلب تصاميم مُفصّلة خصيصًا لك، واستلمها أمام باب بيتك — بأمان وعناية.",
        ctaExplore: "استكشف السوق",
        ctaBespoke: "اطلب قطعة حسب طلبك",
        storyTitle: "قصتنا",
        storyTagline: "منزلي تعني «بيتي».",
        storyP1:
            "في كل أنحاء مصر، يصنع حرفيون موهوبون أشياء جميلة بأيديهم — ينحتون الخشب، وينسجون الأقمشة، ويمزجون العطور، ويزخرفون الخزف. وكثيرًا ما يظل هذا العمل مخفيًا في ورش صغيرة، يُباع بأقل من قيمته للوسطاء أو يضيع وسط بحرٍ من المقلّدات المنتَجة بكميات كبيرة على الإنترنت.",
        storyP2:
            "أنشأنا منزلي لنغيّر ذلك. إنه بيتٌ للمشغولات اليدوية الأصيلة — مكان تكون فيه كل قطعة حقيقية، وكل صانع محلّيًا، ويعرف فيه كل عميل بالضبط من صنع ما يشتريه ولماذا له قيمة.",
        storyP3:
            "رسالتنا بسيطة: أن نمنح الحرفيين المصريين سوقًا عادلة وعصرية، وأن نمنح من يحبّون أعمالهم مكانًا موثوقًا يجدونها فيه.",
        diffTitlePre: "ما الذي يميّز",
        diffTitlePost: "",
        diffSubtitle:
            "سوقٌ مبنيّ حول الصانع — وحول الثقة في كل جانب من جوانب البيع.",
        differentiators: [
            {
                icon: HandHeart,
                title: "مشغولات يدوية أصيلة فقط",
                description:
                    "كل منتج على منزلي مصنوع يدويًا على يد صانع مصري حقيقي. لا واردات منتَجة بكميات كبيرة، ولا قطع وسيطة من متاجر دروبشيبينغ — مجرد حِرفة أصيلة لها قصة.",
            },
            {
                icon: PenTool,
                title: "صمّمها لي حسب طلبي",
                description:
                    "أعجبتك قطعة لكنك تريدها على ذوقك؟ ابدأ طلبًا مُفصّلًا، وشارك فكرتك وصورك المرجعية، واعمل مباشرةً مع الحرفي لتشكيل طلب فريد من السعر حتى اللمسة الأخيرة.",
            },
            {
                icon: Sparkles,
                title: "الحرفيون المحليون في الواجهة",
                description:
                    "نضع الحرفيين المصريين المستقلين أمام العملاء الذين يقدّرون عملهم — مانحين الورش الصغيرة واجهة متجر خاصة بها ونصيبًا عادلًا من كل عملية بيع.",
            },
            {
                icon: Truck,
                title: "توصيل متتبَّع عبر بوسطة",
                description:
                    "تُشحن الطلبات عبر بوسطة مع تتبّع مباشر من الورشة حتى باب بيتك، لتعرف دائمًا أين قطعتك اليدوية في طريقها إليك.",
            },
            {
                icon: ShieldCheck,
                title: "مدفوعات آمنة عبر سترايب",
                description:
                    "يتم الدفع عبر سترايب بمعاملات مشفّرة ومتوافقة مع معايير PCI. بيانات بطاقتك لا تمرّ على خوادمنا أبدًا — اشترِ وبِع بثقة.",
            },
        ],
        howTitle: "كيف يعمل",
        howSubtitle:
            "من أول تصفّح حتى طرقة الباب — ثلاث خطوات بسيطة.",
        howItWorks: [
            {
                step: "٠١",
                icon: Compass,
                title: "اكتشف",
                description:
                    "تصفّح مجموعات منتقاة من المشغولات اليدوية المصرية الأصيلة — أعمال خشبية وأقمشة وعطور وخزف وغيرها — من صنّاع في كل أنحاء البلاد.",
            },
            {
                step: "٠٢",
                icon: PenTool,
                title: "خصّص أو اطلب",
                description:
                    "اشترِ قطعة جاهزة، أو أرسل طلب «صمّمها لي حسب طلبي» وتعاون مع الصانع على تصميم مُفصّل خصيصًا لك.",
            },
            {
                step: "٠٣",
                icon: PackageCheck,
                title: "تتبّع واستلم",
                description:
                    "ادفع بأمان عبر سترايب، ثم تابع شحنتك عبر بوسطة لحظة بلحظة حتى يصل طلبك اليدوي بأمان إلى باب بيتك.",
            },
        ],
        quote:
            "أيادٍ حقيقية، وخامات حقيقية، وقصص حقيقية — صُنع يدويًا في مصر، ووصل إليك بعناية.",
        values: [
            {
                title: "الأصالة",
                description:
                    "إن لم تكن القطعة يدوية حقًّا، فلا مكان لها على منزلي. نحن نحمي معنى هذه الكلمة.",
            },
            {
                title: "العدل",
                description:
                    "الصنّاع يحدّدون أسعارهم بأنفسهم ويحتفظون بالنصيب الأكبر. السوق العادلة هي السوق الباقية.",
            },
            {
                title: "تراث الحِرفة",
                description:
                    "تحمل الحِرفة المصرية مهارة أجيال. نحن نساعد على إبقاء هذا التراث حيًّا ومُربحًا.",
            },
        ],
        stats: [
            { value: "١٠٠٪", label: "يدوي أصيل" },
            { value: "٧", label: "فئات حِرفية" },
            { value: "بوسطة", label: "توصيل متتبَّع" },
            { value: "سترايب", label: "مدفوعات آمنة" },
        ],
        teamTitle: "الفريق وراء منزلي",
        teamSubtitle:
            "مشروع تخرّج بناه مجموعة من الطلاب يؤمنون بأن الحِرفة المصرية تستحق بيتًا خاصًا بها على الإنترنت.",
    },
}

export default function AboutPage() {
    const { locale } = useLocale()
    const isAr = locale === "ar"
    const c = content[isAr ? "ar" : "en"]

    return (
        <div className="bg-[#f4efe4]" dir={isAr ? "rtl" : "ltr"}>
            {/* Hero */}
            <section className="mx-6">
                <div className="max-w-5xl mx-auto py-16 lg:py-24 text-center">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1c355e] leading-tight">
                        {c.heroTitlePre}{" "}
                        <span className="italic font-serif bg-gradient-to-r from-[#e67e22] to-[#d35400] text-transparent bg-clip-text">
                            {c.heroTitleAccent}
                        </span>{" "}
                        {c.heroTitlePost}
                    </h1>

                    <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
                        {c.heroSubtitle}
                    </p>

                    <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href="/"
                            className="rounded-full bg-gradient-to-r from-[#e67e22] to-[#d35400] text-white font-medium px-7 py-3 shadow-sm hover:scale-105 active:scale-95 transition"
                        >
                            {c.ctaExplore}
                        </Link>
                        <Link
                            href="/custom"
                            className="rounded-full bg-white text-[#1c355e] font-medium px-7 py-3 border border-slate-200 shadow-sm hover:border-[#e67e22] hover:text-[#d35400] transition"
                        >
                            {c.ctaBespoke}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Our story / mission */}
            <section className="mx-6">
                <div className="max-w-5xl mx-auto pb-16">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-50 p-8 sm:p-12">
                        <div className="grid lg:grid-cols-3 gap-10 items-start">
                            <div className="lg:col-span-1">
                                <h2 className="text-3xl font-bold text-[#1c355e]">
                                    {c.storyTitle}
                                </h2>
                                <p className="mt-3 text-[#e67e22] font-medium italic font-serif">
                                    {c.storyTagline}
                                </p>
                            </div>
                            <div className="lg:col-span-2 space-y-5 text-slate-600 leading-relaxed">
                                <p>{c.storyP1}</p>
                                <p>{c.storyP2}</p>
                                <p className="text-[#1c355e] font-medium">{c.storyP3}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* What makes Manzili different */}
            <section className="mx-6">
                <div className="max-w-6xl mx-auto pb-16">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-[#1c355e]">
                            {c.diffTitlePre}{" "}
                            <span className="font-sans">
                                <span className="text-[#1c355e]">M</span>
                                <span className="bg-gradient-to-b from-[#e3cda8] to-[#aa804c] text-transparent bg-clip-text">
                                    anzili
                                </span>
                            </span>
                            {c.diffTitlePost ? <> {c.diffTitlePost}</> : null}
                        </h2>
                        <p className="mt-4 text-slate-600 leading-relaxed">
                            {c.diffSubtitle}
                        </p>
                    </div>

                    <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {c.differentiators.map(({ icon: Icon, title, description }) => (
                            <div
                                key={title}
                                className="bg-white rounded-3xl shadow-sm border border-slate-50 p-7 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#faf8f5] border border-slate-100">
                                    <Icon className="w-6 h-6 text-[#e67e22]" />
                                </div>
                                <h3 className="mt-5 text-lg font-semibold text-[#1c355e]">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="mx-6">
                <div className="max-w-6xl mx-auto pb-16">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-[#1c355e]">
                            {c.howTitle}
                        </h2>
                        <p className="mt-4 text-slate-600 leading-relaxed">
                            {c.howSubtitle}
                        </p>
                    </div>

                    <div className="mt-10 grid md:grid-cols-3 gap-6">
                        {c.howItWorks.map(({ step, icon: Icon, title, description }) => (
                            <div
                                key={title}
                                className="relative bg-white rounded-3xl shadow-sm border border-slate-50 p-8"
                            >
                                <span className={`absolute top-6 text-5xl font-bold text-[#f4efe4] select-none ${isAr ? "left-7" : "right-7"}`}>
                                    {step}
                                </span>
                                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e67e22] to-[#d35400] shadow-sm">
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="mt-5 text-xl font-semibold text-[#1c355e]">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Values + stats strip */}
            <section className="mx-6">
                <div className="max-w-6xl mx-auto pb-16">
                    <div className="rounded-3xl bg-[#1c355e] text-white shadow-sm overflow-hidden">
                        <div className="p-8 sm:p-12">
                            <div className="flex items-start gap-4 max-w-3xl">
                                <Quote className="w-9 h-9 text-[#e67e22] shrink-0" />
                                <p className="text-xl sm:text-2xl font-medium leading-relaxed italic font-serif">
                                    {c.quote}
                                </p>
                            </div>

                            <div className="mt-10 grid sm:grid-cols-3 gap-8">
                                {c.values.map(({ title, description }) => (
                                    <div key={title}>
                                        <h3 className="text-lg font-semibold text-[#e3cda8]">
                                            {title}
                                        </h3>
                                        <p className="mt-2 text-sm text-white/70 leading-relaxed">
                                            {description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-white/10">
                            {c.stats.map(({ value, label }) => (
                                <div
                                    key={label}
                                    className="p-6 text-center border-white/10 [&:not(:last-child)]:border-r [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r [&:nth-child(2)]:border-b sm:[&:nth-child(2)]:border-b-0 [&:nth-child(1)]:border-b sm:[&:nth-child(1)]:border-b-0"
                                >
                                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-b from-[#e3cda8] to-[#aa804c] text-transparent bg-clip-text">
                                        {value}
                                    </p>
                                    <p className="mt-1 text-xs sm:text-sm text-white/60">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="mx-6">
                <div className="max-w-5xl mx-auto pb-20">
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl sm:text-4xl font-bold text-[#1c355e]">
                            {c.teamTitle}
                        </h2>
                        <p className="mt-4 text-slate-600 leading-relaxed">
                            {c.teamSubtitle}
                        </p>
                    </div>

                    <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teamMembers.map(({ name, roleKey }) => (
                            <li
                                key={name}
                                className="rounded-2xl border border-slate-50 bg-white px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                            >
                                <p className="text-[#1c355e] font-semibold" dir="rtl">
                                    {name}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {c.roles[roleKey]}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>
        </div>
    )
}
