import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Anchra",
    template: "%s | Anchra",
  },
  description:
    "Anchra keeps release communication anchored to what actually shipped by collecting GitHub evidence, Slack review context, and rollout files into one review-ready system.",
  applicationName: "Anchra",
  keywords: [
    "release notes",
    "anchored communication",
    "release communication",
    "approval workflow",
    "github releases",
    "slack context",
    "stakeholder update",
    "audit trail",
  ],
  openGraph: {
    title: "Anchra",
    description:
      "Anchra collects release context, drafts audience-ready communication, and keeps every message anchored to shipped evidence.",
    siteName: "Anchra",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anchra",
    description:
      "Anchored release communication for notes, briefs, approvals, and publish packs.",
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
