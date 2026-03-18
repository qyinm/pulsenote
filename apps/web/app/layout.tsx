import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "PulseNote Web",
  description:
    "Operational dashboard for release context, claim checks, approvals, and publish packs.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background font-sans text-foreground antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
