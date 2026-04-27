"use client";

import Link from "next/link";

export function NewSessionButton() {
  return (
    <Link
      href="/messages"
      className="hidden rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10 sm:block"
    >
      Schedule in a thread
    </Link>
  );
}
