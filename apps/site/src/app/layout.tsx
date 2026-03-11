import type { Metadata } from "next";
import type { Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PulseNote",
    template: "%s | PulseNote",
  },
  description:
    "PulseNote turns release evidence, Slack decisions, and rollout files into review-ready release notes, internal briefs, and stakeholder updates.",
  applicationName: "PulseNote",
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
    title: "PulseNote",
    description:
      "PulseNote collects release context, checks risky wording, and exports approval-ready communication from one release anchor.",
    siteName: "PulseNote",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseNote",
    description:
      "Anchored release communication for notes, briefs, approvals, and publish packs.",
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
