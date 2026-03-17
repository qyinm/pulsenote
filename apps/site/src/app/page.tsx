import Image from "next/image";
import Link from "next/link";

const heroNotes = [
  "GitHub release attached",
  "Claim checks visible",
  "Approval trail preserved",
];

const proofRows = [
  {
    label: "Evidence-linked",
    title: "The draft stays attached to shipped work.",
    body: "Merged pull requests, release notes, rollout files, and support context remain on the same release record.",
  },
  {
    label: "Claim checked",
    title: "Risky language is visible before approval.",
    body: "Unsupported certainty, vague promises, and internal-only wording surface while the team can still correct them.",
  },
  {
    label: "Approval ready",
    title: "Human sign-off stays visible after publication.",
    body: "Marketing, engineering, and support confirm the same record instead of scattering decisions across chat and docs.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Ingest release context",
    body: "Pull shipped scope, linked issues, rollout notes, and reviewer context into one release record.",
  },
  {
    step: "02",
    title: "Draft public communication",
    body: "Prepare customer-safe notes from that record instead of rebuilding the story for each audience.",
  },
  {
    step: "03",
    title: "Run claim checks",
    body: "Surface unsupported certainty, missing evidence, and internal-only language before review.",
  },
  {
    step: "04",
    title: "Collect approval",
    body: "Keep wording changes, reviewer comments, and final responsibility in one visible trail.",
  },
  {
    step: "05",
    title: "Export publish pack",
    body: "Hand off approved notes, internal briefing, and evidence references as one controlled package.",
  },
];

const outputs = [
  {
    label: "Customer note",
    title: "Public release note",
    body: "Explain what changed, why it matters, and what users can do now without carrying internal phrasing into public copy.",
  },
  {
    label: "Internal handoff",
    title: "Support brief",
    body: "Carry rollout caveats, expected questions, and known edges forward so downstream teams do not reverse-engineer the launch.",
  },
  {
    label: "Stakeholder summary",
    title: "Leadership recap",
    body: "Keep the shipped scope, customer impact, and final approved wording aligned for the people who need the release story quickly.",
  },
];

const questions = [
  {
    question: "Why not just use ChatGPT or Claude?",
    answer:
      "General-purpose tools can help with writing, but your team still has to gather release context, check unsupported claims, and reconstruct who approved what. PulseNote starts with the release record and keeps that trail attached to the draft.",
  },
  {
    question: "Does PulseNote publish automatically?",
    answer:
      "No. PulseNote drafts, checks, collects approval, and exports the publish pack. Final publication still belongs to the humans responsible for the release.",
  },
  {
    question: "What does PulseNote ingest?",
    answer:
      "Release data, merged pull requests, linked issues, Slack notes or transcripts, QA notes, launch checklists, and rollout files that explain what actually shipped.",
  },
];

const accessRows = [
  {
    label: "Release review",
    body: "The first hosted surface opens with the draft and source evidence in the same view.",
  },
  {
    label: "Approval trail",
    body: "Wording changes, rationale, and human sign-off stay attached before export becomes available.",
  },
  {
    label: "Publish pack",
    body: "Approved notes, internal handoff, and references leave together after the checks close cleanly.",
  },
];

function BrandMark({
  className,
  alt,
  priority = false,
}: {
  className?: string;
  alt: string;
  priority?: boolean;
}) {
  return <Image className={className} src="/brand-mark.svg" alt={alt} width={64} height={64} priority={priority} />;
}

