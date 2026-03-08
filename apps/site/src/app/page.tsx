const heroChips = [
  "Collect once",
  "Check claims before publish",
  "Export every audience version",
];

const systemCards = [
  {
    title: "GitHub release record",
    body: "Pull release tags, merged pull requests, and issue context into the same working canvas.",
    meta: "Shipped scope",
  },
  {
    title: "Slack decisions",
    body: "Capture the wording debates that normally disappear into private channels and half-remembered threads.",
    meta: "Review context",
  },
  {
    title: "Rollout artifacts",
    body: "Bring QA notes, migration plans, and launch checklists into the release itself instead of treating them as side files.",
    meta: "Operational evidence",
  },
  {
    title: "Source-first drafting",
    body: "Anchra starts from a release record, not a blank prompt box asking for generic launch copy.",
    meta: "Opinionated by default",
  },
  {
    title: "Claims need a trail",
    body: "Customer-facing statements should point back to PRs, notes, or files that explain why the team can say them.",
    meta: "Evidence-linked communication",
  },
  {
    title: "Approval belongs in the workflow",
    body: "A draft is only useful when reviewers can inspect, redline, approve, and export it without chasing context elsewhere.",
    meta: "Review trail intact",
  },
];

const operatingFlow = [
  {
    step: "01",
    title: "Collect",
    body: "Gather release evidence, Slack decisions, and rollout files into one operating context.",
  },
  {
    step: "02",
    title: "Anchor",
    body: "Lock every important statement to the release and the source behind it.",
  },
  {
    step: "03",
    title: "Draft",
    body: "Generate audience-specific communication without rewriting the same facts three times.",
  },
  {
    step: "04",
    title: "Check",
    body: "Flag risky wording, unsupported certainty, and internal-only language before review.",
  },
  {
    step: "05",
    title: "Approve",
    body: "Keep edits, sign-off, and rationale in one visible decision trail.",
  },
  {
    step: "06",
    title: "Export",
    body: "Hand off a publish-ready release pack with notes, briefs, and evidence references.",
  },
];

const outputCards = [
  {
    label: "Customer",
    title: "Release notes that stay tied to shipped work",
    body: "Give product marketing a customer-safe starting point without lifting facts by hand from GitHub, Slack, and launch docs.",
    formats: "Release note, changelog, launch email",
  },
  {
    label: "Internal",
    title: "Briefs for the teams who answer questions next",
    body: "Get support, success, and operations the same release story before the public note starts moving.",
    formats: "Support handoff, deployment brief, rollout summary",
  },
  {
    label: "Stakeholder",
    title: "Leadership updates derived from the same release anchor",
    body: "Create executive or investor-facing summaries without drifting into generic storytelling or speculative language.",
    formats: "Leadership update, board snippet, investor recap",
  },
];

const reviewChecklist = [
  "Important claims should point back to release evidence before they leave the draft.",
  "Roadmap phrasing, certainty words, and internal codenames should be stopped before external publish.",
  "Approval history should stay attached to the release instead of disappearing across docs and DMs.",
  "Customer notes, internal briefs, and stakeholder updates should all derive from the same release anchor.",
];

const teamCards = [
  {
    title: "Product marketing",
    body: "Turn engineering context into customer-safe notes without chasing details across five systems.",
    meta: "Release note, changelog, launch email",
  },
  {
    title: "Engineering leads",
    body: "Keep shipped scope, known caveats, and exact phrasing aligned before anyone promises too much in public.",
    meta: "Scope review, known caveats, sign-off",
  },
  {
    title: "Support and success",
    body: "Get the internal brief before customers ask questions, with the same release facts the public note will rely on.",
    meta: "Support handoff, escalation notes, enablement",
  },
];

