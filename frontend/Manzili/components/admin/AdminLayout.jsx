'use client'
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSelector, useDispatch } from "react-redux"
import { LogOutIcon } from "lucide-react"
import Loading from "../Loading"
import AdminNavbar from "./AdminNavbar"
import AdminSidebar from "./AdminSidebar"
import { selectIsAdmin, selectSession, selectAuthBootstrapped, clearSession } from "@/lib/features/auth/authSlice"
import { apiLogout } from "@/lib/api/auth"
import { fetchAdminMe } from "@/lib/api/admin"

const LOGIN_PATH = "/admin/login"

// Which dashboard section each route belongs to (for moderator permission gating).
const SECTION_BY_PATH = {
    "/admin/stores": "stores",
    "/admin/approve": "stores",
    "/admin/products": "products",
    "/admin/orders": "orders",
    "/admin/returns": "orders",
    "/admin/requests": "requests",
    "/admin/reports": "reports",
    "/admin/coupons": "coupons",
}

/**
 * Gates the admin section on a real admin-role session (replaces the old passkey). Loads the
 * admin's identity + permissions; moderators are redirected away from sections they lack and from
 * the super-admin-only Moderators page. The login route bypasses the gate (no redirect loop).
 */
export default function AdminLayout({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const dispatch = useDispatch()
    const isAdmin = useSelector(selectIsAdmin)
    const session = useSelector(selectSession)
    const bootstrapped = useSelector(selectAuthBootstrapped)
    const [me, setMe] = useState(null)

    const isLoginRoute = pathname === LOGIN_PATH

    // Wait until the cookie session has been probed before deciding to redirect, so a
    // logged-in admin isn't bounced to login during the async rehydrate.
    useEffect(() => {
        if (!bootstrapped || isLoginRoute) return
        if (!session || !isAdmin) router.replace(LOGIN_PATH)
    }, [bootstrapped, isLoginRoute, isAdmin, session, router])

    // Load identity + section permissions once we know the user is an admin.
    useEffect(() => {
        if (bootstrapped && isAdmin && !isLoginRoute) fetchAdminMe().then(setMe)
    }, [bootstrapped, isAdmin, isLoginRoute])

    // A moderator can't open a section they weren't granted (or the Moderators page).
    useEffect(() => {
        if (!me || me.isSuperAdmin || isLoginRoute) return
        if (pathname === "/admin/moderators") {
            router.replace("/admin")
            return
        }
        const section = SECTION_BY_PATH[pathname]
        if (section && !me.permissions.includes(section)) router.replace("/admin")
    }, [me, pathname, isLoginRoute, router])

    const handleLogout = async () => {
        await apiLogout()
        dispatch(clearSession())
        router.replace(LOGIN_PATH)
    }

    // The login screen renders bare (no admin chrome, not gated).
    if (isLoginRoute) return <>{children}</>

    // Show Loading until the session probe finishes; non-admins get redirected by the effect.
    if (!bootstrapped || !isAdmin) return <Loading />

    return (
        <div className="flex flex-col h-screen">
            <AdminNavbar />
            <div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
                <AdminSidebar me={me} />
                <div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
                    <div className="flex justify-end mb-4">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="text-sm text-slate-500 hover:text-rose-600 inline-flex items-center gap-1.5 transition-colors"
                        >
                            <LogOutIcon size={16} /> Log out
                        </button>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}
