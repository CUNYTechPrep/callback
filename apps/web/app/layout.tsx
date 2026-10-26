// Root layout for the Next.js app. Wraps every page with the HTML shell and
// global styles. No layout logic — just structure and metadata.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Tracker",
  description: "Track every job application and what happened next.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="mx-auto max-w-2xl px-4 py-10 font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}