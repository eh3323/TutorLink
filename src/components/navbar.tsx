import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationsButton } from "@/components/notifications-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const NAV_LINKS = [
  { href: "/tutors", label: "Find tutors" },
  { href: "/requests", label: "Requests" },
  { href: "/messages", label: "Messages" },
  { href: "/sessions", label: "Sessions" },
];

const ADMIN_LINK = { href: "/admin", label: "Admin" };

export async function Navbar() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.isAdmin === true;

  const links = isAdmin ? [...NAV_LINKS, ADMIN_LINK] : NAV_LINKS;

  const profile = user
    ? await db.profile.findUnique({
        where: { userId: user.id },
        select: { fullName: true, avatarUrl: true },
      })
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
            T
          </span>
          <span>TutorLink</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-white/5 hover:text-white ${
                link.href === ADMIN_LINK.href
                  ? "text-cyan-200"
                  : "text-slate-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <NotificationsButton />
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 transition hover:bg-white/10 sm:inline-flex"
              >
                <Avatar
                  name={profile?.fullName ?? user.name ?? user.email}
                  src={profile?.avatarUrl ?? null}
                  size="xs"
                />
                <span className="max-w-[120px] truncate">
                  {profile?.fullName ?? user.name ?? user.email}
                </span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="flex w-full items-center gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 md:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-white/5 hover:text-white ${
              link.href === ADMIN_LINK.href ? "text-cyan-200" : "text-slate-300"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
