"use client";
import { useTranslate } from '@/lib/i18n/LocaleContext'

export default function FAQPage() {
  const t = useTranslate()

  const faqs = [
    {
      q: t('faq.q1'),
      a: t('faq.a1'),
    },
    {
      q: t('faq.q2'),
      a: t('faq.a2'),
    },
    {
      q: t('faq.q3'),
      a: t('faq.a3'),
    },
    {
      q: t('faq.q4'),
      a: t('faq.a4'),
    },
    {
      q: t('faq.q5'),
      a: t('faq.a5'),
    },
    {
      q: t('faq.q6'),
      a: t('faq.a6'),
    },
    {
      q: t('faq.q7'),
      a: t('faq.a7'),
    },
    {
      q: t('faq.q8'),
      a: t('faq.a8'),
    },
  ];

  return (
    <div className="mx-6">
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-2xl text-slate-500 mb-8">
          {t('faq.title')}
        </h1>

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm"
            >
              <h3 className="text-base font-medium text-slate-800 mb-2">
                Q: {faq.q}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
