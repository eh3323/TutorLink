import type { Metadata } from "next";

import "./globals.css";
import "katex/dist/katex.min.css";
// eager so the whiteboard chunk doesn't race its own styles on first paint
import "tldraw/tldraw.css";

import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "TutorLink — NYU peer tutoring marketplace",
  description:
    "Find approachable NYU peer tutors by subject, availability, and budget. Message, book, and review them in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100">
        <Providers>
          <Navbar />
          <div className="flex min-h-[calc(100vh-4rem)] flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
