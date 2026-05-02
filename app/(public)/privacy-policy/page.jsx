'use client'
import { useState } from 'react'

export default function PrivacyPolicy() {
    const [activeSection, setActiveSection] = useState('privacy')

    const sections = {
        privacy: {
            title: "Privacy Policy",
            content: [
                {
                    heading: "1. Introduction",
                    text: "At Manzili, we are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services."
                },
                {
                    heading: "2. Information We Collect",
                    text: "We collect information you provide directly to us, such as when you create an account, make a purchase, contact us, or subscribe to our newsletter. This may include:\n• Name and contact information\n• Email address and phone number\n• Billing and shipping addresses\n• Payment information\n• Profile information and preferences\n• Communications and inquiries\n\nWe also automatically collect certain information when you visit our website, including:\n• IP address and browser type\n• Pages visited and time spent\n• Referral sources\n• Device information\n• Cookies and tracking pixels"
                },
                {
                    heading: "3. How We Use Your Information",
                    text: "We use the information we collect for various purposes, including:\n• Processing transactions and sending related information\n• Creating and managing your account\n• Sending promotional communications (with your consent)\n• Responding to your inquiries and customer service requests\n• Improving our website and services\n• Detecting and preventing fraud\n• Complying with legal obligations\n• Personalizing your shopping experience"
                },
                {
                    heading: "4. Information Sharing",
                    text: "We do not sell, trade, or rent your personal information to third parties. However, we may share your information with:\n• Service providers who assist us in operating our website and conducting business\n• Payment processors and financial institutions\n• Shipping partners to deliver your orders\n• Legal authorities when required by law\n• Third parties with your explicit consent"
                },
                {
                    heading: "5. Data Security",
                    text: "We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is completely secure, and we cannot guarantee absolute security."
                },
                {
                    heading: "6. Cookies and Tracking",
                    text: "Our website uses cookies and similar tracking technologies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can control cookie settings through your browser, but disabling cookies may affect website functionality."
                },
                {
                    heading: "7. Your Rights",
                    text: "Depending on your location, you may have certain rights regarding your personal information, including:\n• Right to access your personal data\n• Right to correct inaccurate information\n• Right to delete your information\n• Right to opt-out of marketing communications\n• Right to data portability\n\nTo exercise these rights, please contact us at manziliproject@gmail.com"
                },
                {
                    heading: "8. Children's Privacy",
                    text: "Manzili is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information and terminate the child's account."
                },
                {
                    heading: "9. Changes to Privacy Policy",
                    text: "We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any significant changes by posting the updated policy on our website and updating the 'Last Updated' date."
                },
                {
                    heading: "10. Contact Us",
                    text: "If you have questions or concerns about this Privacy Policy or our privacy practices, please contact us:\n\nEmail: manziliproject@gmail.com\nPhone: 01223755058\nWhatsApp: 01223755058"
                }
            ]
        },
        terms: {
            title: "Terms & Conditions",
            content: [
                {
                    heading: "1. Agreement to Terms",
                    text: "By accessing and using Manzili, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you may not use our website or services."
                },
                {
                    heading: "2. Use License",
                    text: "We grant you a limited, non-exclusive, non-transferable license to access and use Manzili for personal, non-commercial purposes. You agree not to:\n• Reproduce, duplicate, copy, or sell any content or services\n• Attempt to gain unauthorized access to our systems\n• Use automated tools to scrape or collect data\n• Engage in any illegal or unethical activities\n• Harass, abuse, or threaten other users or staff"
                },
                {
                    heading: "3. Product Information",
                    text: "Manzili is a marketplace for handmade and artisanal products from verified local artisans. We strive to provide accurate product descriptions, images, and pricing. However:\n• We do not guarantee that product information is completely accurate or error-free\n• Products are subject to availability\n• Prices may change without notice\n• Product images are for illustrative purposes"
                },
                {
                    heading: "4. Purchasing and Payment",
                    text: "When you make a purchase on Manzili:\n• You represent that you are legally able to enter into binding contracts\n• You agree to provide accurate billing and shipping information\n• Payment must be received before order processing\n• We accept various payment methods as displayed on our website\n• All sales are final unless otherwise specified in our refund policy"
                },
                {
                    heading: "5. Shipping and Delivery",
                    text: "Manzili works with shipping partners to deliver your orders. Please note:\n• Delivery timeframes are estimates and not guarantees\n• Risk of loss transfers to you upon carrier pickup\n• We are not responsible for delays caused by carriers or circumstances beyond our control\n• You are responsible for providing accurate delivery addresses\n• Shipping costs are non-refundable"
                },
                {
                    heading: "6. Returns and Refunds",
                    text: "Handmade products are unique and custom-made by artisans. Returns and refunds are subject to:\n• Product condition upon receipt\n• Compliance with our return policy timeframe\n• Reason for return (damage, defect, or buyer's remorse)\n• Refunds are processed within 7-14 business days\n• Return shipping costs may apply\n\nPlease contact us for specific return inquiries."
                },
                {
                    heading: "7. Intellectual Property Rights",
                    text: "All content on Manzili, including text, graphics, logos, images, and software, is the property of Manzili or our content suppliers and is protected by copyright and trademark laws. You may not reproduce or use our content without permission."
                },
                {
                    heading: "8. Seller Responsibilities",
                    text: "For sellers on Manzili:\n• You are responsible for the accuracy of your product listings\n• You must comply with all applicable laws and regulations\n• You must provide quality products as described\n• You are responsible for customer service and dispute resolution\n• Manzili reserves the right to remove listings or accounts that violate our policies"
                },
                {
                    heading: "9. User Accounts",
                    text: "If you create an account on Manzili:\n• You are responsible for maintaining the confidentiality of your password\n• You are responsible for all activities under your account\n• You agree to provide accurate and complete information\n• You must notify us immediately of any unauthorized access\n• We reserve the right to suspend or terminate accounts that violate our terms"
                },
                {
                    heading: "10. Limitation of Liability",
                    text: "To the fullest extent permitted by law, Manzili and its officers, directors, employees, and agents are not liable for:\n• Indirect, incidental, special, consequential, or punitive damages\n• Loss of profits, data, or business opportunities\n• Any damages arising from your use of or inability to use our website or services\n• Third-party actions or content\n\nOur total liability shall not exceed the amount you paid for your purchase."
                },
                {
                    heading: "11. Disclaimer",
                    text: "Manzili is provided 'as is' and 'as available' without warranties of any kind, either express or implied. We do not guarantee that:\n• Our website will be uninterrupted or error-free\n• Defects will be corrected\n• Our website is free from viruses or harmful components\n• Results will meet your expectations"
                },
                {
                    heading: "12. Indemnification",
                    text: "You agree to indemnify and hold harmless Manzili and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:\n• Your use of our website or services\n• Your violation of these Terms & Conditions\n• Your infringement of any third-party rights\n• Your user-generated content"
                },
                {
                    heading: "13. Dispute Resolution",
                    text: "Any disputes arising from these Terms & Conditions or your use of Manzili shall be resolved through:\n• Negotiation and good faith discussion\n• Mediation if negotiation fails\n• Arbitration or legal proceedings as a last resort\n\nThese disputes shall be governed by the laws of Egypt."
                },
                {
                    heading: "14. Changes to Terms",
                    text: "Manzili reserves the right to modify these Terms & Conditions at any time. Changes will be effective upon posting to our website. Your continued use of our website constitutes acceptance of the updated terms."
                },
                {
                    heading: "15. Termination",
                    text: "Manzili may terminate or suspend your account and access to our website:\n• For violation of these Terms & Conditions\n• For illegal or unethical activities\n• For fraud or misrepresentation\n• For non-payment of amounts owed\n• At our sole discretion for any reason"
                },
                {
                    heading: "16. Contact Information",
                    text: "For questions or concerns regarding these Terms & Conditions, please contact us:\n\nEmail: manziliproject@gmail.com\nPhone: 01223755058\nWhatsApp: 01223755058"
                }
            ]
        }
    }

    const currentContent = sections[activeSection]

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50">
                <div className="mx-6">
                    <div className="max-w-4xl mx-auto py-16 lg:py-24">
                        <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 text-center mb-4">
                            Legal Information
                        </h1>
                        <p className="text-center text-slate-600 text-lg">
                            Understand our policies and terms that govern your use of Manzili
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
                            onClick={() => setActiveSection('privacy')}
                            className={`px-6 py-4 font-semibold text-lg transition-all border-b-2 ${
                                activeSection === 'privacy'
                                    ? 'text-[#2582eb] border-[#2582eb]'
                                    : 'text-slate-600 border-transparent hover:text-slate-800'
                            }`}
                        >
                            Privacy Policy
                        </button>
                        <button
                            onClick={() => setActiveSection('terms')}
                            className={`px-6 py-4 font-semibold text-lg transition-all border-b-2 ${
                                activeSection === 'terms'
                                    ? 'text-[#2582eb] border-[#2582eb]'
                                    : 'text-slate-600 border-transparent hover:text-slate-800'
                            }`}
                        >
                            Terms & Conditions
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-12">
                        <h2 className="text-3xl font-bold text-slate-800">{currentContent.title}</h2>
                        
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
                            <p>Last updated: May 2026</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
