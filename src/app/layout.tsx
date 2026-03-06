import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pulsenote.ai"),
  title: {
    default: "Pulsenote",
    template: "%s | Pulsenote",
  },
  description:
    "Turn GitHub releases, Slack notes, and release files into review-ready release notes, internal briefs, and stakeholder updates with evidence, safety checks, and approval history.",
  applicationName: "Pulsenote",
  keywords: [
    "release notes",
    "release communication",
    "approval workflow",
    "github releases",
    "slack context",
    "stakeholder update",
    "audit trail",
  ],
  openGraph: {
    title: "Pulsenote",
    description:
      "Collect release context from GitHub, Slack, and files, then draft, check, approve, and export audience-specific communication packs.",
    siteName: "Pulsenote",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulsenote",
    description:
      "Release communication system for review-ready notes, briefs, and stakeholder updates.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
