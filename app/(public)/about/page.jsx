'use client'

export default function AboutPage() {
    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto py-8">
                {/* Header */}
                <h1 className="text-4xl font-bold text-slate-800 mb-6">About Us – Manzili</h1>
                
                {/* Introduction */}
                <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200">
                    <p className="text-slate-700 text-lg">
                        <strong>Manzili is a specialized multi-vendor e-commerce platform dedicated strictly to handmade products.</strong> Developed as an MIS graduation project under the supervision of <strong>Dr. Abeer</strong>, our team built this platform from the ground up—wearing all the hats from software engineering to community management and quality control.
                    </p>
                </div>

                {/* Mission */}
                <div className="mb-10">
                    <h2 className="text-3xl font-semibold text-slate-800 mb-4">Our Mission</h2>
                    <div className="space-y-4 text-slate-700">
                        <p>
                            The Egyptian handmade industry is full of talent, but it is highly fragmented. Local artisans face a "visibility paradox," struggling to compete on general e-commerce platforms designed for mass-produced goods.
                        </p>
                        <p>
                            Manzili was created to solve this. We serve as a bridge connecting skilled artisans with customers who truly value the quality and uniqueness of handcrafted goods.
                        </p>
                    </div>
                </div>

                {/* How We Stand Out */}
                <div className="mb-10">
                    <h2 className="text-3xl font-semibold text-slate-800 mb-4">How We Stand Out</h2>
                    <p className="text-slate-700 mb-4">
                        We empower makers and buyers through a unique dual-model storefront:
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Ready-to-Buy Gallery</h3>
                            <p className="text-slate-700">
                                A curated marketplace for fixed-price, 100% handcrafted items.
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Custom Commissions</h3>
                            <p className="text-slate-700">
                                A dedicated portal where buyers can request bespoke, tailored pieces and negotiate directly with the makers.
                            </p>
                        </div>
                    </div>
                </div>

                <hr className="my-10 border-slate-300" />

                {/* Team */}
                <div>
                    <h2 className="text-3xl font-semibold text-slate-800 mb-8">The Project Team</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { name: "Yossef Elaraby", role: "Team Leader", desc: "Overall coordination & delivery" },
                            { name: "Dynamo", role: "Backend Lead & Developer (Python)", desc: "Architecture & API design" },
                            { name: "Mohamed Abd El-Qader", role: "Backend Developer (.Net)", desc: "" },
                            { name: "Ali Elsayed", role: "Backend Developer (Spring Boot)", desc: "" },
                            { name: "Youssef Samak", role: "Database Design & Implementation", desc: "" },
                            { name: "Yehiya", role: "Design & UI/UX", desc: "" },
                            { name: "Fares", role: "Frontend Web Developer", desc: "" },
                            { name: "Mahmoud Nagi", role: "Frontend Web Developer", desc: "Redirected from Mobile/Flutter" },
                            { name: "Marwan", role: "Frontend Web Developer", desc: "Redirected from Mobile/Flutter" },
                            { name: "Nour", role: "Frontend Web Developer", desc: "Redirected from Analysis" },
                            { name: "Ahmed El-Sayed", role: "Data Analysis Lead", desc: "" },
                            { name: "Mahmod Eid", role: "Data Analysis & Web QA Tester", desc: "" },
                            { name: "Adham", role: "Data Analyst", desc: "" },
                        ].map((member, idx) => (
                            <div key={idx} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-bold text-slate-800">{member.name}</h3>
                                <p className="text-slate-700 font-medium">{member.role}</p>
                                {member.desc && <p className="text-slate-600 text-sm mt-1 italic">{member.desc}</p>}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}