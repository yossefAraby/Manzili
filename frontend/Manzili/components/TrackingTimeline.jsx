"use client";
// Presentational shipment tracking timeline for Bosta shipments.
//
// Consumes the `shipment` object the .NET backend now attaches to orders/returns:
//   { trackingNumber, carrier, status, statusText, awbUrl, shippingCost,
//     codAmount, shippedAt, deliveredAt,
//     events: [{ type, description, occurredAt }] }   // ordered oldest→newest
//
// Renders nothing when no shipment is present. Two layouts:
//   - compact  → single inline line (icon + tracking + status pill) for table cells
//   - default  → full timeline card with a vertical list of events
//
// Self-contained: no new deps, only lucide-react icons + Tailwind. Manzili
// accents (#e67e22 / #1c355e) are used sparingly; the palette is mostly slate.

import { TruckIcon, PackageCheckIcon, ExternalLinkIcon } from "lucide-react";

// ─── status → pill colour ──────────────────────────────────────────────────────
// CREATED=slate, PICKED_UP=amber, IN_TRANSIT=blue, DELIVERED=emerald,
// FAILED/CANCELED=rose, anything else → slate.
function statusPillClass(status) {
  switch (String(status || "").toUpperCase()) {
    case "PICKED_UP":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "IN_TRANSIT":
      return "bg-blue-50 text-blue-700 border border-blue-200";
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "FAILED":
    case "CANCELED":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    case "CREATED":
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}

// Dot colour for a timeline node — the latest (active) node is tinted by status,
// earlier nodes stay neutral.
function dotClass(status, active) {
  if (!active) return "bg-slate-300";
  switch (String(status || "").toUpperCase()) {
    case "DELIVERED":
      return "bg-emerald-500";
    case "FAILED":
    case "CANCELED":
      return "bg-rose-500";
    case "PICKED_UP":
      return "bg-amber-500";
    case "IN_TRANSIT":
      return "bg-blue-500";
    default:
      return "bg-[#e67e22]"; // CREATED / unknown — Manzili accent
  }
}

// Turn an UPPER_SNAKE token (status or event type) into a readable label, e.g.
// "RETURN_REQUESTED" → "Return requested".
function humanize(value) {
  const s = String(value || "").replace(/_/g, " ").trim().toLowerCase();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Short, locale-agnostic date+time, e.g. "12 Jun, 14:30". Falls back to the raw
// string if it can't be parsed.
function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrackingTimeline({ shipment, compact }) {
  if (!shipment || typeof shipment !== "object") return null;

  const status = shipment.status || "UNKNOWN";
  const statusLabel = shipment.statusText || humanize(status) || "Unknown";
  const carrier = shipment.carrier
    ? shipment.carrier === "BOSTA"
      ? "Bosta"
      : shipment.carrier
    : "Bosta";
  const tracking = shipment.trackingNumber;

  const pill = (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusPillClass(
        status,
      )}`}
    >
      {statusLabel}
    </span>
  );

  // ─── compact: single inline summary (for table cells) ─────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <TruckIcon size={14} className="shrink-0 text-[#1c355e]" />
        <span className="text-slate-500">{carrier}</span>
        {tracking && <span className="font-mono text-slate-700">{tracking}</span>}
        {pill}
      </div>
    );
  }

  // ─── default: full timeline card ──────────────────────────────────────────────
  const events = Array.isArray(shipment.events) ? shipment.events : [];
  // Fall back to a single synthetic row built from the status when there are no
  // events yet (e.g. label just created).
  const rows =
    events.length > 0
      ? events
      : [
          {
            type: status,
            description: statusLabel,
            occurredAt: shipment.shippedAt || shipment.deliveredAt || null,
          },
        ];
  const lastIndex = rows.length - 1;

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <PackageCheckIcon size={16} className="shrink-0 text-[#1c355e]" />
        <span className="text-sm font-medium text-slate-700">{carrier}</span>
        {tracking && (
          <span className="font-mono text-xs text-slate-500">{tracking}</span>
        )}
        <span className="ml-auto">{pill}</span>
      </div>

      {/* Optional AWB link */}
      {shipment.awbUrl && (
        <a
          href={shipment.awbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-[#1c355e] hover:underline"
        >
          Airway bill <ExternalLinkIcon size={11} />
        </a>
      )}

      {/* Timeline */}
      <ol className="mt-3 space-y-0">
        {rows.map((ev, i) => {
          const active = i === lastIndex; // newest event is the current state
          const label = ev.description || humanize(ev.type) || statusLabel;
          return (
            <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
              {/* dot + connecting line */}
              <div className="relative flex flex-col items-center">
                <span
                  className={`mt-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${dotClass(
                    status,
                    active,
                  )}`}
                />
                {i !== lastIndex && (
                  <span className="w-px flex-1 bg-slate-200" />
                )}
              </div>
              {/* label + date */}
              <div className="flex-1 -mt-0.5">
                <p
                  className={`text-xs leading-snug ${
                    active ? "font-medium text-slate-800" : "text-slate-600"
                  }`}
                >
                  {label}
                </p>
                {ev.occurredAt && (
                  <p className="text-[11px] text-slate-400">
                    {shortDate(ev.occurredAt)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
