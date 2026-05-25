"use client";

const faqs = [
  {
    q: "What is Manzili?",
    a: "Manzili is a multi-vendor marketplace dedicated to handmade products. We connect Egyptian artisans with buyers who value handcrafted work — through a curated gallery of ready-to-buy pieces and a custom-commission portal for bespoke requests.",
  },
  {
    q: "How do I buy a product?",
    a: "Browse our shop, click on any product to view details, select your preferred variant (size, color, etc.), and click \"Add to Cart\". When you're ready, go to the Cart page and proceed to checkout where you can pay securely via Stripe.",
  },
  {
    q: "How do I request a custom item?",
    a: "Navigate to the Custom Requests page and click \"Add New Request\". Fill in the details of what you're looking for — description, category, images, and budget. Artisans can then view your request and send you proposals. You can negotiate details through the built-in messaging system.",
  },
  {
    q: "How do I become a seller?",
    a: "Create an account and navigate to the \"Create Your Store\" page from the footer. Fill in your store details and submit for approval. An admin will review your application, and once approved, you can start listing your handmade products.",
  },
  {
    q: "How do returns work?",
    a: "Visit our Returns page for detailed information on our return policy. Eligible items can be returned within the specified period. Make sure your items are in their original condition.",
  },
  {
    q: "How do I track my order?",
    a: "You can view all your orders and their current status on the Orders page in your account. Statuses include processing, shipped, and delivered. Once shipped, tracking information will be available if provided by the seller.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes, all payments are processed securely through Stripe, a PCI-compliant payment processor. We do not store your payment details on our servers.",
  },
  {
    q: "How do I contact support?",
    a: "You can reach us via email at manziliproject@gmail.com or by phone at 01223755058. Our contact information is also available in the footer of every page.",
  },
];

export default function FAQPage() {
  return (
    <div className="mx-6">
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="text-2xl text-slate-500 mb-8">
          Frequently Asked <span className="text-slate-800 font-medium">Questions</span>
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
