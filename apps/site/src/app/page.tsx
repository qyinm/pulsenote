import Image from "next/image";
import Link from "next/link";

const heroSignals = [
  "Release context stays attached to the draft.",
  "Claim checks run before anyone signs off.",
  "The publish pack leaves as one reviewed package.",
];

const failurePoints = [
  {
    label: "01",
    title: "Context gets rebuilt from scratch.",
    body: "Merged pull requests, rollout notes, support caveats, and issue links usually live in different systems. Teams rewrite the release story by hand.",
  },
  {
    label: "02",
    title: "Public wording drifts from the evidence.",
    body: "Claims get cleaner as they move through chat and docs. Unsupported certainty often appears after the code is already out.",
  },
  {
    label: "03",
    title: "Approval becomes hard to inspect.",
    body: "Marketing, engineering, and support all review the release, but the final wording and rationale are rarely preserved in one place.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Ingest release context",
    body: "Collect shipped scope, linked issues, rollout notes, and customer-facing constraints inside one release record.",
  },
  {
    step: "02",
    title: "Draft public communication",
    body: "Prepare customer-safe release notes from the record instead of rebuilding the message for each reviewer.",
  },
  {
    step: "03",
    title: "Run claim checks",
    body: "Surface unsupported certainty, missing evidence, and internal-only wording before approval starts.",
  },
  {
    step: "04",
    title: "Collect approval",
    body: "Keep edits, reviewer comments, and human sign-off visible in the same place as the draft.",
  },
  {
    step: "05",
    title: "Export publish pack",
    body: "Send approved notes, internal briefing, and evidence references forward as one controlled handoff.",
  },
];

const reviewSurface = [
  {
    label: "Release record",
    title: "Source evidence remains visible while wording changes.",
    body: "Pull requests, issues, QA notes, and rollout files stay attached to the release instead of becoming an off-screen reference.",
  },
  {
    label: "Claim checks",
    title: "Risky language is explicit before the draft leaves review.",
    body: "PulseNote flags overstatement, unsupported confidence, and phrasing that belongs in an internal brief rather than a public note.",
  },
  {
    label: "Approval trail",
    title: "Human accountability stays on the record.",
    body: "The final wording, reviewer rationale, and approval responsibility remain inspectable after the export is generated.",
  },
  {
    label: "Export control",
    title: "The handoff is prepared, not auto-published.",
    body: "PulseNote stops at the publish pack so the people responsible for the release still control the final publication step.",
  },
];

const outputs = [
  {
    label: "Customer note",
    title: "Public release notes",
    body: "Explain what changed, why it matters, and what customers can do now without carrying internal phrasing into the final copy.",
  },
  {
    label: "Support brief",
    title: "Internal handoff",
    body: "Carry rollout caveats, likely questions, and known edges forward so downstream teams do not need to reverse-engineer the launch.",
  },
  {
    label: "Leadership recap",
    title: "Stakeholder summary",
    body: "Keep the shipped scope, customer impact, and approved language aligned for the people who need the release story quickly.",
  },
];

