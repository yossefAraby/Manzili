'use client'
// Manzili — Policies & Privacy
// Client component: static legal/policy content, localized EN/AR by locale.
// Palette: navy #1c355e, terra-cotta #e67e22 / #d35400, warm sand #f4efe4 / #faf8f5.

import Link from "next/link"
import { useLocale } from "@/lib/i18n/LocaleContext"

const content = {
  en: {
    badge: "Manzili Policies",
    title: "Policies & Privacy",
    intro:
      "Manzili is a marketplace for handmade Egyptian products, connecting makers and buyers. Here is exactly how our fees, custom orders, data handling, payment holds, and returns work — in plain language.",
    lastUpdated: "Last updated: June 2026",
    onThisPage: "On this page",
    questionsTitle: "Questions?",
    emailUs: "Email us at",
    contactCta: "Contact Manzili",
    footerNote: "Have a question about any of these policies? We are happy to help.",
    sections: [
      { id: "fees", label: "Fees & Commissions" },
      { id: "customize", label: "Custom Orders & Creative Rights" },
      { id: "admins", label: "What Administrators Can See" },
      { id: "security", label: "Security & Your Data" },
      { id: "holds", label: "Payment Holds & Returns Reserve" },
      { id: "returns", label: "Returns & Refunds" },
      { id: "allowed", label: "What You Can Sell" },
    ],
    fees: {
      heading: "Fees & Commissions",
      intro:
        "Browsing and listing on Manzili are free. We only earn when a sale goes through. Here is every charge that can apply to an order and who pays it.",
      tableHead: { charge: "Charge", who: "Who pays", amount: "Amount" },
      rows: [
        { charge: "Manzili commission — standard orders", who: "Seller", amount: "15% of item price" },
        { charge: "Manzili commission — custom “customize this for me” orders", who: "Seller", amount: "10% of item price" },
        { charge: "Bosta delivery fee", who: "Split: seller & buyer", amount: "75% seller / 25% buyer" },
        { charge: "Stripe card processing fee", who: "Buyer", amount: "~2.9%" },
      ],
      exampleTitle: "Worked example — a 500 EGP item",
      buyerPays: "Buyer pays",
      sellerNets: "Seller nets",
      buyerRows: [
        { label: "Item price", value: "500.00" },
        { label: "Shipping (25% of 50 EGP)", value: "12.50" },
        { label: "Stripe fee (~2.9%)", value: "14.86" },
      ],
      buyerTotalLabel: "Total",
      buyerTotalValue: "≈ 527.36 EGP",
      sellerRows: [
        { label: "Item price", value: "500.00" },
        { label: "− Manzili commission (15%)", value: "−75.00" },
        { label: "− Shipping (75% of 50 EGP)", value: "−37.50" },
      ],
      sellerTotalLabel: "Net earnings",
      sellerTotalValue: "= 387.50 EGP",
      exampleNote:
        "Figures are illustrative; the exact Bosta shipping rate depends on weight and destination, and the Stripe fee is set by Stripe.",
    },
    customize: {
      heading: "Custom Orders & Creative Rights",
      intro: (
        <>
          With <strong className="text-[#1c355e]">“customize this for me,”</strong>{" "}
          a buyer describes the bespoke item they want, sellers respond with offers, and the buyer accepts the one they like. Once the order is paid and delivered, the finished physical piece belongs to the buyer.
        </>
      ),
      cardTitle: "Ideas are free — concepts are not owned",
      bullets: [
        (
          <>
            Ideas, inspiration, and item <em>concepts</em> are{" "}
            <strong>not exclusive and not owned by anyone.</strong> You may request an item inspired by anything you have seen.
          </>
        ),
        (
          <>
            The same or a similar idea may be requested by many buyers and made by many sellers. “Cloning ideas” is{" "}
            <strong>allowed and expected</strong> on Manzili.
          </>
        ),
        (
          <>
            Sellers may freely reuse their own techniques, patterns, and designs across as many orders as they like.
          </>
        ),
        (
          <>
            Manzili claims <strong>no ownership</strong> over any design. Reference photos a buyer uploads are used only to brief the seller on what is wanted.
          </>
        ),
      ],
      outro:
        "In short, there is no intellectual-property exclusivity on ideas. The one limit: blatantly copying a specific seller’s copyrighted artwork or brand — reproducing their protected work or passing off their identity as your own — is still prohibited and may lead to removal.",
    },
    admins: {
      heading: "What Administrators Can See",
      intro:
        "We believe in being transparent about who can view what. To keep the marketplace safe and resolve disputes fairly, Manzili administrators — and moderators acting within their assigned permissions — can view the following:",
      canSeeTitle: "Admins can see",
      canSee: [
        "Orders, products, and stores",
        "User reports and dispute records",
        "Custom-request conversations — the buyer ↔ seller negotiation chat is monitored for safety and dispute resolution",
        "Wallet balances and payout records",
      ],
      cannotSeeTitle: "Admins can never see",
      cannotSee: [
        (
          <>
            Full payment card numbers — these are handled entirely by Stripe and never reach Manzili
          </>
        ),
        (
          <>
            Full bank / payout account numbers — admins only ever see the{" "}
            <strong className="text-[#1c355e]">last 4 digits</strong> of a seller’s payout details
          </>
        ),
      ],
    },
    security: {
      heading: "Security & Your Data",
      intro:
        "Protecting your account and your money is a priority. Here is how your data — including financial data — is stored and secured.",
      accountsTitle: "Accounts & storage",
      accounts: [
        (<>Data is stored in a PostgreSQL database, hosted on Supabase / AWS infrastructure.</>),
        (<>Passwords are hashed with <strong>BCrypt</strong> and are never stored in plain text.</>),
        (<>Login sessions are managed with signed <strong>JWTs</strong>.</>),
        (<>Product and store images are stored via Cloudinary.</>),
      ],
      paymentsTitle: "Payments & financial data",
      payments: [
        (<>Card payments are processed by <strong>Stripe</strong>. Manzili never stores full card numbers.</>),
        (<>Seller payout details are stored minimally — only the <strong>last 4 digits</strong> plus bank name and account holder. Full account numbers are not retained.</>),
      ],
      deletion: (
        <>
          You can request deletion of your personal data at any time by contacting us at{" "}
          <a
            href="mailto:manziliproject@gmail.com"
            className="font-medium text-[#d35400] underline-offset-2 hover:underline"
          >
            manziliproject@gmail.com
          </a>
          .
        </>
      ),
    },
    holds: {
      heading: "Payment Holds & Returns Reserve",
      intro: (
        <>
          When a buyer pays for an order, the seller’s earnings first appear as{" "}
          <strong className="text-[#1c355e]">Pending</strong>. They are held for a short window (about 7 days) and released to{" "}
          <strong className="text-[#1c355e]">Available</strong> around the time of delivery.
        </>
      ),
      card: (
        <>
          This window exists so that returns can be reconciled{" "}
          <strong>automatically</strong> before funds become withdrawable. If a buyer opens a return within the window, the seller’s credit for that order is reversed automatically — so the marketplace can refund the buyer without clawing back money that has already been withdrawn.
        </>
      ),
      pending: "Pending — held ~7 days",
      available: "Available — released around delivery",
      withdrawable: "Withdrawable",
    },
    returns: {
      heading: "Returns & Refunds",
      intro: (
        <>
          Card-paid (Stripe) orders are eligible for return within{" "}
          <strong className="text-[#1c355e]">7 days of delivery</strong>. The process is handled end-to-end inside Manzili:
        </>
      ),
      steps: [
        "The buyer requests a return from their Orders / Returns page.",
        "Manzili books a Bosta reverse pickup — the item is collected from the buyer and returned to the seller.",
        "Once the return is confirmed, the refund is issued to the original payment method.",
        "The seller’s wallet credit for that order is reversed.",
      ],
      note: (
        <>
          Cash-on-delivery orders, where applicable, are handled directly through our support team at{" "}
          <a
            href="mailto:manziliproject@gmail.com"
            className="font-medium text-[#d35400] underline-offset-2 hover:underline"
          >
            manziliproject@gmail.com
          </a>
          .
        </>
      ),
    },
    allowed: {
      heading: "What You Can Sell",
      intro: (
        <>
          Manzili is a marketplace for <strong className="text-[#1c355e]">handmade</strong>{" "}
          goods. Everything listed must be <strong>handcrafted or made-to-order by the seller</strong> — Manzili is not a place for mass-produced or resold products.
        </>
      ),
      allowedTitle: "Allowed",
      allowedItems: [
        (<>Handmade home décor, art &amp; paintings, ceramics &amp; pottery</>),
        (<>Handcrafted woodwork &amp; furniture (e.g. a custom wooden desk)</>),
        (<>Handmade or tailored textiles &amp; clothing, crochet &amp; knitting</>),
        (<>Jewelry, accessories, bags &amp; leather goods</>),
        (<>Candles, soaps, fragrances &amp; handmade beauty</>),
        (<>Homemade food &amp; sweets, stationery</>),
        (<>Decorative/artistic metalwork (forged or hand-finished pieces)</>),
      ],
      notAllowedTitle: "Not allowed",
      notAllowedItems: [
        (<>Mass-produced / factory goods, or anything bought to resell</>),
        (<>Branded, replica or counterfeit items</>),
        (<>Industrial fabrication &amp; construction trades — e.g. standard aluminium windows &amp; doors (المونتال)</>),
        (<>Digital-only products, services, or drop-shipped items</>),
        (<>Weapons, hazardous, illegal or otherwise regulated items</>),
      ],
      note: (
        <>
          Listings that don’t fit the handmade spirit may be removed, and repeat violations can lead to a store being suspended. Not sure if your craft fits? Email us at{" "}
          <a
            href="mailto:manziliproject@gmail.com"
            className="font-medium text-[#d35400] underline-offset-2 hover:underline"
          >
            manziliproject@gmail.com
          </a>
          .
        </>
      ),
    },
  },
  ar: {
    badge: "سياسات منزلي",
    title: "السياسات والخصوصية",
    intro:
      "منزلي سوق للمنتجات اليدوية المصرية، يربط الصنّاع بالمشترين. وفيما يلي بالضبط كيف تعمل رسومنا والطلبات المُفصّلة والتعامل مع بياناتك واحتجاز المدفوعات والمرتجعات — بلغة واضحة.",
    lastUpdated: "آخر تحديث: يونيو 2026",
    onThisPage: "في هذه الصفحة",
    questionsTitle: "أسئلة؟",
    emailUs: "راسلنا على",
    contactCta: "تواصل مع منزلي",
    footerNote: "هل لديك سؤال حول أيٍّ من هذه السياسات؟ يسعدنا مساعدتك.",
    sections: [
      { id: "fees", label: "الرسوم والعمولات" },
      { id: "customize", label: "الطلبات المُفصّلة والحقوق الإبداعية" },
      { id: "admins", label: "ما الذي يطّلع عليه المشرفون" },
      { id: "security", label: "الأمان وبياناتك" },
      { id: "holds", label: "احتجاز المدفوعات واحتياطي المرتجعات" },
      { id: "returns", label: "المرتجعات والاسترداد" },
      { id: "allowed", label: "ما الذي يمكنك بيعه" },
    ],
    fees: {
      heading: "الرسوم والعمولات",
      intro:
        "التصفّح وعرض المنتجات على منزلي مجاني. ولا نربح إلا عند إتمام عملية بيع. وفيما يلي كل رسم قد يُطبَّق على الطلب ومن يدفعه.",
      tableHead: { charge: "الرسم", who: "من يدفع", amount: "القيمة" },
      rows: [
        { charge: "عمولة منزلي — الطلبات العادية", who: "البائع", amount: "15٪ من سعر القطعة" },
        { charge: "عمولة منزلي — طلبات «صمّمها لي حسب طلبي»", who: "البائع", amount: "10٪ من سعر القطعة" },
        { charge: "رسوم توصيل بوسطة", who: "مقسّمة: البائع والمشتري", amount: "75٪ البائع / 25٪ المشتري" },
        { charge: "رسوم معالجة البطاقة عبر سترايب", who: "المشتري", amount: "نحو 2.9٪" },
      ],
      exampleTitle: "مثال محسوب — قطعة بسعر 500 جنيه",
      buyerPays: "ما يدفعه المشتري",
      sellerNets: "صافي ما يحصل عليه البائع",
      buyerRows: [
        { label: "سعر القطعة", value: "500.00" },
        { label: "الشحن (25٪ من 50 جنيه)", value: "12.50" },
        { label: "رسوم سترايب (نحو 2.9٪)", value: "14.86" },
      ],
      buyerTotalLabel: "الإجمالي",
      buyerTotalValue: "≈ 527.36 جنيه",
      sellerRows: [
        { label: "سعر القطعة", value: "500.00" },
        { label: "− عمولة منزلي (15٪)", value: "−75.00" },
        { label: "− الشحن (75٪ من 50 جنيه)", value: "−37.50" },
      ],
      sellerTotalLabel: "صافي الأرباح",
      sellerTotalValue: "= 387.50 جنيه",
      exampleNote:
        "الأرقام للتوضيح فقط؛ فسعر شحن بوسطة الدقيق يعتمد على الوزن والوجهة، ورسوم سترايب تحدّدها سترايب.",
    },
    customize: {
      heading: "الطلبات المُفصّلة والحقوق الإبداعية",
      intro: (
        <>
          مع <strong className="text-[#1c355e]">«صمّمها لي حسب طلبي»،</strong>{" "}
          يصف المشتري القطعة المُفصّلة التي يريدها، فيردّ البائعون بعروضهم، ويقبل المشتري العرض الذي يعجبه. وبمجرد دفع الطلب وتسليمه، تصبح القطعة المادية المُنجَزة ملكًا للمشتري.
        </>
      ),
      cardTitle: "الأفكار حرّة — والمفاهيم لا يملكها أحد",
      bullets: [
        (
          <>
            الأفكار والإلهام و<em>مفاهيم</em> القطع{" "}
            <strong>ليست حِكرًا على أحد ولا يملكها أحد.</strong> يمكنك طلب قطعة مستوحاة من أي شيء رأيته.
          </>
        ),
        (
          <>
            يمكن أن يطلب الفكرة نفسها أو فكرة مشابهة عدة مشترين، ويصنعها عدة بائعين. و«استنساخ الأفكار»{" "}
            <strong>مسموح ومتوقَّع</strong> على منزلي.
          </>
        ),
        (
          <>
            يحق للبائعين إعادة استخدام تقنياتهم وأنماطهم وتصاميمهم بحرّية في أي عدد من الطلبات يشاؤون.
          </>
        ),
        (
          <>
            منزلي <strong>لا يدّعي ملكية</strong> أي تصميم. والصور المرجعية التي يرفعها المشتري تُستخدم فقط لشرح المطلوب للبائع.
          </>
        ),
      ],
      outro:
        "باختصار، لا توجد حصرية ملكية فكرية على الأفكار. القيد الوحيد: النسخ الصريح لعمل فني محميّ بحقوق طبع أو علامة تجارية خاصة ببائع معيّن — أي إعادة إنتاج عمله المحمي أو انتحال هويته باسمك — يظل محظورًا وقد يؤدي إلى الإزالة.",
    },
    admins: {
      heading: "ما الذي يطّلع عليه المشرفون",
      intro:
        "نؤمن بالشفافية حول من يطّلع على ماذا. وللحفاظ على أمان السوق وحلّ النزاعات بإنصاف، يستطيع مشرفو منزلي — والمراقبون ضمن الصلاحيات المسندة إليهم — الاطّلاع على ما يلي:",
      canSeeTitle: "ما يطّلع عليه المشرفون",
      canSee: [
        "الطلبات والمنتجات والمتاجر",
        "بلاغات المستخدمين وسجلات النزاعات",
        "محادثات الطلبات المُفصّلة — تُراقَب محادثة التفاوض بين المشتري والبائع لأغراض الأمان وحلّ النزاعات",
        "أرصدة المحافظ وسجلات المدفوعات",
      ],
      cannotSeeTitle: "ما لا يطّلع عليه المشرفون أبدًا",
      cannotSee: [
        (
          <>
            أرقام بطاقات الدفع الكاملة — تتعامل معها سترايب بالكامل ولا تصل إلى منزلي أبدًا
          </>
        ),
        (
          <>
            أرقام الحسابات البنكية / حسابات السحب الكاملة — لا يرى المشرفون سوى{" "}
            <strong className="text-[#1c355e]">آخر 4 أرقام</strong> من بيانات سحب البائع
          </>
        ),
      ],
    },
    security: {
      heading: "الأمان وبياناتك",
      intro:
        "حماية حسابك وأموالك أولوية لدينا. وفيما يلي كيف تُخزَّن بياناتك — بما فيها البيانات المالية — وتُؤمَّن.",
      accountsTitle: "الحسابات والتخزين",
      accounts: [
        (<>تُخزَّن البيانات في قاعدة بيانات PostgreSQL مستضافة على بنية Supabase / AWS.</>),
        (<>تُشفَّر كلمات المرور باستخدام <strong>BCrypt</strong> ولا تُخزَّن كنص صريح أبدًا.</>),
        (<>تُدار جلسات تسجيل الدخول عبر <strong>رموز JWT</strong> موقَّعة.</>),
        (<>تُخزَّن صور المنتجات والمتاجر عبر Cloudinary.</>),
      ],
      paymentsTitle: "المدفوعات والبيانات المالية",
      payments: [
        (<>تُعالَج مدفوعات البطاقات عبر <strong>سترايب</strong>. ولا يخزّن منزلي أرقام البطاقات الكاملة أبدًا.</>),
        (<>تُخزَّن بيانات سحب البائع بأقل قدر — فقط <strong>آخر 4 أرقام</strong> إضافةً إلى اسم البنك وصاحب الحساب. ولا يُحتفَظ بأرقام الحسابات الكاملة.</>),
      ],
      deletion: (
        <>
          يمكنك طلب حذف بياناتك الشخصية في أي وقت بالتواصل معنا على{" "}
          <a
            href="mailto:manziliproject@gmail.com"
            className="font-medium text-[#d35400] underline-offset-2 hover:underline"
          >
            manziliproject@gmail.com
          </a>
          .
        </>
      ),
    },
    holds: {
      heading: "احتجاز المدفوعات واحتياطي المرتجعات",
      intro: (
        <>
          عندما يدفع المشتري ثمن الطلب، تظهر أرباح البائع أولًا كـ{" "}
          <strong className="text-[#1c355e]">قيد الانتظار</strong>. وتُحتجَز لفترة قصيرة (نحو 7 أيام) ثم تُحرَّر إلى حالة{" "}
          <strong className="text-[#1c355e]">متاحة</strong> قرب موعد التسليم.
        </>
      ),
      card: (
        <>
          توجد هذه الفترة كي تُسوَّى المرتجعات{" "}
          <strong>تلقائيًا</strong> قبل أن تصبح الأموال قابلة للسحب. فإذا فتح المشتري طلب إرجاع خلال الفترة، يُعكَس رصيد البائع عن ذلك الطلب تلقائيًا — لتتمكّن المنصة من ردّ المبلغ للمشتري دون استرداد أموال سُحبت بالفعل.
        </>
      ),
      pending: "قيد الانتظار — محتجَزة نحو 7 أيام",
      available: "متاحة — تُحرَّر قرب التسليم",
      withdrawable: "قابلة للسحب",
    },
    returns: {
      heading: "المرتجعات والاسترداد",
      intro: (
        <>
          الطلبات المدفوعة بالبطاقة (سترايب) قابلة للإرجاع خلال{" "}
          <strong className="text-[#1c355e]">7 أيام من التسليم</strong>. وتُدار العملية بالكامل داخل منزلي:
        </>
      ),
      steps: [
        "يطلب المشتري الإرجاع من صفحة الطلبات / المرتجعات الخاصة به.",
        "يحجز منزلي استلامًا عكسيًا عبر بوسطة — تُستلم القطعة من المشتري وتُعاد إلى البائع.",
        "بمجرد تأكيد الإرجاع، يُردّ المبلغ إلى وسيلة الدفع الأصلية.",
        "يُعكَس رصيد محفظة البائع عن ذلك الطلب.",
      ],
      note: (
        <>
          أما الطلبات المدفوعة عند الاستلام، حيثما انطبق ذلك، فتُدار مباشرةً عبر فريق الدعم على{" "}
          <a
            href="mailto:manziliproject@gmail.com"
            className="font-medium text-[#d35400] underline-offset-2 hover:underline"
          >
            manziliproject@gmail.com
          </a>
          .
        </>
      ),
    },
    allowed: {
      heading: "ما الذي يمكنك بيعه",
      intro: (
        <>
          منزلي سوق للمنتجات <strong className="text-[#1c355e]">اليدوية</strong>. كل ما يُعرَض يجب أن يكون{" "}
          <strong>مصنوعًا يدويًا أو حسب الطلب من قِبَل البائع</strong> — منزلي ليس مكانًا للمنتجات المنتَجة بكميات كبيرة أو المُعاد بيعها.
        </>
      ),
      allowedTitle: "مسموح",
      allowedItems: [
        (<>ديكورات منزلية يدوية، وفنون ولوحات، وسيراميك وفخّار</>),
        (<>أعمال خشبية وأثاث يدوي (مثل مكتب خشبي حسب الطلب)</>),
        (<>أقمشة وملابس يدوية أو مفصّلة، وكروشيه وتريكو</>),
        (<>مجوهرات وإكسسوارات وحقائب ومنتجات جلدية</>),
        (<>شموع وصابون وعطور ومستحضرات تجميل يدوية</>),
        (<>أطعمة وحلويات منزلية، وأدوات قرطاسية</>),
        (<>أعمال معدنية زخرفية/فنية (قطع مطروقة أو مشغولة يدويًا)</>),
      ],
      notAllowedTitle: "غير مسموح",
      notAllowedItems: [
        (<>منتجات منتَجة بكميات كبيرة / مصنعية، أو أي شيء اشتُرِي لإعادة بيعه</>),
        (<>منتجات ماركات أو مقلّدة أو مزيّفة</>),
        (<>أعمال التصنيع الصناعي ومهن البناء — مثل شبابيك وأبواب الألومنيوم القياسية (المونتال)</>),
        (<>منتجات رقمية بحتة، أو خدمات، أو منتجات دروبشيبينغ</>),
        (<>أسلحة، أو مواد خطرة أو غير قانونية أو خاضعة للتنظيم</>),
      ],
      note: (
        <>
          قد تُزال المنتجات التي لا تنسجم مع روح العمل اليدوي، وقد تؤدي المخالفات المتكرّرة إلى تعليق المتجر. لست متأكدًا إن كانت حِرفتك مناسبة؟ راسلنا على{" "}
          <a
            href="mailto:manziliproject@gmail.com"
            className="font-medium text-[#d35400] underline-offset-2 hover:underline"
          >
            manziliproject@gmail.com
          </a>
          .
        </>
      ),
    },
  },
}

