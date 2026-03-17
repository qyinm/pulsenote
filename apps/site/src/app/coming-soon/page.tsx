import Link from "next/link";
import Image from "next/image";

const accessItems = [
  {
    label: "Release review",
    title: "Review workspace",
    body: "The hosted product opens with the draft and the source evidence in the same workspace.",
  },
  {
    label: "Approval trail",
    title: "Sign-off visibility",
    body: "Wording changes, reviewer rationale, and human sign-off remain visible before export.",
  },
  {
    label: "Publish pack",
    title: "Export package",
    body: "Approved notes, internal briefing, and references leave together after the checks close cleanly.",
  },
];

function BrandMark({ className }: { className?: string }) {
  return <Image className={className} src="/brand-mark.svg" alt="PulseNote" width={64} height={64} priority />;
}

export default function ComingSoonPage() {
  return (
    <main id="main-content" className="pn-site">
      <header className="pn-header reveal">
        <Link className="pn-brand" href="/">
          <BrandMark className="pn-brand-mark" />
          <span className="pn-brand-copy">
            <strong>PulseNote</strong>
          </span>
        </Link>
        <Link className="pn-link-pill" href="/">
          Back to site
        </Link>
      </header>

      <section className="pn-hero reveal">
        <p className="pn-kicker">Coming soon</p>
        <h1>PulseNote web access opens in the release review workspace.</h1>
        <p className="pn-hero-lead">
          The hosted product is still being prepared. It starts with review, approval, and publish-pack export
          rather than a blank writing surface.
        </p>

        <div className="pn-actions">
          <Link className="pn-button" href="/">
            Back to site
          </Link>
          <Link className="pn-button pn-button-secondary" href="/#flow">
            Review the flow
          </Link>
        </div>
      </section>

      <section className="pn-section reveal">
        <div className="pn-section-head">
          <div className="pn-section-copy">
            <p className="pn-kicker">First hosted surface</p>
            <h2>What opens first</h2>
          </div>
          <p className="pn-section-aside">
            The initial web experience focuses on the critical handoff and approval moments of the release workflow.
          </p>
        </div>

        <div className="pn-ruled-list">
          {accessItems.map((item) => (
            <article className="pn-ruled-row" key={item.label}>
              <p className="pn-kicker">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
