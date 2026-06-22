"use client";

import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ShieldCheckIcon,
  StoreIcon,
  TicketPercentIcon,
  PackageIcon,
  LayoutListIcon,
  PaletteIcon,
  FlagIcon,
  UsersIcon,
  MessageSquareIcon,
  RotateCcwIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { assets } from "@/assets/assets";

// `section` ties a link to a moderator permission; links without one (Dashboard) are always
// visible; `superOnly` links (Moderators) show only to full admins.
const sidebarLinks = [
  { name: "Dashboard", href: "/admin", icon: HomeIcon },
  { name: "Stores", href: "/admin/stores", icon: StoreIcon, section: "stores" },
  { name: "Approve", href: "/admin/approve", icon: ShieldCheckIcon, section: "stores" },
  { name: "Products", href: "/admin/products", icon: PackageIcon, section: "products" },
  { name: "Orders", href: "/admin/orders", icon: LayoutListIcon, section: "orders" },
  { name: "Returns", href: "/admin/returns", icon: RotateCcwIcon, section: "orders" },
  { name: "Custom Requests", href: "/admin/requests", icon: PaletteIcon, section: "requests" },
  { name: "Reports", href: "/admin/reports", icon: FlagIcon, section: "reports" },
  { name: "Coupons", href: "/admin/coupons", icon: TicketPercentIcon, section: "coupons" },
  { name: "Conversations", href: "/admin/conversations", icon: MessageSquareIcon },
  { name: "Moderators", href: "/admin/moderators", icon: UsersIcon, superOnly: true },
];

const AdminSidebar = ({ me }) => {
  const pathname = usePathname();

  const isSuper = me?.isSuperAdmin ?? false;
  const perms = me?.permissions ?? [];

  const visibleLinks = sidebarLinks.filter((link) => {
    if (link.superOnly) return isSuper;       // only full admins see Moderators
    if (!link.section) return true;           // Dashboard: always
    if (!me) return true;                     // optimistic while identity loads
    return isSuper || perms.includes(link.section);
  });

  return (
    <div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-60">
      <div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
        <Image
          className="w-14 h-14 rounded-full"
          src={assets.logo}
          alt=""
          width={80}
          height={80}
        />
        <p className="text-slate-700">Hi, {me?.name || "Admin"}</p>
        {me && !isSuper && (
          <span className="text-[10px] uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Moderator
          </span>
        )}
      </div>

      <div className="max-sm:mt-6">
        {visibleLinks.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition ${pathname === link.href && "bg-slate-100 sm:text-slate-600"}`}
          >
            <link.icon size={18} className="sm:ml-5" />
            <p className="max-sm:hidden">{link.name}</p>

            {pathname === link.href && (
              <span className="absolute bg-[#2582eb] right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminSidebar;
