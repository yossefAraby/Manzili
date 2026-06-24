import { Outfit } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "Manzili",
    description: "Manzili, where real craft finds its home.",
};

// Without this, Android browsers default to a ~980px layout viewport, so Tailwind's
// responsive breakpoints mis-fire on phones (e.g. the seller top navbar stays visible).
export const viewport = {
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" dir="ltr" suppressHydrationWarning>
            <body className={`${outfit.className} antialiased`}>
                <StoreProvider>
                    <LocaleProvider>
                        <Toaster />
                        {children}
                    </LocaleProvider>
                </StoreProvider>
                {/* Google Identity Services — powers the "Continue with Google" button.
                    Harmless when NEXT_PUBLIC_GOOGLE_CLIENT_ID is unset (button renders nothing). */}
                <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
            </body>
        </html>
    );
}
