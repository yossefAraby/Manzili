"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { assets } from "@/assets/assets";

const sidebarLinks = [
  { name: "Dashboard", href: "/admin", icon: HomeIcon },
  { name: "Stores", href: "/admin/stores", icon: StoreIcon },
  { name: "Approve", href: "/admin/approve", icon: ShieldCheckIcon },
  { name: "Products", href: "/admin/products", icon: PackageIcon },
  { name: "Orders", href: "/admin/orders", icon: LayoutListIcon },
  { name: "Custom Requests", href: "/admin/requests", icon: PaletteIcon },
  { name: "Reports", href: "/admin/reports", icon: FlagIcon },
  { name: "Coupons", href: "/admin/coupons", icon: TicketPercentIcon },
];

const AdminSidebar = () => {
  const pathname = usePathname();
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    fetch("/api/admin/reports?status=PENDING")
      .then((r) => r.json())
      .then((d) => setPendingReports(d.pendingCount ?? 0))
      .catch(() => {});
  }, [pathname]);

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
        <p className="text-slate-700">Hi, Admin</p>
      </div>

      <div className="max-sm:mt-6">
        {sidebarLinks.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition ${pathname === link.href && "bg-slate-100 sm:text-slate-600"}`}
          >
            <link.icon size={18} className="sm:ml-5" />
            <p className="max-sm:hidden">{link.name}</p>

            {/* Amber dot badge for Reports */}
            {link.href === "/admin/reports" && pendingReports > 0 && (
              <span className="max-sm:hidden ml-auto mr-6 flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-400 text-white rounded-full">
                {pendingReports > 9 ? "9+" : pendingReports}
              </span>
            )}

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
