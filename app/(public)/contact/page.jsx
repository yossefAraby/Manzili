'use client'
import { Clock, Phone, Mail, MessageCircle, MapPin } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import Link from "next/link"
import Image from "next/image"

export default function Contact() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: ""
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            toast.error("Please fill all fields")
            return
        }

        try {
            toast.success("Message sent successfully! We'll be in touch soon.")
            setFormData({ name: "", email: "", subject: "", message: "" })
        } catch (error) {
            toast.error("Failed to send message. Please try again.")
            console.error(error)
        }
    }

    return (
        <div className="bg-white">
            {/* Hero Section with Background */}
            <div className="relative bg-gradient-to-r from-slate-50 to-blue-50 overflow-hidden">
                <div className="mx-6">
                    <div className="max-w-7xl mx-auto py-16 lg:py-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                            {/* Left Content */}
                            <div className="z-10">
                                <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 mb-6 italic">
                                    CONTACT MANZILI
                                </h1>
                                <p className="text-slate-600 text-lg leading-relaxed">
                                    We are here to help you connect with the finest home-based artisans. Whether you have a question about a product or want to join our creative community, reach out to us
                                </p>
                            </div>

                            {/* Right Decorative Image */}
                            <div className="hidden lg:block relative h-80">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-300 via-purple-300 to-blue-400 rounded-3xl opacity-20"></div>
                                <div className="flex items-center justify-center h-full text-6xl">
                                    🧵✨
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Info Cards */}
            <div className="mx-6">
                <div className="max-w-7xl mx-auto my-16">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        {/* Phone */}
                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition text-center border border-slate-100">
                            <div className="flex justify-center mb-4">
                                <Phone className="w-8 h-8 text-[#2582eb]" />
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2 text-sm sm:text-base">Phone</h3>
                            <a href="tel:+201223755058" className="text-slate-600 hover:text-[#2582eb] transition text-sm">
                                01223755058
                            </a>
                        </div>

                        {/* WhatsApp */}
                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition text-center border border-slate-100">
                            <div className="flex justify-center mb-4">
                                <MessageCircle className="w-8 h-8 text-[#2582eb]" />
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2 text-sm sm:text-base">WhatsApp</h3>
                            <Link 
                                href="https://wa.me/201223755058" 
                                target="_blank"
                                className="text-slate-600 hover:text-[#2582eb] transition text-sm"
                            >
                                01223755058
                            </Link>
                        </div>

                        {/* Email */}
                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition text-center border border-slate-100">
                            <div className="flex justify-center mb-4">
                                <Mail className="w-8 h-8 text-[#2582eb]" />
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2 text-sm sm:text-base">Email</h3>
                            <a href="mailto:manziliproject@gmail.com" className="text-slate-600 hover:text-[#2582eb] transition text-sm break-all">
                                manziliproject@gmail.com
                            </a>
                        </div>

                        {/* Working Hours */}
                        <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition text-center border border-slate-100">
                            <div className="flex justify-center mb-4">
                                <Clock className="w-8 h-8 text-[#2582eb]" />
                            </div>
                            <h3 className="font-bold text-slate-800 mb-2 text-sm sm:text-base">Hours</h3>
                            <p className="text-slate-600 text-sm">
                                Sun-Thu<br/>9:00 AM - 5:00 PM
                            </p>
                        </div>
                    </div>

                    {/* Main Contact Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-8 space-y-6 border border-slate-200">
                                <h2 className="text-2xl font-bold text-slate-800 mb-6">Send us a Message</h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Your name"
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#2582eb] focus:ring-2 focus:ring-[#2582eb]/20 outline-none transition"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="example@gmail.com"
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#2582eb] focus:ring-2 focus:ring-[#2582eb]/20 outline-none transition"
                                        />
                                    </div>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        placeholder="Type here"
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#2582eb] focus:ring-2 focus:ring-[#2582eb]/20 outline-none transition"
                                    />
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        placeholder="Type here"
                                        rows="5"
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#2582eb] focus:ring-2 focus:ring-[#2582eb]/20 outline-none transition resize-none"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="w-full bg-[#2582eb] text-white font-bold py-3 rounded-lg hover:bg-[#1c5cc5] active:scale-95 transition duration-200"
                                >
                                    Send Now
                                </button>
                            </form>
                        </div>

                        {/* Detailed Info */}
                        <div className="space-y-6">
                            {/* Phone Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <Phone className="w-6 h-6 text-[#2582eb]" />
                                    <h3 className="font-bold text-slate-800">Phone</h3>
                                </div>
                                <p className="text-slate-600 text-sm">01223755058</p>
                            </div>

                            {/* WhatsApp Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <MessageCircle className="w-6 h-6 text-[#2582eb]" />
                                    <h3 className="font-bold text-slate-800">WhatsApp</h3>
                                </div>
                                <Link 
                                    href="https://wa.me/201223755058" 
                                    target="_blank"
                                    className="text-slate-600 hover:text-[#2582eb] transition text-sm"
                                >
                                    01223755058
                                </Link>
                            </div>

                            {/* Email Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <Mail className="w-6 h-6 text-[#2582eb]" />
                                    <h3 className="font-bold text-slate-800">Email</h3>
                                </div>
                                <a href="mailto:manziliproject@gmail.com" className="text-slate-600 hover:text-[#2582eb] transition text-sm break-all">
                                    manziliproject@gmail.com
                                </a>
                            </div>

                            {/* Hours Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <Clock className="w-6 h-6 text-[#2582eb]" />
                                    <h3 className="font-bold text-slate-800">Working Hours</h3>
                                </div>
                                <p className="text-slate-600 text-sm">
                                    Sunday - Thursday<br/>
                                    9:00 AM - 5:00 PM
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Map Section */}
                    <div className="mb-16">
                        <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">Find Us</h2>
                        <div className="rounded-2xl overflow-hidden shadow-lg h-96 bg-slate-200 flex items-center justify-center border border-slate-200">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3453.5476050773826!2d31.235245!3d30.033333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x145840abf8e8e8e9%3A0x123!2sCairo%2C%20Egypt!5e0!3m2!1sen!2sus!4v1234567890"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
