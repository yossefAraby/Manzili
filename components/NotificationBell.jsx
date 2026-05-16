"use client";
import { Bell, CheckCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
} from "@/lib/features/notification/notificationSlice";

function formatRelative(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell({ compact = false }) {
  const dispatch = useDispatch();
  const list = useSelector((state) => state.notification.list);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const unreadCount = useMemo(
    () => list.filter((n) => !n.read).length,
    [list],
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleItemClick = (id) => {
    dispatch(markNotificationRead(id));
  };

  const handleMarkAll = () => {
    if (unreadCount > 0) dispatch(markAllNotificationsRead());
  };

  const handleDismiss = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    dispatch(removeNotification(id));
  };

  const iconSize = compact ? 20 : 18;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={
          compact
            ? "relative text-slate-700"
            : "relative flex items-center gap-2 text-slate-600"
        }
      >
        <Bell size={iconSize} />
        {unreadCount > 0 && (
          <span
            className={
              compact
                ? "absolute -top-1 -right-1 text-[8px] text-white bg-[#e67e22] size-3.5 rounded-full flex items-center justify-center"
                : "absolute -top-1 left-3 text-[8px] text-white bg-[#e67e22] size-3.5 rounded-full flex items-center justify-center"
            }
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-800">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs text-[#2582eb] hover:underline inline-flex items-center gap-1"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {list.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                You&apos;re all caught up.
              </div>
            ) : (
              list.map((n) => {
                const body = (
                  <div
                    className={`group flex items-start gap-3 px-4 py-3 text-sm border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors ${
                      n.read ? "" : "bg-blue-50/40"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                        n.read ? "bg-slate-300" : "bg-[#2582eb]"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      {n.title && (
                        <p className="font-medium text-slate-800 truncate">
                          {n.title}
                        </p>
                      )}
                      {n.message && (
                        <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity"
                      aria-label="Dismiss notification"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );

                if (n.href) {
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => {
                        handleItemClick(n.id);
                        setOpen(false);
                      }}
                      className="block"
                    >
                      {body}
                    </Link>
                  );
                }

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n.id)}
                    className="w-full text-left"
                  >
                    {body}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
