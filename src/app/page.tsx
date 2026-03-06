const inputSources = [
  {
    title: "GitHub Release Evidence",
    body: "Import tagged releases, merged pull requests, and linked issues to define what actually shipped.",
    output: "Release anchor plus evidence links",
  },
  {
    title: "Slack Team Context",
    body: "Pull decisions, risk notes, and support language from the release channel before they disappear in chat.",
    output: "Reviewable coordination context",
  },
  {
    title: "Attached Release Files",
    body: "Bring rollout docs, QA notes, migration plans, and draft changelogs into the same release workspace.",
    output: "One evidence bundle per release",
  },
];

const workflow = [
  {
    step: "01",
    title: "Collect",
    body: "Assemble GitHub, Slack, and file evidence into one release context.",
  },
  {
    step: "02",
    title: "Draft",
    body: "Generate audience-specific communication starters from the release anchor.",
  },
  {
    step: "03",
    title: "Check",
    body: "Flag unsupported claims, internal-only wording, and risky language before review.",
  },
  {
    step: "04",
    title: "Approve",
    body: "Capture redlines, rationale, and explicit sign-off across teams.",
  },
  {
    step: "05",
    title: "Export",
    body: "Deliver a publish pack with final copy, evidence links, and revision history.",
  },
];

const audiencePacks = [
  {
    audience: "External",
    title: "Release note draft",
    body: "Customer-facing release communication anchored to what shipped, not to vague product storytelling.",
    output: "Changelog, release note, customer update",
  },
  {
    audience: "Internal",
    title: "Deployment brief",
    body: "Give support, success, and internal teams the rollout context they need before public publish.",
    output: "Launch brief, support handoff, rollout note",
  },
  {
    audience: "Stakeholder",
    title: "Release-derived update",
    body: "Create a concise investor or board update starter grounded in release evidence rather than generic narrative.",
    output: "Stakeholder update snippet, leadership brief",
  },
];

const guardrails = [
  "Require evidence-linked support for major product claims",
  "Flag roadmap promises or absolute statements without backing",
  "Catch internal codenames before public publication",
  "Highlight security and compliance-sensitive language",
  "Preserve actor and timestamp for every approval decision",
];

const principles = [
  {
    title: "Truth Over Polish",
    body: "Important claims should stay traceable to source evidence.",
  },
  {
    title: "Release-Anchored Output",
    body: "Every document begins with a release event, not an empty generic editor.",
  },
  {
    title: "Human Accountability",
    body: "Final publication decisions stay with people, with review history preserved.",
  },
];

const inScope = [
  "Release intake from GitHub, Slack notes, and attached files",
  "Audience-specific draft generation for release communication",
  "Claim and language guardrails before send",
  "Review and approval workflow with decision history",
  "Publish pack export with evidence links",
];

const outOfScope = [
  "Generic writing assistant for unrelated content",
  "Broad creator studio or social scheduler",
  "Standalone investor relations suite disconnected from releases",
  "Feature additions with no release communication value",
];

