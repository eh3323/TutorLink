// the whole site runs on new york time so a session at "7pm" means 7pm in nyc
// regardless of where the viewer's browser is
export const SITE_TIMEZONE = "America/New_York";

export function formatCurrencyCents(cents: number | null | undefined) {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function formatRateRange(
  minCents: number | null | undefined,
  maxCents: number | null | undefined,
) {
  const min = formatCurrencyCents(minCents);
  const max = formatCurrencyCents(maxCents);
  if (min && max) return `${min} – ${max}`;
  if (min) return `from ${min}`;
  if (max) return `up to ${max}`;
  return null;
}

export function formatRating(rating: number | null | undefined) {
  if (rating == null) return "No rating yet";
  return `${rating.toFixed(1)}★`;
}

function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = toDate(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = toDate(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

// short flavor without the year, used inside chat bubbles or compact rows
export function formatDateTimeShort(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = toDate(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = toDate(value);
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function formatMode(mode: string | null | undefined) {
  if (!mode) return "";
  if (mode === "ONLINE" || mode === "online") return "Online";
  if (mode === "IN_PERSON" || mode === "in-person") return "In person";
  return mode;
}

export function formatStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function initialsOf(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// ---- new york time helpers for datetime-local inputs ----

// look up the offset in ms that america/new_york had at the given instant
function nyOffsetMs(date: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIMEZONE,
    timeZoneName: "shortOffset",
    hour: "numeric",
  });
  const parts = fmt.formatToParts(date);
  const tag = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  // tag looks like "GMT-4", "GMT-5", or "GMT-04:30" in extreme cases
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(tag);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
  return sign * (hours * 60 + minutes) * 60_000;
}

// turn a real Date into "YYYY-MM-DDTHH:mm" as it would read on a clock in NYC
export function nyDateTimeLocalFromDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // some engines return "24" for midnight; normalise
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

// parse "YYYY-MM-DDTHH:mm" assuming the user typed it in NYC time, return the real UTC Date
export function nyDateTimeLocalToDate(local: string): Date {
  // first guess: pretend the wall time is utc, then walk it back by the ny offset
  const wallAsUtc = new Date(`${local}:00Z`).getTime();
  let utc = wallAsUtc;
  // iterate twice to absorb DST edge cases (offset of original guess vs corrected guess)
  for (let i = 0; i < 3; i++) {
    const offset = nyOffsetMs(new Date(utc));
    const corrected = wallAsUtc - offset;
    if (corrected === utc) break;
    utc = corrected;
  }
  return new Date(utc);
}
