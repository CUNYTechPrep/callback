// Root layout for the Next.js app. Wraps every page with the HTML shell,
// global styles, and the signed-in header (empty when signed out).
import type { Metadata } from "next";
import "./globals.css";
import { SessionHeader } from "./session-header";

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "Track every job application and what happened next.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="mx-auto max-w-2xl px-4 py-10 font-sans text-neutral-900 antialiased">
        <SessionHeader />
        {children}
      </body>
    </html>
  );
}