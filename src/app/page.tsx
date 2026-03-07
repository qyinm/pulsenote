const sourceCards = [
  {
    title: "GitHub Release Record",
    body: "Sync release tags, merged pull requests, and issue context so the draft starts from shipped work.",
    signal: "A factual release anchor",
  },
  {
    title: "Team Deliberation",
    body: "Pull the wording decisions hidden in Slack threads before they vanish into scattered chat history.",
    signal: "Shared context before approval",
  },
  {
    title: "Rollout Artifacts",
    body: "Attach QA notes, enablement docs, migration plans, and launch checklists to the same release workspace.",
    signal: "One release context, not five tabs",
  },
];

const operatingFlow = [
  {
    step: "01",
    title: "Collect",
    body: "Gather release evidence, chat decisions, and rollout files into one operating context.",
  },
  {
    step: "02",
    title: "Anchor",
    body: "Lock every important claim to the release event and the evidence behind it.",
  },
  {
    step: "03",
    title: "Draft",
    body: "Generate audience-specific communication without rewriting the same facts by hand.",
  },
  {
    step: "04",
    title: "Check",
    body: "Flag risky language, unsupported certainty, and internal-only phrasing before approval.",
  },
  {
    step: "05",
    title: "Approve",
    body: "Keep redlines, reviewer decisions, and rationale in one visible trail.",
  },
  {
    step: "06",
    title: "Export",
    body: "Hand off publish-ready notes, briefs, and supporting evidence as a release pack.",
  },
];

const outputCards = [
  {
    label: "Customer",
    title: "Release notes that can survive product and legal scrutiny",
    body: "Ship customer-facing updates without copying facts out of GitHub, Slack, and rollout docs by hand.",
    formats: "Release note, changelog, customer update",
  },
  {
    label: "Internal",
    title: "Launch briefs for teams who need to answer questions on day one",
    body: "Give support, success, and operations a single release brief before the public message goes live.",
    formats: "Deployment brief, support handoff, rollout summary",
  },
  {
    label: "Stakeholder",
    title: "Leadership updates derived from the same release source of truth",
    body: "Prepare executive or investor summaries without drifting into generic, unsupported storytelling.",
    formats: "Leadership update, board snippet, investor recap",
  },
];

const reviewRules = [
  "Important claims should point back to release evidence before they leave the draft.",
  "Roadmap phrasing, certainty words, and internal codenames should be stopped before external publish.",
  "Approval history should stay attached to the release instead of disappearing across docs and DMs.",
  "Customer notes, internal briefs, and stakeholder updates should all derive from the same release anchor.",
];

const productPrinciples = [
  {
    title: "Truth Over Polish",
    body: "Anchra optimizes for accurate release communication before it optimizes for elegant phrasing.",
  },
  {
    title: "Review Trail Over Chat Archaeology",
    body: "The product keeps edits, evidence, and approvals in one place so teams do not reconstruct decisions later.",
  },
  {
    title: "One Release, Multiple Outputs",
    body: "External notes, internal briefs, and leadership updates should be variants of the same release context.",
  },
];

const scopeIn = [
  "Release intake from GitHub, Slack notes, and rollout files",
  "Audience-specific drafting for release communication",
  "Safety checks for claims, wording risk, and review readiness",
  "Approval trace and publish pack export",
];

const scopeOut = [
  "Generic AI writing for unrelated marketing or content work",
  "A broad creator suite, scheduler, or editorial calendar",
  "Investor relations software detached from shipped releases",
  "Free-form generation without a release anchor",
];

