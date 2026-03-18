import Image from "next/image";
import Link from "next/link";

const heroSignals = [
  "Release context stays attached to the draft.",
  "Claim checks run before anyone signs off.",
  "The publish pack leaves as one reviewed handoff.",
];

const heroPillars = [
  {
    label: "Source-backed",
    body: "Keep shipped scope, evidence links, and reviewer context visible while the wording changes.",
  },
  {
    label: "Approval-ready",
    body: "Claim checks and human sign-off happen before the publish pack moves downstream.",
  },
];

const heroFacts = [
  {
    label: "Inputs",
    value: "Pull requests, linked issues, rollout notes, and QA context.",
  },
  {
    label: "Checks",
    value: "Unsupported certainty, internal-only wording, and missing evidence.",
  },
  {
    label: "Approvals",
    value: "Engineering, support, and product marketing sign-off in one trail.",
  },
  {
    label: "Outputs",
    value: "Public release notes, support brief, and stakeholder summary.",
  },
];

const failurePoints = [
  {
    label: "01",
    title: "Context gets rebuilt from scratch",
    body: "Merged pull requests, linked issues, rollout notes, QA caveats, and support context rarely live in one place. Teams rewrite the release story by hand and lose traceability in the process.",
  },
  {
    label: "02",
    title: "Public wording drifts from the evidence",
    body: "Language often becomes more certain as it moves through docs and chat. Unsupported certainty slips in after the product work is already done.",
  },
  {
    label: "03",
    title: "Approval is hard to reconstruct later",
    body: "Marketing, engineering, and support all review the release, but the final wording, rationale, and sign-off usually do not stay attached to the draft.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Ingest release context",
    body: "Pull shipped scope, linked issues, rollout notes, support context, and customer-facing constraints into one release record.",
  },
  {
    step: "02",
    title: "Draft public communication",
    body: "Generate a customer-facing draft from the release record instead of rebuilding the message from scratch for every reviewer.",
  },
  {
    step: "03",
    title: "Run claim checks",
    body: "Flag unsupported certainty, missing evidence, and internal-only wording before approval begins.",
  },
  {
    step: "04",
    title: "Collect approval",
    body: "Keep edits, comments, rationale, and human sign-off visible in the same place as the draft.",
  },
  {
    step: "05",
    title: "Export the publish pack",
    body: "Send approved notes, support briefing, stakeholder summary, and evidence references forward as one controlled handoff.",
  },
];

const reviewSurface = [
  {
    label: "Release record",
    title: "Source evidence stays visible while wording changes",
    body: "Pull requests, issues, QA notes, and rollout files remain attached to the draft instead of becoming off-screen references.",
  },
  {
    label: "Claim checks",
    title: "Risky language is explicit before the draft leaves review",
    body: "PulseNote surfaces overstatement, unsupported confidence, and phrasing that belongs in an internal brief rather than a public note.",
  },
  {
    label: "Approval trail",
    title: "Human accountability stays on the record",
    body: "The final wording, reviewer rationale, and approval responsibility remain inspectable after the release is handed off.",
  },
  {
    label: "Export control",
    title: "The handoff is prepared, not auto-published",
    body: "PulseNote stops at the publish pack so the people responsible for publication still control the final step.",
  },
];

const outputs = [
  {
    label: "Customer-facing",
    title: "Public release notes",
    body: "Explain what changed, why it matters, and what customers can do now without carrying internal language into the final copy.",
  },
  {
    label: "Support and success",
    title: "Support brief",
    body: "Carry rollout caveats, likely questions, and known edges forward so downstream teams do not have to reverse-engineer the launch.",
  },
  {
    label: "Internal alignment",
    title: "Stakeholder summary",
    body: "Keep shipped scope, customer impact, and approved wording aligned for leadership and internal stakeholders.",
  },
];

