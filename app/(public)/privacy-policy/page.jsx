"use client";
import { useState } from "react";
import { useTranslate } from '@/lib/i18n/LocaleContext'

export default function PrivacyPolicy() {
  const t = useTranslate()
  const [activeSection, setActiveSection] = useState("privacy");

  const sections = {
    privacy: {
      title: t('privacyPolicy.privacyTab'),
      content: [
        {
          heading: t('privacyPolicy.p1h'),
          text: t('privacyPolicy.p1t'),
        },
        {
          heading: t('privacyPolicy.p2h'),
          text: t('privacyPolicy.p2t'),
        },
        {
          heading: t('privacyPolicy.p3h'),
          text: t('privacyPolicy.p3t'),
        },
        {
          heading: t('privacyPolicy.p4h'),
          text: t('privacyPolicy.p4t'),
        },
        {
          heading: t('privacyPolicy.p5h'),
          text: t('privacyPolicy.p5t'),
        },
        {
          heading: t('privacyPolicy.p6h'),
          text: t('privacyPolicy.p6t'),
        },
        {
          heading: t('privacyPolicy.p7h'),
          text: t('privacyPolicy.p7t'),
        },
        {
          heading: t('privacyPolicy.p8h'),
          text: t('privacyPolicy.p8t'),
        },
        {
          heading: t('privacyPolicy.p9h'),
          text: t('privacyPolicy.p9t'),
        },
        {
          heading: t('privacyPolicy.p10h'),
          text: t('privacyPolicy.p10t'),
        },
        {
          heading: t('privacyPolicy.p11h'),
          text: t('privacyPolicy.p11t'),
        },
        {
          heading: t('privacyPolicy.p12h'),
          text: t('privacyPolicy.p12t'),
        },
      ],
    },
    terms: {
      title: t('privacyPolicy.termsTab'),
      content: [
        {
          heading: t('privacyPolicy.t1h'),
          text: t('privacyPolicy.t1t'),
        },
        {
          heading: t('privacyPolicy.t2h'),
          text: t('privacyPolicy.t2t'),
        },
        {
          heading: t('privacyPolicy.t3h'),
          text: t('privacyPolicy.t3t'),
        },
        {
          heading: t('privacyPolicy.t4h'),
          text: t('privacyPolicy.t4t'),
        },
        {
          heading: t('privacyPolicy.t5h'),
          text: t('privacyPolicy.t5t'),
        },
        {
          heading: t('privacyPolicy.t6h'),
          text: t('privacyPolicy.t6t'),
        },
        {
          heading: t('privacyPolicy.t7h'),
          text: t('privacyPolicy.t7t'),
        },
        {
          heading: t('privacyPolicy.t8h'),
          text: t('privacyPolicy.t8t'),
        },
        {
          heading: t('privacyPolicy.t9h'),
          text: t('privacyPolicy.t9t'),
        },
        {
          heading: t('privacyPolicy.t10h'),
          text: t('privacyPolicy.t10t'),
        },
        {
          heading: t('privacyPolicy.t11h'),
          text: t('privacyPolicy.t11t'),
        },
        {
          heading: t('privacyPolicy.t12h'),
          text: t('privacyPolicy.t12t'),
        },
        {
          heading: t('privacyPolicy.t13h'),
          text: t('privacyPolicy.t13t'),
        },
        {
          heading: t('privacyPolicy.t14h'),
          text: t('privacyPolicy.t14t'),
        },
        {
          heading: t('privacyPolicy.t15h'),
          text: t('privacyPolicy.t15t'),
        },
        {
          heading: t('privacyPolicy.t16h'),
          text: t('privacyPolicy.t16t'),
        },
      ],
    },
  };

  const currentContent = sections[activeSection];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="mx-6">
          <div className="max-w-4xl mx-auto py-16 lg:py-24">
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 text-center mb-4">
              {t('privacyPolicy.legalInfo')}
            </h1>
            <p className="text-center text-slate-600 text-lg">
              {t('privacyPolicy.legalSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-6">
        <div className="max-w-4xl mx-auto my-16">
          {/* Tabs */}
          <div className="flex gap-4 mb-12 border-b border-slate-200">
            <button
              onClick={() => setActiveSection("privacy")}
              className={`px-6 py-4 font-semibold text-lg transition-all border-b-2 ${
                activeSection === "privacy"
                  ? "text-[#2582eb] border-[#2582eb]"
                  : "text-slate-600 border-transparent hover:text-slate-800"
              }`}
            >
              {t('privacyPolicy.privacyTab')}
            </button>
            <button
              onClick={() => setActiveSection("terms")}
              className={`px-6 py-4 font-semibold text-lg transition-all border-b-2 ${
                activeSection === "terms"
                  ? "text-[#2582eb] border-[#2582eb]"
                  : "text-slate-600 border-transparent hover:text-slate-800"
              }`}
            >
              {t('privacyPolicy.termsTab')}
            </button>
          </div>

          {/* Content */}
          <div className="space-y-12">
            <h2 className="text-3xl font-bold text-slate-800">
              {currentContent.title}
            </h2>

            {currentContent.content.map((section, index) => (
              <div key={index} className="space-y-3">
                <h3 className="text-xl font-bold text-slate-800">
                  {section.heading}
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {section.text}
                </p>
              </div>
            ))}

            {/* Last Updated */}
            <div className="pt-8 border-t border-slate-200 text-sm text-slate-600">
              <p>{t('privacyPolicy.lastUpdated', { date: 'May 2026' })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