function ReleaseRecord() {
  return (
    <aside className="pn-record" aria-label="Sample release record">
      <div className="pn-record-head">
        <p className="pn-kicker">Sample release record</p>
        <h2>v2.4.0 permissions rollout</h2>
      </div>

      <div className="pn-record-section">
        <p className="pn-kicker">Source material</p>
        <ul className="pn-plain-list" style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
          <li>• 11 merged pull requests attached</li>
          <li>• 4 linked Linear issues with scope</li>
          <li>• QA notes and support handoff</li>
        </ul>
      </div>

      <div className="pn-record-section">
        <p className="pn-kicker">Claim checks</p>
        <div style={{ display: 'grid', gap: '1rem', fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: 'var(--ink-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Review</span>
            <p style={{ margin: 0, fontWeight: 500 }}>Absolute performance phrasing needs source evidence.</p>
          </div>
          <div>
            <span style={{ color: 'var(--ink-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clear</span>
            <p style={{ margin: 0, fontWeight: 500 }}>Audit trail language is backed by the release notes.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="pn-site">
      <header className="pn-header reveal">
        <a className="pn-brand" href="#top">
          <BrandMark className="pn-brand-mark" alt="PulseNote brand mark" priority />
          <span className="pn-brand-copy">
            <strong>PulseNote</strong>
          </span>
        </a>

        <nav className="pn-nav" aria-label="Primary">
          <a href="#system">System</a>
          <a href="#flow">Flow</a>
          <a href="#outputs">Outputs</a>
          <a href="#questions">FAQ</a>
        </nav>

        <Link className="pn-link-pill" href="/coming-soon">
          Start free
        </Link>
      </header>

      <section id="top" className="pn-hero reveal">
        <p className="pn-kicker">Release communication</p>
        <h1>Write the release once. Publish it with proof.</h1>
        <p className="pn-hero-lead">
          PulseNote turns shipped work into public-safe communication with visible claim checks, reviewable approval,
          and a publish pack your team can inspect before it goes out.
        </p>

        <div className="pn-actions">
          <Link className="pn-button" href="/coming-soon">
            Start free
          </Link>
          <a className="pn-button pn-button-secondary" href="#flow">
            See the flow
          </a>
        </div>

        <ReleaseRecord />
      </section>

      <section id="system" className="pn-section reveal">
        <div className="pn-section-head">
          <div className="pn-section-copy">
            <p className="pn-kicker">Why it matters</p>
            <h2>Shipping is fast. Explaining it breaks.</h2>
          </div>

          <p className="pn-section-aside">
            PulseNote narrows the work on purpose: one release record, one draft, visible checks, visible approval,
            controlled export.
          </p>
        </div>

        <div className="pn-ruled-list">
          {proofRows.map((item) => (
            <article className="pn-ruled-row" key={item.title}>
              <p className="pn-kicker">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="flow" className="pn-section pn-section-bg reveal">
        <div className="pn-site">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Flow</p>
              <h2>From intake to export, the work stays reviewable.</h2>
            </div>

            <p className="pn-section-aside">
              PulseNote is not a generic writer. Every stage exists to move a release from context to reviewable
              publication without losing the evidence trail.
            </p>
          </div>

          <ol className="pn-flow-list">
            {workflow.map((item) => (
              <li className="pn-flow-row" key={item.step}>
                <span className="pn-flow-step">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="outputs" className="pn-section reveal">
        <div className="pn-section-head">
          <div className="pn-section-copy">
            <p className="pn-kicker">Outputs</p>
            <h2>One record. Three clean outputs.</h2>
          </div>
          <p className="pn-section-aside">
            The approved customer note, internal handoff, and stakeholder summary all come from the same reviewed
            source instead of disconnected documents.
          </p>
        </div>

        <div className="pn-ruled-list">
          {outputs.map((item) => (
            <article className="pn-ruled-row" key={item.title}>
              <p className="pn-kicker">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="questions" className="pn-section pn-section-bg reveal">
        <div className="pn-site">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Questions</p>
              <h2>Usually asked before moving to a system.</h2>
            </div>
            <p className="pn-section-aside">
              The answers stay direct: visible evidence, explicit checks, and manual publication at the end.
            </p>
          </div>

          <div className="pn-ruled-list">
            {questions.map((item) => (
              <article className="pn-ruled-row" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pn-section reveal">
        <div className="pn-hero" style={{ padding: '4rem 0' }}>
          <p className="pn-kicker">First access surface</p>
          <h2>The hosted product opens in release review first.</h2>
          <p className="pn-hero-lead" style={{ fontSize: '1rem' }}>
            PulseNote access is still being prepared. The first hosted surface is the web app for review, approval,
            and publish-pack export.
          </p>

          <div className="pn-actions">
            <Link className="pn-button" href="/coming-soon">
              Start free
            </Link>
            <a className="pn-button pn-button-secondary" href="#system">
              Read why
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