// Small reusable section heading with an anchor target.
function SectionHeading({ id, index, children }) {
  return (
    <h2
      id={id}
      className="scroll-mt-28 flex items-center gap-3 text-2xl font-bold text-[#1c355e]"
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#e67e22] text-base font-bold text-white">
        {index}
      </span>
      {children}
    </h2>
  )
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-[#ecdfca] bg-[#faf8f5] p-6 shadow-sm sm:p-8 ${className}`}
    >
      {children}
    </div>
  )
}

export default function PrivacyPolicy() {
  const { locale } = useLocale()
  const isAr = locale === "ar"
  const c = content[isAr ? "ar" : "en"]
  const f = c.fees

  return (
    <div className="bg-white" dir={isAr ? "rtl" : "ltr"}>
      {/* Hero */}
      <div className="border-b border-[#ecdfca] bg-gradient-to-br from-[#f4efe4] to-[#faf8f5]">
        <div className="mx-6">
          <div className="mx-auto max-w-4xl py-16 text-center lg:py-24">
            <span className="inline-block rounded-full bg-[#e67e22]/10 px-4 py-1 text-sm font-semibold text-[#d35400]">
              {c.badge}
            </span>
            <h1 className="mt-5 text-4xl font-bold text-[#1c355e] lg:text-5xl">
              {c.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
              {c.intro}
            </p>
            <p className="mt-4 text-sm text-slate-500">{c.lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-6">
        <div className="mx-auto max-w-5xl py-14 lg:py-20">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
            {/* Table of contents */}
            <aside className="mb-12 lg:mb-0">
              <div className="lg:sticky lg:top-24">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {c.onThisPage}
                </p>
                <nav className="space-y-1">
                  {c.sections.map((s, i) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-[#f4efe4] hover:text-[#1c355e]"
                    >
                      <span className="font-semibold text-[#e67e22]">{i + 1}.</span>
                      <span>{s.label}</span>
                    </a>
                  ))}
                </nav>
                <div className="mt-6 rounded-xl border border-[#ecdfca] bg-[#faf8f5] p-4 text-sm text-slate-600">
                  <p className="font-semibold text-[#1c355e]">{c.questionsTitle}</p>
                  <p className="mt-1">
                    {c.emailUs}{" "}
                    <a
                      href="mailto:manziliproject@gmail.com"
                      className="font-medium text-[#d35400] underline-offset-2 hover:underline"
                    >
                      manziliproject@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </aside>

            {/* Sections */}
            <div className="space-y-14">
              {/* 1. Fees & commissions */}
              <section className="space-y-5">
                <SectionHeading id="fees" index={1}>
                  {f.heading}
                </SectionHeading>
                <p className="leading-relaxed text-slate-600">{f.intro}</p>

                <div className="overflow-hidden rounded-2xl border border-[#ecdfca] shadow-sm">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-[#1c355e] text-white">
                        <th className="px-5 py-4 font-semibold">{f.tableHead.charge}</th>
                        <th className="px-5 py-4 font-semibold">{f.tableHead.who}</th>
                        <th className="px-5 py-4 font-semibold">{f.tableHead.amount}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ecdfca] bg-white text-slate-700">
                      {f.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-[#faf8f5]">
                          <td className="px-5 py-4">{row.charge}</td>
                          <td className="px-5 py-4">{row.who}</td>
                          <td className="px-5 py-4 font-semibold text-[#1c355e]">
                            {row.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Worked example */}
                <Card>
                  <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#d35400]">
                    {f.exampleTitle}
                  </p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="font-semibold text-[#1c355e]">{f.buyerPays}</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                        {f.buyerRows.map((r, i) => (
                          <li key={i} className="flex justify-between gap-4">
                            <span>{r.label}</span>
                            <span className="font-medium text-slate-700">{r.value}</span>
                          </li>
                        ))}
                        <li className="mt-2 flex justify-between gap-4 border-t border-[#ecdfca] pt-2 text-base font-bold text-[#1c355e]">
                          <span>{f.buyerTotalLabel}</span>
                          <span>{f.buyerTotalValue}</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1c355e]">{f.sellerNets}</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                        {f.sellerRows.map((r, i) => (
                          <li key={i} className="flex justify-between gap-4">
                            <span>{r.label}</span>
                            <span className="font-medium text-slate-700">{r.value}</span>
                          </li>
                        ))}
                        <li className="mt-2 flex justify-between gap-4 border-t border-[#ecdfca] pt-2 text-base font-bold text-[#1c355e]">
                          <span>{f.sellerTotalLabel}</span>
                          <span>{f.sellerTotalValue}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">{f.exampleNote}</p>
                </Card>
              </section>

              {/* 2. Customize this for me */}
              <section className="space-y-5">
                <SectionHeading id="customize" index={2}>
                  {c.customize.heading}
                </SectionHeading>
                <p className="leading-relaxed text-slate-600">{c.customize.intro}</p>

                <Card className="border-[#e67e22]/30 bg-[#e67e22]/5">
                  <p className="mb-3 font-semibold text-[#d35400]">
                    {c.customize.cardTitle}
                  </p>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-slate-700">
                    {c.customize.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[#e67e22]">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <p className="leading-relaxed text-slate-600">{c.customize.outro}</p>
              </section>

              {/* 3. What admins can see */}
              <section className="space-y-5">
                <SectionHeading id="admins" index={3}>
                  {c.admins.heading}
                </SectionHeading>
                <p className="leading-relaxed text-slate-600">{c.admins.intro}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <p className="mb-2 font-semibold text-[#1c355e]">
                      {c.admins.canSeeTitle}
                    </p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      {c.admins.canSee.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </Card>
                  <Card className="border-[#1c355e]/15 bg-white">
                    <p className="mb-2 font-semibold text-[#1c355e]">
                      {c.admins.cannotSeeTitle}
                    </p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      {c.admins.cannotSee.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </section>

              {/* 4. Security & data */}
              <section className="space-y-5">
                <SectionHeading id="security" index={4}>
                  {c.security.heading}
                </SectionHeading>
                <p className="leading-relaxed text-slate-600">{c.security.intro}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <p className="font-semibold text-[#1c355e]">
                      {c.security.accountsTitle}
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {c.security.accounts.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </Card>
                  <Card>
                    <p className="font-semibold text-[#1c355e]">
                      {c.security.paymentsTitle}
                    </p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600">
                      {c.security.payments.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </Card>
                </div>
                <p className="leading-relaxed text-slate-600">{c.security.deletion}</p>
              </section>

              {/* 5. Payment hold */}
              <section className="space-y-5">
                <SectionHeading id="holds" index={5}>
                  {c.holds.heading}
                </SectionHeading>
                <p className="leading-relaxed text-slate-600">{c.holds.intro}</p>
                <Card>
                  <p className="text-sm leading-relaxed text-slate-700">{c.holds.card}</p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-center text-xs font-semibold text-amber-700">
                      {c.holds.pending}
                    </span>
                    <span className="hidden text-[#e67e22] sm:inline">{isAr ? "←" : "→"}</span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-center text-xs font-semibold text-emerald-700">
                      {c.holds.available}
                    </span>
                    <span className="hidden text-[#e67e22] sm:inline">{isAr ? "←" : "→"}</span>
                    <span className="rounded-full bg-[#1c355e]/10 px-3 py-1 text-center text-xs font-semibold text-[#1c355e]">
                      {c.holds.withdrawable}
                    </span>
                  </div>
                </Card>
              </section>

              {/* 6. Returns */}
              <section className="space-y-5">
                <SectionHeading id="returns" index={6}>
                  {c.returns.heading}
                </SectionHeading>
                <p className="leading-relaxed text-slate-600">{c.returns.intro}</p>
                <ol className="space-y-3">
                  {c.returns.steps.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-[#ecdfca] bg-[#faf8f5] px-4 py-3"
                    >
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#e67e22] text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-slate-700">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-sm leading-relaxed text-slate-500">{c.returns.note}</p>
              </section>

              {/* 7. What you can sell */}
              <section className="space-y-5">
                <SectionHeading id="allowed" index={7}>
                  {c.allowed.heading}
                </SectionHeading>
                <p className="leading-relaxed text-slate-600">{c.allowed.intro}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-emerald-200 bg-emerald-50/40">
                    <p className="mb-2 font-semibold text-emerald-800">
                      {c.allowed.allowedTitle}
                    </p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      {c.allowed.allowedItems.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </Card>
                  <Card className="border-rose-200 bg-rose-50/40">
                    <p className="mb-2 font-semibold text-rose-800">
                      {c.allowed.notAllowedTitle}
                    </p>
                    <ul className="space-y-2 text-sm text-slate-600">
                      {c.allowed.notAllowedItems.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </Card>
                </div>
                <p className="text-sm leading-relaxed text-slate-500">{c.allowed.note}</p>
              </section>

              {/* Footer note */}
              <div className="rounded-2xl border border-[#ecdfca] bg-gradient-to-br from-[#f4efe4] to-[#faf8f5] p-6 text-center sm:p-8">
                <p className="text-slate-600">{c.footerNote}</p>
                <Link
                  href="/contact"
                  className="mt-4 inline-block rounded-xl bg-[#e67e22] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#d35400]"
                >
                  {c.contactCta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
