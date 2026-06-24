'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleContext'

// Manzili-specific FAQ content. Kept in the page (not the i18n dictionaries) so
// this file stays self-contained. Answers reflect how Manzili actually works:
// Stripe checkout, Bosta delivery split, custom-order milestones, wallet holds.
const faqContent = {
  en: {
    title: 'Frequently Asked Questions',
    subtitle:
      'Everything you need to know about shopping, custom orders, returns, and selling handmade pieces on Manzili.',
    stillTitle: 'Still have a question?',
    stillText: "Can't find what you're looking for? Our team is here to help.",
    contactCta: 'Contact us',
    groups: [
      {
        category: 'Shopping & orders',
        items: [
          {
            q: 'What is Manzili?',
            a: 'Manzili is a multi-vendor marketplace where Egyptian artisans sell genuine, handmade pieces. You can buy ready-made items from the shop or commission something bespoke through our custom-order portal.',
          },
          {
            q: 'How do I pay?',
            a: 'Checkout is handled by Stripe. When you place an order a secure Stripe portal opens where you enter your card details — your payment is processed there, not on Manzili.',
          },
          {
            q: 'What are the fees I pay as a buyer?',
            a: "You pay the item price plus 35% of the Bosta delivery fee and a small Stripe card-processing fee. The seller covers the remaining 65% of the delivery fee and Manzili's commission, so there are no hidden charges.",
          },
          {
            q: 'How do I track my order?',
            a: 'Once your payment succeeds, a Bosta shipment is created automatically. A live tracking timeline then appears on your Orders page, moving through created → picked up → in transit → delivered.',
          },
          {
            q: 'When can I leave a review?',
            a: 'You can review a product after your order has been delivered. This keeps ratings tied to real, completed purchases.',
          },
        ],
      },
      {
        category: 'Custom orders — "Customize this for me"',
        items: [
          {
            q: 'What is "Customize this for me"?',
            a: 'It is our bespoke-commission flow. You describe the piece you want, interested artisans send you offers, and you choose the one that fits you best.',
          },
          {
            q: 'How do custom payments work?',
            a: 'Custom orders are paid in milestones — typically a deposit to start the work, a progress payment, and a final payment that releases the item for shipping. Each milestone opens its own secure Stripe portal.',
          },
          {
            q: 'Can two people request the same idea?',
            a: 'Yes. Ideas and inspiration are not exclusive on Manzili — many buyers can request similar pieces, and many artisans are free to make them.',
          },
          {
            q: 'Who owns the finished design?',
            a: 'The physical piece is yours once it is fully paid for. Artisans keep the right to reuse their own techniques and designs on future work.',
          },
        ],
      },
      {
        category: 'Returns, refunds & timing',
        items: [
          {
            q: "What's the return policy?",
            a: 'Stripe-paid orders can be returned within 7 days of delivery. Request the return from your Orders/Returns page; Bosta then collects the item from you and returns it to the seller, and your refund is issued to the original payment method.',
          },
          {
            q: 'Why are seller earnings held for a while?',
            a: 'Seller earnings stay Pending for about 7 days and are released around delivery. This hold lets any return be covered automatically before the money becomes available to withdraw.',
          },
        ],
      },
      {
        category: 'Selling on Manzili',
        items: [
          {
            q: 'How do I become a seller?',
            a: 'Create your store from your account, then wait for an admin to review it. Once your store is approved you can list products and start receiving custom requests.',
          },
          {
            q: 'What does it cost to sell?',
            a: 'Manzili takes a 15% commission on standard orders and 10% on custom orders. You also cover 65% of the Bosta delivery fee on each order.',
          },
          {
            q: 'How and when do I get paid?',
            a: 'Sales first land in your wallet as Pending, then move to Available after the hold period around delivery. From there you request a payout — just add your payout/bank details in the wallet first.',
          },
        ],
      },
      {
        category: 'Safety & privacy',
        items: [
          {
            q: 'Is my payment data safe?',
            a: 'Yes. All payments run through Stripe, and Manzili never stores your full card number. For sellers, bank details are kept only as the last 4 digits.',
          },
          {
            q: 'Do admins read my chats?',
            a: 'For safety and dispute resolution, admins can monitor the buyer-to-seller negotiation chats on custom orders. This helps us step in fairly if something goes wrong.',
          },
          {
            q: 'How do I contact support?',
            a: 'Reach us through the Contact page or by email at manziliproject@gmail.com. We are happy to help with orders, custom requests, or selling.',
          },
        ],
      },
    ],
  },
  ar: {
    title: 'الأسئلة الشائعة',
    subtitle:
      'كل ما تحتاج معرفته عن التسوّق والطلبات المُفصّلة والمرتجعات وبيع المشغولات اليدوية على منزلي.',
    stillTitle: 'ما زال لديك سؤال؟',
    stillText: 'لم تجد ما تبحث عنه؟ فريقنا هنا لمساعدتك.',
    contactCta: 'تواصل معنا',
    groups: [
      {
        category: 'التسوّق والطلبات',
        items: [
          {
            q: 'ما هو منزلي؟',
            a: 'منزلي سوق متعدّد البائعين يبيع فيه الحرفيون المصريون قطعًا يدوية أصيلة. يمكنك شراء منتجات جاهزة من المتجر أو طلب قطعة مُفصّلة خصيصًا عبر بوابة الطلبات المخصّصة لدينا.',
          },
          {
            q: 'كيف أدفع؟',
            a: 'يتم الدفع عبر سترايب. عند تقديم الطلب تُفتح بوابة سترايب آمنة تُدخل فيها بيانات بطاقتك — تُعالَج عملية الدفع هناك، وليس على منزلي.',
          },
          {
            q: 'ما الرسوم التي أدفعها كمشترٍ؟',
            a: 'تدفع سعر القطعة مضافًا إليه 35٪ من رسوم توصيل بوسطة ورسمًا بسيطًا لمعالجة البطاقة عبر سترايب. أما البائع فيتحمّل الـ65٪ الباقية من رسوم التوصيل وعمولة منزلي، فلا توجد أي رسوم خفية.',
          },
          {
            q: 'كيف أتتبّع طلبي؟',
            a: 'بمجرد نجاح الدفع، تُنشأ شحنة بوسطة تلقائيًا. ثم يظهر خط زمني للتتبّع المباشر في صفحة طلباتك، يمرّ بمراحل: تم الإنشاء ← تم الاستلام ← قيد النقل ← تم التسليم.',
          },
          {
            q: 'متى يمكنني كتابة تقييم؟',
            a: 'يمكنك تقييم المنتج بعد تسليم طلبك. هذا يضمن ارتباط التقييمات بعمليات شراء حقيقية ومكتملة.',
          },
        ],
      },
      {
        category: 'الطلبات المُفصّلة — «صمّمها لي حسب طلبي»',
        items: [
          {
            q: 'ما معنى «صمّمها لي حسب طلبي»؟',
            a: 'إنه نظام الطلبات المُفصّلة لدينا. تصف القطعة التي تريدها، فيرسل لك الحرفيون المهتمّون عروضهم، وتختار العرض الأنسب لك.',
          },
          {
            q: 'كيف تتم مدفوعات الطلبات المُفصّلة؟',
            a: 'تُدفع الطلبات المُفصّلة على مراحل — عادةً دفعة مقدّمة لبدء العمل، ودفعة عند التقدّم، ودفعة نهائية تُتيح شحن القطعة. وتفتح كل مرحلة بوابة سترايب آمنة خاصة بها.',
          },
          {
            q: 'هل يمكن لشخصين طلب الفكرة نفسها؟',
            a: 'نعم. الأفكار والإلهام ليست حِكرًا على أحد في منزلي — يمكن لكثير من المشترين طلب قطع مشابهة، ولكثير من الحرفيين صنعها بحرّية.',
          },
          {
            q: 'لمن يعود التصميم النهائي؟',
            a: 'القطعة المادية تصبح ملكك بمجرد سدادها بالكامل. ويحتفظ الحرفيون بحق إعادة استخدام تقنياتهم وتصاميمهم في أعمالهم المستقبلية.',
          },
        ],
      },
      {
        category: 'المرتجعات والاسترداد والمواعيد',
        items: [
          {
            q: 'ما هي سياسة الإرجاع؟',
            a: 'يمكن إرجاع الطلبات المدفوعة عبر سترايب خلال 7 أيام من التسليم. اطلب الإرجاع من صفحة الطلبات/المرتجعات؛ فتأتي بوسطة لاستلام القطعة منك وإعادتها إلى البائع، ويُردّ مبلغك إلى وسيلة الدفع الأصلية.',
          },
          {
            q: 'لماذا تُحتجَز أرباح البائع لبعض الوقت؟',
            a: 'تبقى أرباح البائع «قيد الانتظار» لنحو 7 أيام ثم تُحرَّر قرب موعد التسليم. تتيح هذه المهلة تغطية أي إرجاع تلقائيًا قبل أن يصبح المبلغ متاحًا للسحب.',
          },
        ],
      },
      {
        category: 'البيع على منزلي',
        items: [
          {
            q: 'كيف أصبح بائعًا؟',
            a: 'أنشئ متجرك من حسابك، ثم انتظر مراجعة المشرف له. وبمجرد الموافقة على متجرك يمكنك إضافة المنتجات والبدء في استقبال الطلبات المُفصّلة.',
          },
          {
            q: 'ما تكلفة البيع؟',
            a: 'يأخذ منزلي عمولة 15٪ على الطلبات العادية و10٪ على الطلبات المُفصّلة. كما تتحمّل 65٪ من رسوم توصيل بوسطة على كل طلب.',
          },
          {
            q: 'كيف ومتى أتقاضى أموالي؟',
            a: 'تصل المبيعات أولًا إلى محفظتك «قيد الانتظار»، ثم تتحوّل إلى «متاحة» بعد مهلة الاحتجاز قرب موعد التسليم. ومن هناك تطلب سحب أموالك — فقط أضف بيانات السحب/الحساب البنكي في المحفظة أولًا.',
          },
        ],
      },
      {
        category: 'الأمان والخصوصية',
        items: [
          {
            q: 'هل بيانات الدفع الخاصة بي آمنة؟',
            a: 'نعم. تمرّ جميع المدفوعات عبر سترايب، ولا يخزّن منزلي رقم بطاقتك كاملًا أبدًا. أما البائعون فتُحفظ بياناتهم البنكية بآخر 4 أرقام فقط.',
          },
          {
            q: 'هل يطّلع المشرفون على محادثاتي؟',
            a: 'لأغراض الأمان وحلّ النزاعات، يمكن للمشرفين مراقبة محادثات التفاوض بين المشتري والبائع في الطلبات المُفصّلة. يساعدنا ذلك على التدخّل بإنصاف إذا حدث خطأ ما.',
          },
          {
            q: 'كيف أتواصل مع الدعم؟',
            a: 'تواصل معنا عبر صفحة «تواصل معنا» أو عبر البريد الإلكتروني manziliproject@gmail.com. يسعدنا مساعدتك في الطلبات أو الطلبات المُفصّلة أو البيع.',
          },
        ],
      },
    ],
  },
}

function FaqItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="rounded-xl border border-[#e7ddca] bg-white shadow-sm transition-all hover:border-[#e67e22]/40 hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-base font-medium text-[#1c355e]">{q}</span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-[#e67e22] transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{a}</p>
        </div>
      </div>
    </div>
  )
}

export default function FAQPage() {
  const { locale } = useLocale()
  const isAr = locale === 'ar'
  const c = faqContent[isAr ? 'ar' : 'en']
  // Single open item across the whole page, keyed as "groupIndex-itemIndex".
  const [openKey, setOpenKey] = useState(null)

  return (
    <div className="bg-[#faf8f5]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="bg-[#f4efe4]">
        <div className="mx-6">
          <div className="mx-auto max-w-3xl py-16 text-center">
            <h1 className="text-4xl font-bold text-[#1c355e] sm:text-5xl">
              {c.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-slate-600">
              {c.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Accordion groups */}
      <div className="mx-6">
        <div className="mx-auto max-w-3xl space-y-12 py-14">
          {c.groups.map((group, gi) => (
            <section key={group.category}>
              <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-[#1c355e]">
                <span className="inline-block h-6 w-1 rounded-full bg-[#e67e22]" />
                {group.category}
              </h2>
              <div className="space-y-3">
                {group.items.map((item, ii) => {
                  const key = `${gi}-${ii}`
                  return (
                    <FaqItem
                      key={key}
                      q={item.q}
                      a={item.a}
                      isOpen={openKey === key}
                      onToggle={() =>
                        setOpenKey((prev) => (prev === key ? null : key))
                      }
                    />
                  )
                })}
              </div>
            </section>
          ))}

          {/* Still need help */}
          <div className="rounded-2xl border border-[#e7ddca] bg-white px-6 py-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-[#1c355e]">
              {c.stillTitle}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {c.stillText}
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-block rounded-lg bg-[#e67e22] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#d35400]"
            >
              {c.contactCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
