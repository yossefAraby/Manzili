'use client'
import { Clock, Phone, Mail, MessageCircle } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import Link from "next/link"

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

    const contactMethods = [
        {
            icon: Phone,
            title: "Phone",
            description: "01223755058",
            action: "tel:+201223755058"
        },
        {
            icon: MessageCircle,
            title: "WhatsApp",
            description: "01223755058",
            action: "https://wa.me/201223755058"
        },
        {
            icon: Mail,
            title: "Email",
            description: "manziliproject@gmail.com",
            action: "mailto:manziliproject@gmail.com"
        },
        {
            icon: Clock,
            title: "Working Hours",
            description: "Sunday - Thursday\n9:00 AM - 5:00 PM",
            action: null
        }
    ]

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-slate-50 to-blue-50">
                <div className="mx-6">
                    <div className="max-w-7xl mx-auto py-20 lg:py-28">
                        <div className="text-center">
                            <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 mb-6 italic">
                                CONTACT MANZILI
                            </h1>
                            <p className="text-slate-600 text-lg leading-relaxed max-w-3xl mx-auto">
                                We are here to help you connect with the finest home-based artisans. Whether you have a question about a product or want to join our creative community, reach out to us
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Methods - Vertical Column */}
            <div className="mx-6">
                <div className="max-w-7xl mx-auto my-16">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Contact Methods Column */}
                        <div className="space-y-6">
                            {contactMethods.map((method, index) => {
                                const Icon = method.icon
                                const isClickable = method.action !== null
                                const Component = isClickable ? Link : 'div'
                                
                                return (
                                    <Component
                                        key={index}
                                        href={method.action || '#'}
                                        target={method.action?.startsWith('http') ? '_blank' : undefined}
                                        className={`p-6 rounded-2xl shadow-lg border border-slate-100 transition-all ${
                                            isClickable 
                                                ? 'bg-white hover:shadow-xl hover:border-[#2582eb] cursor-pointer' 
                                                : 'bg-white'
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0">
                                                <Icon className="w-8 h-8 text-[#2582eb]" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-800 mb-1 text-lg">{method.title}</h3>
                                                <p className="text-slate-600 text-sm whitespace-pre-line">
                                                    {method.description}
                                                </p>
                                            </div>
                                        </div>
                                    </Component>
                                )
                            })}
                        </div>

                        {/* Contact Form */}
                        <div>
                            <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-8 space-y-6 border border-slate-200 h-full">
                                <h2 className="text-2xl font-bold text-slate-800 mb-6">Send us a Message</h2>

                                <div className="space-y-6">
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
                                            rows="4"
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
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