const faqs = [
  {
    question: "Why not just use ChatGPT or Claude?",
    answer:
      "You can, but your team still has to gather release context, police unsupported claims, and reconstruct approvals across chat and docs. Anchra starts with the release anchor and keeps that evidence trail attached to the draft.",
  },
  {
    question: "What does Anchra actually ingest?",
    answer:
      "GitHub release data, merged pull requests, linked issues, Slack notes or transcripts, and rollout files like QA notes, migration plans, and launch checklists.",
  },
  {
    question: "Does Anchra publish automatically?",
    answer:
      "No. Anchra is designed to collect, draft, check, approve, and export. Final publication still belongs to the humans responsible for the release.",
  },
  {
    question: "Is this a generic writer or investor-relations tool?",
    answer:
      "No. Anchra is for release-derived communication. Stakeholder updates are in scope only when they stay tied to what actually shipped.",
  },
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
          <a href="#system">System</a>
          <a href="#flow">Flow</a>
          <a href="#outputs">Outputs</a>
          <a href="#faq">FAQ</a>
        </nav>

        <a className="pn-link-pill" href="#pilot">
          Request design partner pilot
        </a>
      </header>

      <section id="top" className="pn-hero reveal">
        <div className="pn-hero-copy">
          <p className="pn-kicker">Anchored release communication</p>
          <h1>Release communication should not be written from memory.</h1>
          <p className="pn-hero-lead">
            Anchra gathers release evidence, Slack decisions, and rollout files
            into one release anchor, then turns that anchor into drafts,
            checks, approvals, and export-ready communication for every
            audience that needs an answer.
          </p>

          <div className="pn-actions">
            <a className="pn-button pn-button-primary" href="#pilot">
              Start with a pilot release
            </a>
            <a className="pn-button pn-button-secondary" href="#faq">
              Why not just use AI chat?
            </a>
          </div>

          <div className="pn-chip-row" aria-label="Anchra summary">
            {heroChips.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="pn-stat-grid">
            <article>
              <p className="pn-stat-label">Anchor</p>
              <p className="pn-stat-value">
                GitHub release data plus the context teams need to explain it
              </p>
            </article>
            <article>
              <p className="pn-stat-label">Outputs</p>
              <p className="pn-stat-value">
                Customer notes, internal briefs, leadership updates
              </p>
            </article>
            <article>
              <p className="pn-stat-label">Control</p>
              <p className="pn-stat-value">
                Claim checks, approval history, publish-ready evidence links
              </p>
            </article>
          </div>
        </div>

        <div className="pn-hero-stack" aria-label="Anchra release canvas">
          <article className="pn-workspace">
            <div className="pn-workspace-top">
              <div className="pn-window-dots" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <p>Anchra release canvas / Demo data</p>
            </div>

            <div className="pn-workspace-body">
              <div className="pn-workspace-column">
                <span>Collect</span>
                <h3>Release context bundle</h3>
                <p>GitHub release, PRs, Slack review notes, QA files, rollout plans</p>
              </div>
              <div className="pn-workspace-column">
                <span>Draft</span>
                <h3>Audience-specific versions</h3>
                <p>Customer note, support brief, leadership summary from the same anchor</p>
              </div>
              <div className="pn-workspace-column">
                <span>Check</span>
                <h3>Claims and wording review</h3>
                <p>Unsupported certainty, roadmap language, internal-only phrasing, missing evidence</p>
              </div>
            </div>

            <div className="pn-workspace-footer">
              <p>Result</p>
              <strong>One anchored release context, multiple approval-ready outputs</strong>
            </div>
          </article>

          <div className="pn-mini-grid">
            <article className="pn-mini-card">
              <p className="pn-mini-label">Review trail</p>
              <h3>Approvals stop living in Slack.</h3>
              <p>Edits, sign-off, and rationale stay attached to the release instead of vanishing into DMs.</p>
            </article>

            <article className="pn-mini-card">
              <p className="pn-mini-label">Boundary</p>
              <h3>Anchra is not a generic writer.</h3>
              <p>If a message is not anchored to a shipped release, it does not belong in the core workflow.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="pn-strip reveal" aria-label="Who Anchra is for">
        <p>No blank prompt box. No unsupported launch copy. No approvals buried in Slack.</p>
        <ul>
          <li>Product marketing</li>
          <li>Engineering leads</li>
          <li>Support and success</li>
          <li>Founders and operators</li>
        </ul>
      </section>

      <section id="system" className="pn-section reveal">
        <div className="pn-section-intro">
          <p className="pn-kicker">System</p>
          <h2>Anchra begins with a release anchor, not a blank canvas.</h2>
          <p>
            Teams do not need another generic writer. They need a system that
            can explain where a release statement came from, why it is safe to
            publish, and who signed off on it.
          </p>
        </div>

        <div className="pn-bento-grid">
          {systemCards.map((item) => (
            <article className="pn-bento-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span>{item.meta}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="flow" className="pn-section reveal">
        <div className="pn-section-intro">
          <p className="pn-kicker">Operating flow</p>
          <h2>Collect, anchor, draft, check, approve, export.</h2>
          <p>
            The workflow stays intentionally narrow so teams can move faster
            without losing traceability, confidence, or approval discipline.
          </p>
        </div>

        <ol className="pn-flow-grid">
          {operatingFlow.map((item) => (
            <li className="pn-flow-card" key={item.step}>
              <p className="pn-flow-step">{item.step}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="outputs" className="pn-section reveal">
        <div className="pn-section-intro">
          <p className="pn-kicker">Outputs</p>
          <h2>One release anchor can power every audience that needs an answer.</h2>
          <p>
            Anchra treats customer notes, internal rollout briefs, and
            leadership summaries as variants of the same release communication
            problem.
          </p>
        </div>

        <div className="pn-output-grid">
          {outputCards.map((item) => (
            <article className="pn-output-card" key={item.title}>
              <p className="pn-card-label">{item.label}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span>{item.formats}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="pn-section pn-review-band reveal">
        <article className="pn-review-card">
          <p className="pn-kicker">Review rules</p>
          <h2>Communication should survive scrutiny before it reaches a customer or executive inbox.</h2>
          <ul>
            {reviewChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <aside className="pn-flag-card" aria-label="Anchra review outcome example">
          <p className="pn-card-label">Sample review outcome</p>
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

      <section className="pn-section reveal">
        <div className="pn-section-intro">
          <p className="pn-kicker">Where Anchra fits</p>
          <h2>Built for the teams who feel the release communication bottleneck first.</h2>
          <p>
            Anchra is most useful when multiple teams need the same release
            story, but each one keeps reconstructing it from different systems.
          </p>
        </div>

        <div className="pn-team-grid">
          {teamCards.map((item) => (
            <article className="pn-team-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <span>{item.meta}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="pn-section reveal">
        <div className="pn-faq-shell">
          <div className="pn-section-intro pn-faq-intro">
            <p className="pn-kicker">FAQ</p>
            <h2>Answering the obvious objections up front.</h2>
            <p>
              Most teams already have a drafting tool. The harder part is
              knowing whether a release statement is anchored, safe to publish,
              and easy for reviewers to trust.
            </p>
          </div>

          <div className="pn-faq-list">
            {faqs.map((item, index) => (
              <details
                className="pn-faq-item"
                key={item.question}
                open={index === 0}
              >
                <summary>
                  <span className="pn-faq-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pn-faq-question">{item.question}</span>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
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
        <div className="pn-final-actions">
          <a className="pn-button pn-button-primary" href="#top">
            Review the anchored workflow
          </a>
          <a className="pn-button pn-button-secondary" href="#faq">
            Read the objections first
          </a>
        </div>
      </section>
    </main>
  );
}
