import Link from "next/link";
import Image from "next/image";
import { assets } from "@/assets/assets";
import { Phone, Mail } from "lucide-react";

const Footer = () => {

    const MailIcon = () => <Mail size={16} strokeWidth={1.5} />;
    const PhoneIcon = () => <Phone size={16} strokeWidth={1.5} />;
    const MapPinIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M13.3346 6.66634C13.3346 9.99501 9.64197 13.4617 8.40197 14.5309C8.18863 14.7143 7.81197 14.7143 7.59863 14.5309C6.35863 13.4617 2.66797 9.99501 2.66797 6.66634C2.66797 4.45234 5.19463 2.66634 8.00130 2.66634C10.8079 2.66634 13.3346 4.45234 13.3346 6.66634ZM10.0013 6.66634C10.0013 7.40234 9.40063 8.00301 8.66463 8.00301C7.92863 8.00301 7.32797 7.40234 7.32797 6.66634C7.32797 5.93034 7.92863 5.32967 8.66463 5.32967C9.40063 5.32967 10.0013 5.93034 10.0013 6.66634Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> </svg>);
    const WhatsAppIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M12.6667 3.33333C11.3333 2 9.33333 1.33333 8 1.33333C4.33333 1.33333 1.33333 4.33333 1.33333 8C1.33333 9.33333 1.66667 10.6667 2.33333 11.8333L1.33333 14.6667L4.16667 13.6667C5.33333 14.3333 6.66667 14.6667 8 14.6667C11.6667 14.6667 14.6667 11.6667 14.6667 8C14.6667 6.66667 14.3333 4.66667 12.6667 3.33333ZM8 13.3333C6.8 13.3333 5.73333 13.0667 4.8 12.5333L4.53333 12.4L2.66667 13L3.33333 11.2667L3.16667 11C2.53333 10 2.2 8.8 2.2 8C2.2 5.13333 4.53333 2.8 7.4 2.8C8.53333 2.8 9.6 3.13333 10.4667 3.8C11.3333 4.46667 12 5.4 12.2 6.46667C12.5333 7.73333 12.2667 9.13333 11.3333 10.1333C10.4 11.1333 9.2 11.8 8 13.3333ZM11.2 9.33333C10.9333 9.2 10.5333 8.93333 10.2 8.6C9.93333 8.33333 9.8 8.26667 9.46667 8.26667C9.13333 8.26667 8.93333 8.4 8.73333 8.6C8.53333 8.8 7.86667 9.53333 7.66667 9.73333C7.46667 9.93333 7.26667 9.93333 6.93333 9.73333C6.2 9.33333 5.53333 8.8 5.06667 8.06667C4.8 7.66667 5.06667 7.4 5.26667 7.2C5.46667 7 5.66667 6.8 5.86667 6.6C6.06667 6.4 6.13333 6.2 6.26667 6C6.4 5.8 6.33333 5.6 6.2 5.46667C6.06667 5.33333 5.46667 4 5.2 3.46667C5 3 4.8 3.06667 4.66667 3.06667C4.53333 3.06667 4.33333 3.06667 4.13333 3.06667C3.93333 3.06667 3.6 3.2 3.4 3.4C3.2 3.6 2.53333 4.26667 2.53333 5.33333C2.53333 6.4 3.4 7.4 3.53333 7.6C3.66667 7.8 5.06667 10 7.06667 10.8C7.6 11 8.06667 11.1333 8.46667 11.2C9 11.3333 9.53333 11.3 9.93333 11.1333C10.4 10.9333 10.9333 10.5333 11.2 10.1C11.4667 9.66667 11.4667 9.46667 11.3333 9.33333C11.3333 9.33333 11.4667 9.4 11.2 9.33333Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/> </svg>);
    const FacebookIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.9987 1.66699H12.4987C11.3936 1.66699 10.3338 2.10598 9.55547 2.88431C8.77714 3.66264 8.33816 4.72246 8.33816 5.82755V8.33366H5.83203V11.667H8.33816V18.3337H11.6715V11.667H14.1776L14.9987 8.33366H11.6715V5.82755C11.6715 5.59088 11.7625 5.36421 11.9243 5.20241C12.0861 5.04061 12.3128 4.94966 12.5495 4.94966H14.9987V1.66699Z" fill="currentColor"/> </svg>);
    const InstagramIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M14.5846 5.41699H14.593M5.83464 1.66699H14.168C16.4692 1.66699 18.3346 3.53229 18.3346 5.83366V14.1671C18.3346 16.4684 16.4692 18.3337 14.168 18.3337H5.83464C3.5333 18.3337 1.66797 16.4684 1.66797 14.1671V5.83366C1.66797 3.53229 3.5333 1.66699 5.83464 1.66699ZM13.8346 9.58366C13.8346 10.1188 13.6445 10.6423 13.2964 11.0575C12.9482 11.4727 12.4594 11.7598 11.9163 11.869C11.3731 11.9782 10.8064 11.9019 10.3128 11.6509C9.81931 11.3998 9.43099 10.9883 9.20258 10.4887C8.97417 9.98907 8.91772 9.42468 9.04397 8.88746C9.17021 8.35023 9.47037 7.87639 9.90384 7.53854C10.3373 7.2007 10.8719 7.01699 11.4179 7.01699C11.9639 7.01699 12.4985 7.2007 12.932 7.53854C13.3655 7.87639 13.6656 8.35023 13.7919 8.88746C13.9181 9.42468 13.8617 9.98907 13.6332 10.4887C13.4048 10.9883 13.0165 11.3998 12.523 11.6509" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> </svg>);
    const TwitterIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M18.3346 3.33368C18.3346 3.33368 17.7513 5.08368 16.668 6.16701C16.168 11.0003 12.0013 15.167 6.16797 15.167C4.33464 15.167 2.66797 14.667 1.33464 13.8337C1.33464 13.8337 1.33464 13.667 1.33464 13.5003C1.33464 11.667 2.5013 10.167 4.0013 9.83368C3.5013 9.75035 3.0013 9.66701 2.5013 9.58368C2.5013 7.83368 3.66797 6.33368 5.16797 5.83368C4.83464 5.75035 4.5013 5.66701 4.16797 5.75035C4.5013 4.08368 5.83464 2.83368 7.5013 2.83368C6.33464 1.83368 4.83464 1.16701 3.16797 1.16701C3.0013 1.16701 2.83464 1.16701 2.66797 1.16701C4.33464 0.0836792 6.33464 -0.416321 8.5013 -0.416321C14.668 -0.416321 18.3346 3.25035 18.3346 7.91701C18.3346 8.08368 18.3346 8.25035 18.3346 8.41701C19.0013 7.83368 19.5013 7.08368 18.3346 3.33368Z" fill="currentColor"/> </svg>);
    const LinkedinIcon = () => (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M13.3346 6.66699C14.6607 6.66699 15.9325 7.19378 16.8702 8.13147C17.8079 9.06916 18.3346 10.3409 18.3346 11.667V18.3337H15.668V11.667C15.668 11.2052 15.4773 10.7621 15.1397 10.4245C14.8021 10.0869 14.3589 9.89699 13.8972 9.89699C13.4354 9.89699 12.9923 10.0869 12.6547 10.4245C12.3171 10.7621 12.1271 11.2052 12.1271 11.667V18.3337H9.46046V11.667C9.46046 10.3409 9.98725 9.06916 10.9249 8.13147C11.8626 7.19378 13.1344 6.66699 14.4605 6.66699H13.3346ZM6.66797 5.83366C7.36421 5.83366 8.03188 5.5623 8.53197 5.06221C9.03207 4.56211 9.3034 3.89444 9.3034 3.19821C9.3034 2.50197 9.03207 1.8343 8.53197 1.3342C8.03188 0.834108 7.36421 0.5627747 6.66797 0.5627747C5.97174 0.5627747 5.30407 0.834108 4.80397 1.3342C4.30388 1.8343 4.03255 2.50197 4.03255 3.19821C4.03255 3.89444 4.30388 4.56211 4.80397 5.06221C5.30407 5.5623 5.97174 5.83366 6.66797 5.83366ZM9.16797 18.3337H4.16797V6.66699H9.16797V18.3337ZM19.168 10.3337C19.168 8.40033 18.4346 6.61699 17.1846 5.36699C15.9346 4.11699 14.1513 3.38366 12.2179 3.38366C10.2846 3.38366 8.50128 4.11699 7.25128 5.36699C6.00128 6.61699 5.26797 8.40033 5.26797 10.3337V18.3337H1.66797V0H5.26797V2.08366C6.3013 0.916992 7.94297 0 9.66797 0C11.3929 0 13.0346 0.916992 14.0679 2.08366C15.1013 3.25033 15.668 4.75033 15.668 6.33366V18.3337H12.0679V6.33366C12.0679 5.52533 11.7596 4.75033 11.2179 4.20866C10.6763 3.66699 9.95128 3.36699 9.1846 3.36699C8.41797 3.36699 7.69297 3.66699 7.15128 4.20866C6.60961 4.75033 6.30128 5.52533 6.30128 6.33366V18.3337H2.70128V10.3337C2.70128 8.71366 3.27128 7.21866 4.30794 6.18199C5.34461 5.14533 6.83961 4.58366 8.45128 4.58366C10.0596 4.58366 11.5513 5.14533 12.588 6.18199C13.6246 7.21866 14.1846 8.71366 14.1846 10.3337V18.3337H10.5846V10.3337" fill="currentColor"/> </svg>);

    const linkSections = [
        {
            title: "Who We Are",
            links: [
                { text: "About Us", path: '/about', icon: null },
                { text: "FAQs", path: '#', icon: null },
                { text: "Contact Us", path: '/contact', icon: null },
                { text: "Returns", path: '#', icon: null },
            ]
        },
        {
            title: "WEBSITE?",
            links: [
                { text: "Home", path: '/', icon: null },
                { text: "Privacy Policy", path: '/privacy-policy', icon: null },
                { text: "Request Bespoke Item", path: '/custom-products', icon: null },
                { text: "Create Your Store", path: '/create-store', icon: null },
            ]
        },
        {
            title: "CONTACT",
            links: [
                { text: "01223755058", path: '/', icon: PhoneIcon },
                { text: "manziliproject@gmail.com", path: '/', icon: MailIcon }
            ]
        }
    ];

    const socialIcons = [
        { icon: FacebookIcon, link: "https://www.facebook.com" },
        { icon: InstagramIcon, link: "https://www.instagram.com" },
        { icon: TwitterIcon, link: "https://twitter.com" },
        { icon: LinkedinIcon, link: "https://www.linkedin.com" },
    ]

    return (
        <footer className="mx-6 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-slate-500/30 text-slate-500">
                    <div>
                        <Link href="/" className="flex items-center gap-3 text-5xl font-bold font-sans">
    <div className="flex items-baseline">
        <span className="text-[#1c355e]">M</span>
        <span className="bg-gradient-to-b from-[#e3cda8] to-[#aa804c] text-transparent bg-clip-text">
            anzili
        </span>
    </div>

    <Image 
        src={assets.logo} 
        alt="logo" 
        width={50} 
        height={50} 
        className="object-contain" 
    />
</Link>
                        <p className="max-w-[410px] mt-6 text-sm">Manzili, where real craft finds its home. We offer a dual-model marketplace: browse our gallery of ready-to-buy artisanal items or collaborate directly with makers to commission a one-of-a-kind bespoke piece. No factory-made commodities—just unique items made with love by verified local artisans.</p>
                        <div className="flex items-center gap-3 mt-5">
                            {socialIcons.map((item, i) => (
                                <Link href={item.link} key={i} className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:scale-105 hover:border border-slate-300 transition rounded-full">
                                    <item.icon />
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-between w-full md:w-[45%] gap-5 text-sm ">
                        {linkSections.map((section, index) => (
                            <div key={index}>
                                <h3 className="font-medium text-slate-700 md:mb-5 mb-3">{section.title}</h3>
                                <ul className="space-y-2.5">
                                    {section.links.map((link, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            {link.icon && <link.icon />}
                                            <Link href={link.path} className="hover:underline transition">{link.text}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="py-4 text-sm text-slate-500">
                    Copyright 2026 © Manzili All Right Reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
