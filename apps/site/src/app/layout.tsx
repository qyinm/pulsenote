import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PulseNote | Source-backed release communication",
    template: "%s | PulseNote",
  },
  description:
    "PulseNote turns shipped work into customer-safe, approval-ready release communication with claim checks, evidence links, and exportable publish packs.",
  applicationName: "PulseNote",
  keywords: [
    "release notes",
    "source-backed communication",
    "release communication",
    "approval workflow",
    "github releases",
    "slack context",
    "stakeholder update",
    "audit trail",
  ],
  openGraph: {
    title: "PulseNote",
    description:
      "Gather release context, draft public wording, run claim checks, collect approval, and export a publish pack without drifting from shipped facts.",
    siteName: "PulseNote",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseNote",
    description:
      "Source-backed release communication with claim checks, approvals, and publish packs.",
  },
  icons: {
    icon: "/brand-mark.svg",
    shortcut: "/brand-mark.svg",
    apple: "/brand-mark.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a className="pn-skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