export default function Home() {
  return (
    <main className="pn-site">
      <header className="pn-header reveal">
        <a className="pn-brand" href="#top">
          <span className="pn-brand-mark" aria-hidden>
            PN
          </span>
          <span className="pn-brand-copy">
            <strong>Pulsenote</strong>
            <small>Release communication system</small>
          </span>
        </a>

        <nav className="pn-nav" aria-label="Primary">
          <a href="#inputs">Inputs</a>
          <a href="#workflow">Workflow</a>
          <a href="#outputs">Outputs</a>
          <a href="#scope">Scope</a>
        </nav>

        <a className="pn-link-pill" href="#beta">
          Request private beta
        </a>
      </header>

      <section id="top" className="pn-hero reveal">
        <div className="pn-hero-copy">
          <p className="pn-kicker">Release communication system</p>
          <h1>Turn release context into review-ready communication packs.</h1>
          <p>
            Pulsenote collects GitHub releases, Slack decisions, and release
            files, then prepares audience-specific drafts for external notes,
            internal rollout briefs, and release-derived stakeholder updates.
          </p>

          <div className="pn-actions">
            <a className="pn-button pn-button-primary" href="#beta">
              Join private beta
            </a>
            <a className="pn-button pn-button-secondary" href="#workflow">
              See the flow
            </a>
          </div>

          <ul className="pn-stat-grid" aria-label="Product summary">
            <li>
              <p className="pn-stat-label">Inputs</p>
              <p className="pn-stat-value">GitHub, Slack, and attached release files</p>
            </li>
            <li>
              <p className="pn-stat-label">Outputs</p>
              <p className="pn-stat-value">External note, internal brief, stakeholder update</p>
            </li>
            <li>
              <p className="pn-stat-label">Control</p>
              <p className="pn-stat-value">Evidence links, safety checks, approval history</p>
            </li>
          </ul>
        </div>

        <aside className="pn-console" aria-label="Sample release pack">
          <p className="pn-console-title">Sample Release Pack / Demo Data</p>
          <ul>
            <li>
              <span>IN</span>
              <p>GitHub release `v1.4.0` with 12 merged pull requests and linked issues.</p>
            </li>
            <li>
              <span>IN</span>
              <p>Slack notes from product, support, and engineering on billing migration wording.</p>
            </li>
            <li>
              <span>IN</span>
              <p>Attached rollout checklist, QA notes, and draft changelog from the release folder.</p>
            </li>
            <li>
              <span>OUT</span>
              <p>Customer-facing release note draft with evidence-linked claims.</p>
            </li>
            <li>
              <span>OUT</span>
              <p>Internal deployment brief for support, success, and launch coordination.</p>
            </li>
            <li>
              <span>OUT</span>
              <p>Release-derived stakeholder update starter for leadership or investors.</p>
            </li>
          </ul>
          <div className="pn-console-foot">
            <p>Status</p>
            <strong>3 review-ready outputs assembled from one release anchor</strong>
          </div>
        </aside>
      </section>

      <section className="pn-strip reveal" aria-label="Who this is for">
        <p>Built for B2B teams shipping product changes weekly or faster</p>
        <ul>
          <li>Product marketing</li>
          <li>Engineering leads</li>
          <li>Support and success</li>
          <li>Founders and product operators</li>
        </ul>
      </section>

      <section id="inputs" className="pn-section pn-pillar-section reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">Inputs</p>
          <h2>One release context, assembled from the tools where teams already work.</h2>
          <p className="pn-section-lead">
            Pulsenote starts from evidence, not from a blank writing surface.
            The release anchor stays visible from first draft through final
            publish pack.
          </p>
        </div>

        <div className="pn-input-grid">
          {inputSources.map((item) => (
            <article className="pn-pillar" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <p className="pn-pillar-metric">{item.output}</p>
            </article>
          ))}
        </div>

        <article className="pn-platform-note">
          <p className="pn-kicker">Boundary</p>
          <h3>Not a generic writer</h3>
          <p>
            Pulsenote is designed to turn release evidence into reviewable
            communication. If content is not anchored to a release, it is out of
            scope for the core workflow.
          </p>
        </article>
      </section>

      <section id="workflow" className="pn-section pn-workflow reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">Workflow</p>
          <h2>Collect, draft, check, approve, export.</h2>
          <p className="pn-section-lead">
            The path is intentionally narrow so teams can move faster without
            losing traceability or review control.
          </p>
        </div>

        <ol>
          {workflow.map((item) => (
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
          <h2>Different audiences, one release anchor.</h2>
          <p className="pn-section-lead">
            The output changes by audience, but every version stays tied to the
            same release event and evidence bundle.
          </p>
        </div>

        <div className="pn-output-grid">
          {audiencePacks.map((item) => (
            <article className="pn-team-card" key={item.title}>
              <p className="pn-scope-eyebrow">{item.audience}</p>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <p className="pn-team-outcome">{item.output}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pn-section pn-safety reveal">
        <article className="pn-safety-main">
          <p className="pn-kicker">Guardrails</p>
          <h2>Safety and evidence checks happen before anything customer-facing leaves the team.</h2>
          <ul>
            {guardrails.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </article>

        <aside className="pn-safety-note" aria-label="Sample guardrail finding">
          <p className="pn-safety-note-title">Sample Finding</p>
          <div>
            <span>Severity</span>
            <strong>High</strong>
          </div>
          <div>
            <span>Rule</span>
            <strong>Unsupported rollout claim</strong>
          </div>
          <div>
            <span>Action</span>
            <strong>Link the shipped evidence or rewrite before sending the external note.</strong>
          </div>
        </aside>
      </section>

      <section className="pn-section pn-team-section reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">Principles</p>
          <h2>Pulsenote favors trust, reviewability, and practical simplicity over breadth.</h2>
        </div>

        <div className="pn-output-grid">
          {principles.map((item, index) => (
            <article className="pn-team-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <p className="pn-team-outcome">Rule {String(index + 1).padStart(2, "0")}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="scope" className="pn-section pn-scope-section reveal">
        <div className="pn-section-head">
          <p className="pn-kicker">V1 Boundaries</p>
          <h2>What belongs in the first version, and what does not.</h2>
        </div>

        <div className="pn-scope">
          <article className="pn-pillar">
            <p className="pn-scope-eyebrow">In scope</p>
            <ul className="pn-scope-list">
              {inScope.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="pn-pillar">
            <p className="pn-scope-eyebrow">Out of scope</p>
            <ul className="pn-scope-list">
              {outOfScope.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="beta" className="pn-final reveal">
        <p className="pn-kicker">Private beta</p>
        <h2>We are working first with teams that already feel release communication pain.</h2>
        <p>
          If your team ships often and needs one release context to drive safer,
          faster, more reviewable communication, Pulsenote is built for that
          workflow.
        </p>
        <a className="pn-button pn-button-primary" href="mailto:founder@pulsenote.ai">
          Request private beta access
        </a>
      </section>
    </main>
  );
}
