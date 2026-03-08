import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Anchra",
    template: "%s | Anchra",
  },
  description:
    "Anchra turns release evidence, Slack decisions, and rollout files into review-ready release notes, internal briefs, and stakeholder updates.",
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
      "Anchra collects release context, checks risky wording, and exports approval-ready communication from one release anchor.",
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
  themeColor: "#f7f2e8",
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
