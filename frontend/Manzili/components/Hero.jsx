'use client'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import CategoriesMarquee from './CategoriesMarquee'
import { useTranslate } from '@/lib/i18n/LocaleContext'

/**
 * Editorial "canvas" hero: an unboxed warm-linen band with sophisticated typography and
 * two clear calls-to-action on the left, and an overlapping collage of artisan imagery on
 * the right (pottery process → finished woven baskets → rug weaving). Replaces the old
 * grid-of-boxes banner. Hero imagery lives in /public/hero.
 */
const Hero = () => {
    const t = useTranslate()

    // Accent the second sentence of the headline in the brand's tan gradient. Splitting on
    // ". " works for both the English and Arabic copy (both are two short sentences).
    const [titleA, ...restTitle] = t('hero.title').split('. ')
    const titleB = restTitle.join('. ')

    return (
        <>
            <section className="relative overflow-hidden bg-gradient-to-b from-[#faf6ef] via-[#fbf9f4] to-white">
                <div className="relative max-w-7xl mx-auto px-6 py-14 lg:py-20 grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
                    {/* Left — editorial copy */}
                    <div className="max-w-xl">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-800 leading-[1.08]">
                            {titleA}
                            {titleB && (
                                <>
                                    {'. '}
                                    <span className="bg-gradient-to-r from-[#c79a5e] to-[#aa804c] bg-clip-text text-transparent">
                                        {titleB}
                                    </span>
                                </>
                            )}
                        </h1>

                        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-md leading-relaxed">
                            {t('hero.subtitle')}
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Link
                                href="/shop"
                                className="inline-flex items-center justify-center gap-2 bg-[#1c355e] hover:bg-[#2582eb] text-white px-7 py-3.5 rounded-full font-medium shadow-sm hover:shadow-md transition-all"
                            >
                                {t('hero.exploreReady')} <ArrowRightIcon size={18} />
                            </Link>
                            <Link
                                href="/custom"
                                className="inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 hover:border-[#2582eb] hover:text-[#2582eb] px-7 py-3.5 rounded-full font-medium transition-colors"
                            >
                                {t('hero.commission')}
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                                {t('hero.trust1')}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                {t('hero.trust2')}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                {t('hero.trust3')}
                            </span>
                        </div>
                    </div>

                    {/* Right — overlapping artisan collage */}
                    <div className="relative h-[380px] sm:h-[460px] lg:h-[540px]">
                        {/* main: hands shaping a clay pot on the wheel */}
                        <div className="absolute left-0 top-0 w-[64%] h-[80%] rounded-[1.75rem] overflow-hidden shadow-xl ring-1 ring-black/5">
                            <Image
                                src="/hero/hero-pottery.png"
                                alt="Artisan shaping a clay pot on a pottery wheel"
                                fill
                                sizes="(max-width:1024px) 60vw, 30vw"
                                className="object-cover"
                                priority
                            />
                        </div>
                        {/* secondary: finished woven wall baskets, overlapping bottom-right */}
                        <div className="absolute right-0 bottom-0 w-[52%] h-[56%] rounded-[1.5rem] overflow-hidden shadow-xl ring-4 ring-[#fbf9f4]">
                            <Image
                                src="/hero/hero-baskets.webp"
                                alt="Finished handwoven wall baskets on display"
                                fill
                                sizes="(max-width:1024px) 45vw, 25vw"
                                className="object-cover"
                                loading="eager"
                            />
                        </div>
                        {/* accent: hands weaving a wool rug, top-right */}
                        <div className="absolute right-4 top-6 w-[34%] h-[34%] rounded-2xl overflow-hidden shadow-lg ring-4 ring-[#fbf9f4] hidden sm:block">
                            <Image
                                src="/hero/hero-weaving.png"
                                alt="Artisan hand-weaving a patterned wool rug"
                                fill
                                sizes="20vw"
                                className="object-cover"
                                loading="eager"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <div className="mx-6">
                <CategoriesMarquee />
            </div>
        </>
    )
}

export default Hero