const questions = [
  {
    question: "Why not just draft this in ChatGPT or Claude?",
    answer:
      "General-purpose tools can help with writing, but your team still has to collect release context, inspect risky claims, and reconstruct who approved the final wording. PulseNote starts from the release record and keeps that trail attached to the draft.",
  },
  {
    question: "Does PulseNote publish automatically?",
    answer:
      "No. PulseNote prepares the draft, runs checks, collects approval, and exports the publish pack. Final publication still belongs to the humans responsible for the release.",
  },
  {
    question: "What does PulseNote ingest?",
    answer:
      "Release records, merged pull requests, linked issues, QA notes, rollout files, support context, and related discussion that explains what actually shipped.",
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

function SampleReleaseReview() {
  return (
    <aside className="pn-sample" aria-label="Sample release review">
      <div className="pn-sample-head">
        <div>
          <p className="pn-kicker">Sample release review</p>
          <h2>v2.4.0 permissions rollout</h2>
        </div>
        <p className="pn-sample-meta">Demo state. Illustrative data only.</p>
      </div>

      <div className="pn-sample-section">
        <p className="pn-sample-label">Evidence attached</p>
        <ul className="pn-bullet-list">
          <li>11 merged pull requests with shipped scope</li>
          <li>4 linked issues with rollout notes</li>
          <li>QA handoff and support caveats included</li>
        </ul>
      </div>

      <div className="pn-sample-section">
        <p className="pn-sample-label">Draft excerpt</p>
        <blockquote className="pn-sample-quote">
          Workspace admins can now assign permissions from the user detail view without switching screens.
        </blockquote>
      </div>

      <div className="pn-sample-section">
        <p className="pn-sample-label">Claim checks</p>
        <ul className="pn-status-list">
          <li>
            <span className="pn-status pn-status-review">Needs review</span>
            <span>“Faster for every admin” needs evidence.</span>
          </li>
          <li>
            <span className="pn-status pn-status-clear">Clear</span>
            <span>Workspace-level permission scope is backed by the shipped change.</span>
          </li>
        </ul>
      </div>

      <div className="pn-sample-section">
        <p className="pn-sample-label">Approval trail</p>
        <ul className="pn-bullet-list">
          <li>Engineering confirmed shipped scope</li>
          <li>Support requested a legacy-role caveat</li>
          <li>Product marketing approved customer wording</li>
        </ul>
      </div>
    </aside>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="pn-page">
      <div className="pn-site">
        <header className="pn-header reveal">
          <a className="pn-brand" href="#top">
            <BrandMark className="pn-brand-mark" alt="PulseNote brand mark" priority />
            <span className="pn-brand-copy">
              <strong>PulseNote</strong>
              <small>Release communication system</small>
            </span>
          </a>

          <nav className="pn-nav" aria-label="Primary">
            <a href="#system">Why now</a>
            <a href="#flow">Workflow</a>
            <a href="#review">Review</a>
            <a href="#questions">FAQ</a>
          </nav>

          <Link className="pn-link-pill" href="/coming-soon">
            Request access
          </Link>
        </header>

        <section id="top" className="pn-hero reveal">
          <div className="pn-hero-grid">
            <div className="pn-hero-copy">
              <p className="pn-kicker">Release communication system</p>
              <h1>Turn shipped work into approved release communication.</h1>
              <p className="pn-hero-lead">
                PulseNote gathers release context, drafts customer-safe copy, flags risky claims, and keeps approval
                visible until the publish pack is ready.
              </p>
              <p className="pn-hero-note">Not a blank AI writer. Start from the release record.</p>

              <div className="pn-actions">
                <Link className="pn-button" href="/coming-soon">
                  Request access
                </Link>
                <a className="pn-button pn-button-secondary" href="#flow">
                  See the workflow
                </a>
              </div>

              <p className="pn-hero-caption">Built for B2B SaaS teams shipping weekly or faster.</p>
            </div>

            <SampleReleaseReview />
          </div>

          <div className="pn-proof-strip" aria-label="Key product signals">
            {heroSignals.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>

        <section id="system" className="pn-section reveal">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Why teams switch</p>
              <h2>Most release risk appears after the code ships.</h2>
            </div>

            <p className="pn-section-aside">
              Teams already know how to ship. The failure usually happens in the public handoff, when context is
              scattered, claims drift, and approval becomes hard to inspect.
            </p>
          </div>

          <div className="pn-card-grid">
            {failurePoints.map((item) => (
              <article className="pn-card" key={item.title}>
                <p className="pn-card-label">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="flow" className="pn-section reveal">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Workflow</p>
              <h2>One operating flow from intake to export.</h2>
            </div>

            <p className="pn-section-aside">
              PulseNote is deliberately narrow. Each stage exists to move a release from engineering context to
              reviewable publication without losing the evidence trail.
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
        </section>

        <section id="review" className="pn-section reveal">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Review surface</p>
              <h2>Every decision stays inspectable before publish.</h2>
            </div>

            <p className="pn-section-aside">
              The draft, evidence, claim checks, and sign-off belong to the same record. That keeps review practical
              and makes approval responsibility visible.
            </p>
          </div>

          <div className="pn-card-grid pn-card-grid-wide">
            {reviewSurface.map((item) => (
              <article className="pn-card pn-card-muted" key={item.title}>
                <p className="pn-kicker">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="outputs" className="pn-section reveal">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Outputs</p>
              <h2>One reviewed source. Three usable outputs.</h2>
            </div>

            <p className="pn-section-aside">
              The approved customer note, internal handoff, and stakeholder summary all come from the same reviewed
              record instead of disconnected documents.
            </p>
          </div>

          <div className="pn-card-grid">
            {outputs.map((item) => (
              <article className="pn-card" key={item.title}>
                <p className="pn-kicker">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="questions" className="pn-section reveal">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Questions</p>
              <h2>Direct answers before anyone asks for a demo.</h2>
            </div>

            <p className="pn-section-aside">
              The product stays grounded: visible evidence, explicit checks, manual publication at the end.
            </p>
          </div>

          <div className="pn-faq-list">
            {questions.map((item) => (
              <details className="pn-faq-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pn-final reveal">
          <div className="pn-final-panel">
            <div>
              <p className="pn-kicker">Early access</p>
              <h2>Hosted access opens with review, approval, and publish-pack export.</h2>
            </div>

            <div className="pn-final-copy">
              <p>
                The first hosted surface is the release review workspace. It starts where the communication risk is
                highest, not on a blank page.
              </p>

              <div className="pn-actions">
                <Link className="pn-button" href="/coming-soon">
                  Request access
                </Link>
                <a className="pn-button pn-button-secondary" href="#review">
                  See what stays visible
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="pn-footer">
          <p>PulseNote</p>
          <p>Release communication with evidence, approval, and controlled export.</p>
        </footer>
      </div>
    </main>
  );
}