const questions = [
  {
    question: "Why not just draft this in ChatGPT or Claude?",
    answer:
      "General-purpose tools can help with writing, but your team still has to gather release context, check risky claims, and reconstruct who approved the final wording. PulseNote starts from the release record and keeps that trail attached to the draft.",
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
  {
    question: "Who is PulseNote for?",
    answer:
      "PulseNote is built for B2B SaaS teams shipping weekly or faster, especially when engineering, support, and product marketing all need to align on exact customer-facing language.",
  },
];

const anchorPoints = [
  "Built for B2B SaaS teams shipping weekly or faster",
  "Designed for engineering, support, and product marketing sign-off",
  "Exports a publish pack without forcing auto-publication",
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

function ReleaseReviewCanvas() {
  return (
    <aside className="pn-release-board" aria-label="Sample release review">
      <div className="pn-board-head">
        <div>
          <p className="pn-kicker">Sample release review</p>
          <h2>Q1 permissions rollout candidate</h2>
        </div>
        <p className="pn-board-meta">Demo state. Illustrative data only.</p>
      </div>

      <div className="pn-board-grid">
        <section className="pn-board-card">
          <p className="pn-board-label">Evidence attached</p>
          <ul className="pn-board-list">
            <li>11 merged pull requests linked to shipped scope</li>
            <li>4 related issues with rollout notes attached</li>
            <li>QA handoff and support caveats included</li>
          </ul>
        </section>

        <section className="pn-board-card pn-board-card-emphasis">
          <p className="pn-board-label">Draft excerpt</p>
          <blockquote className="pn-board-quote">
            Workspace admins can now assign permissions from the user detail view without switching screens.
          </blockquote>
        </section>

        <section className="pn-board-card">
          <p className="pn-board-label">Claim checks</p>
          <ul className="pn-board-status-list">
            <li>
              <span className="pn-status pn-status-review">Needs review</span>
              <span>“Faster for every admin” needs evidence.</span>
            </li>
            <li>
              <span className="pn-status pn-status-clear">Clear</span>
              <span>Workspace-level permission scope is backed by the shipped change.</span>
            </li>
          </ul>
        </section>

        <section className="pn-board-card">
          <p className="pn-board-label">Approval trail</p>
          <ul className="pn-board-list">
            <li>Engineering confirmed shipped scope</li>
            <li>Support requested a legacy-role caveat</li>
            <li>Product marketing approved customer wording</li>
          </ul>
        </section>
      </div>

      <div className="pn-board-footer">
        <span>Public release notes</span>
        <span>Support brief</span>
        <span>Stakeholder summary</span>
      </div>
    </aside>
  );
}

export default function Home() {
  return (
    <main id="main-content" className="pn-page">
      <div className="pn-site">
        <header className="pn-header">
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

        <section id="top" className="pn-hero">
          <div className="pn-hero-shell">
            <div className="pn-hero-copy">
              <p className="pn-kicker">Release communication system</p>
              <h1>
                <span>Turn shipped work</span>
                <span>into approved</span>
                <span>release communication.</span>
              </h1>
              <p className="pn-hero-lead">
                PulseNote gathers release context, drafts customer-safe wording, flags risky claims, and keeps
                approval visible until the publish pack is ready.
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

              <div className="pn-chip-row" aria-label="Audience and workflow notes">
                <span className="pn-chip">Built for B2B SaaS teams shipping weekly or faster</span>
                <span className="pn-chip">Source-backed drafting with visible approvals</span>
              </div>

              <dl className="pn-hero-ledger" aria-label="PulseNote operating model">
                {heroFacts.map((item, index) => (
                  <div className="pn-hero-ledger-row" key={item.label}>
                    <dt>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{item.label}</strong>
                    </dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="pn-hero-stack">
              <div className="pn-manifesto">
                <div className="pn-manifesto-head">
                  <p className="pn-kicker">Why this category works</p>
                  <p className="pn-manifesto-copy">
                    Generic changelog tools help after the sentence is already written. PulseNote keeps the release
                    record attached until the language is safe and approved.
                  </p>
                </div>

                <div className="pn-manifesto-grid">
                  {heroPillars.map((item) => (
                    <article className="pn-manifesto-item" key={item.label}>
                      <p>{item.label}</p>
                      <span>{item.body}</span>
                    </article>
                  ))}
                </div>
              </div>

              <ReleaseReviewCanvas />
            </div>
          </div>

          <div className="pn-signal-strip" aria-label="Key product signals">
            {heroSignals.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>

        <section id="system" className="pn-section">
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

          <div className="pn-problem-grid">
            {failurePoints.map((item, index) => (
              <article className={`pn-problem-card${index === 0 ? " pn-problem-card-featured" : ""}`} key={item.title}>
                <p className="pn-card-index">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="flow" className="pn-section pn-section-flow">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">The workflow</p>
              <h2>One operating flow from source context to publish pack.</h2>
            </div>

            <p className="pn-section-aside">
              PulseNote is built around release communication, not generic writing. Every step keeps the release record
              visible until the handoff is ready.
            </p>
          </div>

          <div className="pn-flow-layout">
            <aside className="pn-flow-anchor" aria-label="PulseNote positioning">
              <p className="pn-kicker">What stays true</p>
              <h3>Start from shipped work, not from a blank page.</h3>
              <p>
                The product stays narrow on purpose. It exists to move a release from engineering context to approved
                customer-facing communication without losing evidence or approval responsibility.
              </p>

              <ul className="pn-anchor-list">
                {anchorPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </aside>

            <ol className="pn-flow-list">
              {workflow.map((item) => (
                <li className="pn-flow-row" key={item.step}>
                  <span className="pn-flow-step">{item.step}</span>
                  <div className="pn-flow-copy">
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="review" className="pn-section">
          <div className="pn-review-grid">
            <article className="pn-review-intro">
              <p className="pn-kicker">Review without drift</p>
              <h2>Keep the wording, the evidence, and the decision trail together.</h2>
              <p>
                The release record, claim checks, reviewer comments, and sign-off belong to the same surface. That
                makes review practical and keeps approval responsibility visible after the handoff is generated.
              </p>
              <blockquote className="pn-review-quote">
                PulseNote is designed for the moment before publication, when public wording still needs to be proven
                and approved.
              </blockquote>
            </article>

            <div className="pn-review-list">
              {reviewSurface.map((item) => (
                <article className="pn-review-card" key={item.title}>
                  <p className="pn-kicker">{item.label}</p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="outputs" className="pn-section">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Outputs from one release record</p>
              <h2>Prepare the right communication for each audience.</h2>
            </div>

            <p className="pn-section-aside">
              The approved customer note, support briefing, and stakeholder summary all come from the same reviewed
              record instead of disconnected documents.
            </p>
          </div>

          <div className="pn-output-grid">
            {outputs.map((item) => (
              <article className="pn-output-card" key={item.title}>
                <p className="pn-kicker">{item.label}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="questions" className="pn-section">
          <div className="pn-section-head">
            <div className="pn-section-copy">
              <p className="pn-kicker">Direct answers</p>
              <h2>Clear boundaries before anyone asks for a demo.</h2>
            </div>

            <p className="pn-section-aside">
              The product stays grounded: visible evidence, explicit checks, manual publication at the end.
            </p>
          </div>

          <div className="pn-question-grid">
            {questions.map((item) => (
              <article className="pn-question-card" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pn-final">
          <div className="pn-final-panel">
            <div className="pn-final-head">
              <p className="pn-kicker">Early access</p>
              <h2>Give your release communication the same review discipline as the release itself.</h2>
            </div>

            <div className="pn-final-copy">
              <p>
                PulseNote helps teams move from shipped work to customer-safe communication without losing the
                evidence, review context, or approval trail in between.
              </p>

              <div className="pn-actions">
                <Link className="pn-button" href="/coming-soon">
                  Request access
                </Link>
                <a className="pn-button pn-button-secondary" href="#review">
                  See what stays visible
                </a>
              </div>

              <ul className="pn-anchor-list">
                {anchorPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="pn-footer">
          <p>PulseNote</p>
          <p>Source-backed release communication for teams shipping weekly or faster.</p>
        </footer>
      </div>
    </main>
  );
}
