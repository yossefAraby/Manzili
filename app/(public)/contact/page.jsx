'use client'
import { MapPin, Phone, Mail } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"

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
        
        // Validation
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            toast.error("Please fill all fields")
            return
        }

        try {
            // Add your API call here
            // const response = await fetch('/api/contact', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(formData)
            // })

            toast.success("Message sent successfully! We'll be in touch soon.")
            setFormData({ name: "", email: "", subject: "", message: "" })
        } catch (error) {
            toast.error("Failed to send message. Please try again.")
            console.error(error)
        }
    }

    return (
        <div className="mx-6">
            <div className="max-w-7xl mx-auto my-16">
                {/* Page Title */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 mb-4">
                        Get in <span className="text-[#2582eb]">Touch</span>
                    </h1>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact Information */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Email */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <Mail className="w-6 h-6 text-[#2582eb]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-2">Email</h3>
                                <p className="text-slate-600">contact@manzili.com</p>
                                <p className="text-slate-600">support@manzili.com</p>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <Phone className="w-6 h-6 text-[#2582eb]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-2">Phone</h3>
                                <p className="text-slate-600">+20 100 123 4567</p>
                                <p className="text-slate-600">+20 100 987 6543</p>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="flex gap-4">
                            <div className="flex-shrink-0">
                                <MapPin className="w-6 h-6 text-[#2582eb]" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 mb-2">Address</h3>
                                <p className="text-slate-600">
                                    Manzili Headquarters
                                    <br />
                                    Cairo, Egypt
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#2582eb] focus:ring-2 focus:ring-[#2582eb]/20 outline-none transition"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Your Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="john@example.com"
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
                                    onChange={handleChange}
                                    placeholder="How can we help?"
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
                                    placeholder="Tell us more about your inquiry..."
                                    rows="6"
                                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#2582eb] focus:ring-2 focus:ring-[#2582eb]/20 outline-none transition resize-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="w-full bg-[#2582eb] text-white font-medium py-3 rounded-lg hover:bg-[#1c5cc5] active:scale-95 transition duration-200"
                            >
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