export default function Home() {
  return (
    <main className="pn-site">
      <header className="pn-header reveal">
        <a className="pn-brand" href="#top">
          <span className="pn-brand-mark" aria-hidden>
            AN
          </span>
          <span className="pn-brand-copy">
            <strong>Anchra</strong>
            <small>Anchored release communication</small>
          </span>
        </a>

        <nav className="pn-nav" aria-label="Primary">
          <a href="#sources">Sources</a>
          <a href="#flow">Flow</a>
          <a href="#outputs">Outputs</a>
          <a href="#principles">Principles</a>
        </nav>

        <a className="pn-link-pill" href="#pilot">
          Request design partner pilot
        </a>
      </header>

      <section id="top" className="pn-hero reveal">
        <div className="pn-hero-copy">
          <p className="pn-kicker">Anchored release communication</p>
          <h1>Anchor every customer-facing release note to the work behind it.</h1>
          <p>
            Anchra turns release evidence, Slack decisions, and rollout files
            into one review-ready release communication workflow. Collect the
            context once, then draft, check, approve, and export the versions
            each audience actually needs without drifting away from shipped
            reality.
          </p>

          <div className="pn-actions">
            <a className="pn-button pn-button-primary" href="#pilot">
              Start with a pilot release
            </a>
            <a className="pn-button pn-button-secondary" href="#flow">
              See the operating flow
            </a>
          </div>

          <ul className="pn-stat-grid" aria-label="Anchra summary">
            <li>
              <p className="pn-stat-label">Anchor</p>
              <p className="pn-stat-value">
                GitHub release data plus the context teams need to explain it
              </p>
            </li>
            <li>
              <p className="pn-stat-label">Outputs</p>
              <p className="pn-stat-value">
                Customer notes, internal briefs, leadership updates
              </p>
            </li>
            <li>
              <p className="pn-stat-label">Control</p>
              <p className="pn-stat-value">
                Claim checks, approval history, publish-ready evidence links
              </p>
            </li>
          </ul>
        </div>

        <aside className="pn-console" aria-label="Anchra sample release run">
          <p className="pn-console-title">Sample Release Run / Demo Data</p>
          <ul>
            <li>
              <span>SRC</span>
              <p>Release tag, merged pull requests, and linked issue history imported from GitHub.</p>
            </li>
            <li>
              <span>SRC</span>
              <p>Slack review notes collected from product, support, and engineering.</p>
            </li>
            <li>
              <span>SRC</span>
              <p>QA notes, rollout checklists, and support enablement files attached to the release.</p>
            </li>
            <li>
              <span>OUT</span>
              <p>External release note draft with source-aware claims and review flags.</p>
            </li>
            <li>
              <span>OUT</span>
              <p>Internal launch brief for support, success, and operations.</p>
            </li>
            <li>
              <span>OUT</span>
              <p>Leadership update assembled from the same release anchor.</p>
            </li>
          </ul>
          <div className="pn-console-foot">
            <p>Result</p>
            <strong>One anchored release context, multiple approval-ready outputs</strong>
          </div>
        </aside>
      </section>

      <section className="pn-strip reveal" aria-label="Who Anchra is for">
        <p>Built for teams that ship weekly and cannot afford communication drift after release day</p>
        <ul>
          <li>Product marketing</li>
          <li>Engineering leads</li>
          <li>Support and success</li>
          <li>Founders and operators</li>
        </ul>
      </section>

      <section id="sources" className="pn-section pn-pillar-section reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">Source of truth</p>
          <h2>Anchra begins with a release anchor, not a blank canvas.</h2>
          <p className="pn-section-lead">
            Teams do not need another generic writer. They need a system that
            can explain where a release statement came from, why it is safe to
            publish, and who signed off on it.
          </p>
        </div>

        <div className="pn-input-grid">
          {sourceCards.map((item) => (
            <article className="pn-pillar" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <p className="pn-pillar-metric">{item.signal}</p>
            </article>
          ))}
        </div>

        <article className="pn-platform-note">
          <p className="pn-kicker">Boundary</p>
          <h3>Anchra is not a generic writer</h3>
          <p>
            If a message is not anchored to a release event and the evidence
            around it, it does not belong in Anchra&apos;s core workflow.
          </p>
        </article>
      </section>

      <section id="flow" className="pn-section pn-workflow reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">Operating flow</p>
          <h2>Collect, anchor, draft, check, approve, export.</h2>
          <p className="pn-section-lead">
            The workflow stays intentionally narrow so teams can move faster
            without losing traceability, confidence, or approval discipline.
          </p>
        </div>

        <ol>
          {operatingFlow.map((item) => (
            <li key={item.step}>
              <p className="pn-workflow-step">{item.step}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="outputs" className="pn-section pn-team-section reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">Outputs</p>
          <h2>One release anchor can power every audience that needs an answer.</h2>
          <p className="pn-section-lead">
            Anchra treats customer notes, internal rollout briefs, and
            leadership summaries as variants of the same release communication
            problem.
          </p>
        </div>

        <div className="pn-output-grid">
          {outputCards.map((item) => (
            <article className="pn-team-card" key={item.title}>
              <p className="pn-scope-eyebrow">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <p className="pn-team-outcome">{item.formats}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pn-section pn-safety reveal">
        <article className="pn-safety-main">
          <p className="pn-kicker">Review rules</p>
          <h2>Communication should survive scrutiny before it reaches a customer or executive inbox.</h2>
          <ul>
            {reviewRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </article>

        <aside className="pn-safety-note" aria-label="Sample Anchra review outcome">
          <p className="pn-safety-note-title">Sample Review Outcome</p>
          <div>
            <span>Flag</span>
            <strong>Unsupported certainty</strong>
          </div>
          <div>
            <span>Source gap</span>
            <strong>No release evidence attached to the rollout claim</strong>
          </div>
          <div>
            <span>Next step</span>
            <strong>Rewrite the statement or attach the release source before approval</strong>
          </div>
        </aside>
      </section>

      <section id="principles" className="pn-section pn-team-section reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">Brand principles</p>
          <h2>Anchra favors trust, reviewability, and operational clarity over broad AI promises.</h2>
        </div>

        <div className="pn-output-grid">
          {productPrinciples.map((item, index) => (
            <article className="pn-team-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <p className="pn-team-outcome">Principle {String(index + 1).padStart(2, "0")}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pn-section pn-scope-section reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">Scope</p>
          <h2>Anchra stays narrow on purpose.</h2>
        </div>

        <div className="pn-scope">
          <article className="pn-pillar">
            <p className="pn-scope-eyebrow">In scope</p>
            <ul className="pn-scope-list">
              {scopeIn.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="pn-pillar">
            <p className="pn-scope-eyebrow">Out of scope</p>
            <ul className="pn-scope-list">
              {scopeOut.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="pilot" className="pn-final reveal">
        <p className="pn-kicker">Pilot release</p>
        <h2>Anchra is for teams that already feel the release communication bottleneck.</h2>
        <p>
          If your team ships fast but still rewrites customer notes, support
          briefs, and stakeholder updates by hand, Anchra is the layer that
          keeps every version anchored to the same shipped release.
        </p>
        <a className="pn-button pn-button-primary" href="#top">
          Review the anchored workflow
        </a>
      </section>
    </main>
  );
}
