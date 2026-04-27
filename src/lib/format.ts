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

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
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
