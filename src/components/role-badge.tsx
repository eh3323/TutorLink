type Variant = "TUTOR" | "TUTEE" | "BOTH" | "ADMIN";

const STYLES: Record<Variant, { label: string; className: string; dotClass: string }> = {
  TUTOR: {
    label: "Tutor",
    className: "border-cyan-400/40 bg-cyan-400/10 text-cyan-100",
    dotClass: "bg-cyan-300",
  },
  TUTEE: {
    label: "Tutee",
    className: "border-violet-400/40 bg-violet-400/10 text-violet-100",
    dotClass: "bg-violet-300",
  },
  BOTH: {
    label: "Tutor + Tutee",
    className:
      "border-emerald-400/40 bg-gradient-to-r from-cyan-400/10 to-violet-400/10 text-emerald-100",
    dotClass: "bg-emerald-300",
  },
  ADMIN: {
    label: "Admin",
    className: "border-amber-400/50 bg-amber-400/10 text-amber-100",
    dotClass: "bg-amber-300",
  },
};

export type RoleBadgeProps = {
  role?: string | null;
  isAdmin?: boolean;
  size?: "xs" | "sm";
  className?: string;
};

function variantsFor(role: string | null | undefined, isAdmin: boolean): Variant[] {
  const out: Variant[] = [];
  if (isAdmin) out.push("ADMIN");
  if (role === "BOTH") out.push("BOTH");
  else if (role === "TUTOR") out.push("TUTOR");
  else if (role === "TUTEE") out.push("TUTEE");
  return out;
}

export function RoleBadge({
  role,
  isAdmin = false,
  size = "sm",
  className = "",
}: RoleBadgeProps) {
  const variants = variantsFor(role ?? null, isAdmin);
  if (variants.length === 0) return null;

  const sizeClass =
    size === "xs"
      ? "px-1.5 py-0.5 text-[9px]"
      : "px-2 py-0.5 text-[10px]";

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {variants.map((variant) => {
        const style = STYLES[variant];
        return (
          <span
            key={variant}
            className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide ${sizeClass} ${style.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${style.dotClass}`} />
            {style.label}
          </span>
        );
      })}
    </span>
  );
}
