import Link from "next/link";
import Image from "next/image";
import { assets } from "@/assets/assets";
import { Phone, Mail, Github, Presentation, FileText } from "lucide-react";

const Footer = () => {

    const MailIcon = () => <Mail size={16} strokeWidth={1.5} />;
    const PhoneIcon = () => <Phone size={16} strokeWidth={1.5} />;

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
        { icon: Github, label: "GitHub", link: "https://github.com/yossefAraby/Manzili" },
        { icon: Presentation, label: "Overview Presentation", link: "#" },
        { icon: FileText, label: "Documentation", link: "#" },
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
        suppressHydrationWarning
    />
</Link>
                        <p className="max-w-[410px] mt-6 text-sm">Manzili, where real craft finds its home. We offer a dual-model marketplace: browse our gallery of ready-to-buy artisanal items or collaborate directly with makers to commission a one-of-a-kind bespoke piece. No factory-made commodities—just unique items made with love by verified local artisans.</p>
                        <div className="flex items-center gap-3 mt-5">
                            {socialIcons.map((item, i) => (
                                <Link
                                    href={item.link}
                                    key={i}
                                    aria-label={item.label}
                                    title={item.label}
                                    className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:scale-105 hover:border border-slate-300 transition rounded-full"
                                >
                                    <item.icon size={18} strokeWidth={1.7} />
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
                        <div className="mt-3 flex bg-slate-100 text-sm p-1 rounded-full w-full border border-slate-200">
                            <input
                                suppressHydrationWarning
                                className="flex-1 pl-4 outline-none bg-transparent"
                                type="text"
                                placeholder="Join newsletter with your email"
                            />
                            <button className="font-medium bg-[#2582eb] text-white px-5 py-2 rounded-full hover:scale-103 active:scale-95 transition">
                                Subscribe
                            </button>
                        </div>
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
