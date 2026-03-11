import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <main className="pn-site">
      <section className="pn-coming-soon">
        <p className="pn-kicker !text-[#c5a676]">Coming Soon</p>
        <h1>PulseNote access is coming soon.</h1>
        <p>
          The hosted web app and CLI entry point are still being prepared. The release workflow, browser review
          surface, and terminal access will open here once they are ready.
        </p>

        <div className="pn-final-actions">
          <Link className="pn-button pn-button-primary px-12" href="/">
            Back to site
          </Link>
          <Link className="pn-button pn-button-secondary px-12" href="/#system">
            View system
          </Link>
        </div>
      </section>
    </main>
  );
}
