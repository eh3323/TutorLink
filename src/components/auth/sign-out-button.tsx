"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function SignOutButton({
  className,
  label = "Sign out",
  redirectTo = "/",
}: {
  className?: string;
  label?: string;
  redirectTo?: string;
}) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleClick() {
    setIsBusy(true);
    await signOut({ redirect: false });
    // hard reload so server pages re-check auth and don't flash stale stuff
    window.location.replace(redirectTo);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      className={
        className ??
        "inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {isBusy ? "Signing out…" : label}
    </button>
  );
}
