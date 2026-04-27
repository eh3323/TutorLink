import { initialsOf } from "@/lib/format";

type AvatarProps = {
  name: string | null | undefined;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizeClass = SIZES[size];

  const base = `inline-flex items-center justify-center rounded-full overflow-hidden font-semibold shrink-0 ${sizeClass} ${className ?? ""}`;

  if (src) {
    return (
      <span className={`${base} bg-slate-900`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name ? `${name} avatar` : "User avatar"}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950`}
    >
      {initialsOf(name)}
    </span>
  );
}
