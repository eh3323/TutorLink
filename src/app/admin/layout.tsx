import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/sessions", label: "Sessions" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/admin");
  if (!session.user.isAdmin) redirect("/dashboard");

  return (
    <main className="flex-1 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              Admin console
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Operations</h2>
            <p className="mt-1 text-xs text-amber-100/80">
              You're signed in as {session.user.email}
            </p>
          </div>
          <nav className="flex flex-col gap-1 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-amber-100/80 transition hover:bg-amber-400/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-3 text-xs text-rose-200">
            Changes made here affect every user. Double-check before saving.
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
