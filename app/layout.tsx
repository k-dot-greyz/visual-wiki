import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import WikiLiveRegion from "@/components/WikiLiveRegion";
import WikiUndoBar from "@/components/WikiUndoBar";
import SkipLink from "@/components/SkipLink";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "visual wiki • your name",
  description: "Curated knowledge garden for AI agents",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${grotesk.variable} font-sans bg-zinc-950 text-zinc-200 antialiased`}
      >
        <SkipLink />
        <WikiLiveRegion />
        <WikiUndoBar />
        <InspectEditSheet />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
