import Image from "next/image";
import React, { type SVGProps } from "react";

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

const heroStats = [
  {
    label: "Sources",
    value: "GitHub, Linear, Slack",
  },
  {
    label: "Safety",
    value: "Claim checks before review",
  },
  {
    label: "Output",
    value: "Publish pack with audit trail",
  },
];

const trustCards = [
  {
    label: "Evidence-linked",
    title: "Every public statement points back to shipped work.",
    body: "Release notes, internal briefs, and stakeholder updates stay tied to pull requests, issues, and rollout context.",
  },
  {
    label: "Claim-checked",
    title: "Risky wording gets flagged before anyone approves it.",
    body: "Unsupported certainty, internal-only language, and vague promises are surfaced before publication.",
  },
  {
    label: "Approval-ready",
    title: "Review happens in the same release record.",
    body: "Edits, rationale, and final sign-off stay visible instead of getting scattered across docs and DMs.",
  },
];

const faqs = [
  {
    question: "Why not just use ChatGPT or Claude?",
    answer:
      "You can, but your team still has to gather release context, police unsupported claims, and reconstruct approvals across chat and docs. PulseNote starts with the release anchor and keeps that evidence trail attached to the draft.",
  },
  {
    question: "What does PulseNote actually ingest?",
    answer:
      "GitHub release data, merged pull requests, linked issues, Slack notes or transcripts, and rollout files like QA notes, migration plans, and launch checklists.",
  },
  {
    question: "Does PulseNote publish automatically?",
    answer:
      "No. PulseNote is designed to collect, draft, check, approve, and export. Final publication still belongs to the humans responsible for the release.",
  },
  {
    question: "Is this a generic writer or investor-relations tool?",
    answer:
      "No. PulseNote is for release-derived communication. Stakeholder updates are in scope only when they stay tied to what actually shipped.",
  },
];

function LogosLinearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" {...props}>
      <path
        fill="currentColor"
        d="m8.174 102.613l145.213 145.213c2.12 2.12 1.097 5.72-1.85 6.27a128 128 0 0 1-15.02 1.896a3.78 3.78 0 0 1-2.92-1.109L1.117 122.403a3.78 3.78 0 0 1-1.109-2.92c.34-5.095.978-10.107 1.896-15.02c.55-2.947 4.15-3.97 6.27-1.85m-4.092 58.796c-.97-3.614 3.3-5.894 5.946-3.248l87.81 87.811c2.647 2.646.367 6.915-3.247 5.946c-44.03-11.805-78.704-46.478-90.51-90.509m12.727-97.245c1.233-2.135 4.147-2.463 5.89-.719L192.556 233.3c1.744 1.744 1.417 4.658-.72 5.891a128 128 0 0 1-11.1 5.705c-1.43.65-3.11.322-4.22-.79L11.893 79.487c-1.111-1.112-1.439-2.79-.79-4.221a128 128 0 0 1 5.706-11.1M127.86 0C198.63 0 256 57.37 256 128.14c0 37.57-16.168 71.362-41.926 94.8c-1.487 1.354-3.768 1.264-5.19-.157L33.217 47.116c-1.421-1.422-1.51-3.703-.158-5.19C56.498 16.168 90.291 0 127.86 0"
      />
    </svg>
  );
}

function LogosGithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1.03em" height="1em" viewBox="0 0 256 250" {...props}>
      <path
        fill="currentColor"
        d="M128.001 0C57.317 0 0 57.307 0 128.001c0 56.554 36.676 104.535 87.535 121.46c6.397 1.185 8.746-2.777 8.746-6.158c0-3.052-.12-13.135-.174-23.83c-35.61 7.742-43.124-15.103-43.124-15.103c-5.823-14.795-14.213-18.73-14.213-18.73c-11.613-7.944.876-7.78.876-7.78c12.853.902 19.621 13.19 19.621 13.19c11.417 19.568 29.945 13.911 37.249 10.64c1.149-8.272 4.466-13.92 8.127-17.116c-28.431-3.236-58.318-14.212-58.318-63.258c0-13.975 5-25.394 13.188-34.358c-1.329-3.224-5.71-16.242 1.24-33.874c0 0 10.749-3.44 35.21 13.121c10.21-2.836 21.16-4.258 32.038-4.307c10.878.049 21.837 1.47 32.066 4.307c24.431-16.56 35.165-13.12 35.165-13.12c6.967 17.63 2.584 30.65 1.255 33.873c8.207 8.964 13.173 20.383 13.173 34.358c0 49.163-29.944 59.988-58.447 63.157c4.591 3.972 8.682 11.762 8.682 23.704c0 17.126-.148 30.91-.148 35.126c0 3.407 2.304 7.398 8.792 6.14C219.37 232.5 256 184.537 256 128.002C256 57.307 198.691 0 128.001 0m-80.06 182.34c-.282.636-1.283.827-2.194.39c-.929-.417-1.45-1.284-1.15-1.922c.276-.655 1.279-.838 2.205-.399c.93.418 1.46 1.293 1.139 1.931m6.296 5.618c-.61.566-1.804.303-2.614-.591c-.837-.892-.994-2.086-.375-2.66c.63-.566 1.787-.301 2.626.591c.838.903 1 2.088.363 2.66m4.32 7.188c-.785.545-2.067.034-2.86-1.104c-.784-1.138-.784-2.503.017-3.05c.795-.547 2.058-.055 2.861 1.075c.782 1.157.782 2.522-.019 3.08m7.304 8.325c-.701.774-2.196.566-3.29-.49c-1.119-1.032-1.43-2.496-.726-3.27c.71-.776 2.213-.558 3.315.49c1.11 1.03 1.45 2.505.701 3.27m9.442 2.81c-.31 1.003-1.75 1.459-3.199 1.033c-1.448-.439-2.395-1.613-2.103-2.626c.301-1.01 1.747-1.484 3.207-1.028c1.446.436 2.396 1.602 2.095 2.622m10.744 1.193c.036 1.055-1.193 1.93-2.715 1.95c-1.53.034-2.769-.82-2.786-1.86c0-1.065 1.202-1.932 2.733-1.958c1.522-.03 2.768.818 2.768 1.868m10.555-.405c.182 1.03-.875 2.088-2.387 2.37c-1.485.271-2.861-.365-3.05-1.386c-.184-1.056.893-2.114 2.376-2.387c1.514-.263 2.868.356 3.061 1.403"
      />
    </svg>
  );
}

function LogosSlackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" {...props}>
      <path
        fill="#E01E5A"
        d="M53.841 161.32c0 14.832-11.987 26.82-26.819 26.82S.203 176.152.203 161.32c0-14.831 11.987-26.818 26.82-26.818H53.84zm13.41 0c0-14.831 11.987-26.818 26.819-26.818s26.819 11.987 26.819 26.819v67.047c0 14.832-11.987 26.82-26.82 26.82c-14.83 0-26.818-11.988-26.818-26.82z"
      />
      <path
        fill="#36C5F0"
        d="M94.07 53.638c-14.832 0-26.82-11.987-26.82-26.819S79.239 0 94.07 0s26.819 11.987 26.819 26.819v26.82zm0 13.613c14.832 0 26.819 11.987 26.819 26.819s-11.987 26.819-26.82 26.819H26.82C11.987 120.889 0 108.902 0 94.069c0-14.83 11.987-26.818 26.819-26.818z"
      />
      <path
        fill="#2EB67D"
        d="M201.55 94.07c0-14.832 11.987-26.82 26.818-26.82s26.82 11.988 26.82 26.82s-11.988 26.819-26.82 26.819H201.55zm-13.41 0c0 14.832-11.988 26.819-26.82 26.819c-14.831 0-26.818-11.987-26.818-26.82V26.82C134.502 11.987 146.489 0 161.32 0s26.819 11.987 26.819 26.819z"
      />
      <path
        fill="#ECB22E"
        d="M161.32 201.55c14.832 0 26.82 11.987 26.82 26.818s-11.988 26.82-26.82 26.82c-14.831 0-26.818-11.988-26.818-26.82V201.55zm0-13.41c-14.831 0-26.818-11.988-26.818-26.82c0-14.831 11.987-26.818 26.819-26.818h67.25c14.832 0 26.82 11.987 26.82 26.819s-11.988 26.819-26.82 26.819z"
      />
    </svg>
  );
}

const BrandMark = ({ className = "", alt = "PulseNote mark" }: { className?: string; alt?: string }) => (
  <Image className={className} src="/brand-mark.svg" alt={alt} width={64} height={64} />
);

const FlowVisualizer = () => (
  <div className="pn-orbit-panel">
    <div className="pn-orbit-shell" aria-hidden>
      <div className="pn-orbit-ring pn-orbit-ring-outer" />
      <div className="pn-orbit-ring pn-orbit-ring-inner" />

      <div className="pn-orbit-core">
        <BrandMark className="pn-orbit-core-mark" alt="" />
      </div>

      <div className="pn-orbit-track">
        <div className="pn-orbit-node pn-orbit-node-top">
          <div className="pn-orbit-node-icon" aria-hidden>
            <LogosGithubIcon />
          </div>
        </div>
        <div className="pn-orbit-node pn-orbit-node-right">
          <div className="pn-orbit-node-icon" aria-hidden>
            <LogosLinearIcon />
          </div>
        </div>
        <div className="pn-orbit-node pn-orbit-node-left">
          <div className="pn-orbit-node-icon" aria-hidden>
            <LogosSlackIcon />
          </div>
        </div>
      </div>
    </div>

    <div className="pn-orbit-copy">
      <p className="pn-card-label !text-[#c5a676]">Release-anchored</p>
      <h3 className="text-2xl mt-4 font-serif">Input systems attach to the same release record first.</h3>
      <p className="mt-4 opacity-70 text-sm leading-relaxed">
        GitHub, Linear, and Slack feed one release anchor before drafting, claim checks, and approval begin.
      </p>
    </div>
  </div>
);

const Terminal = () => (
  <div className="pn-workspace pn-workspace-hero reveal w-full">
    <div className="pn-workspace-top">
      <div className="pn-window-dots">
        <span />
        <span />
        <span />
      </div>
      <p>pulsenote session / release v2.4.0</p>
    </div>

    <div className="rounded-[22px] bg-[#111111] px-5 py-4 font-mono text-[13px] leading-6 text-[#f8f5ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[#c5a676]">$ pulsenote collect --release v2.4.0</p>
      <p className="mt-1.5 text-white/55">→ ingesting github evidence... [14 prs found]</p>
      <p className="text-white/55">→ sourcing slack context... [8 decisions found]</p>
      <p className="mt-3 text-[#c5a676]">$ pulsenote check --audience external</p>
      <p className="text-white/55">→ flagged unsupported certainty... [2 items]</p>
      <p className="mt-3 text-[#c5a676]">$ pulsenote pack --target external</p>
      <p className="text-white/80">✓ pack generated ./packs/v2.4-external.md</p>
    </div>

    <div className="pn-workspace-body pn-workspace-body-duo">
      <article className="pn-workspace-column">
        <span>Working set</span>
        <h3>Release evidence in one review surface.</h3>
        <p>PRs, Slack decisions, and rollout files stay attached before drafting starts.</p>
      </article>
      <article className="pn-workspace-column">
        <span>Current status</span>
        <h3>Claim check completed before approval.</h3>
        <p>Reviewers see flagged risk and the final audience pack in one pass.</p>
      </article>
    </div>
  </div>
);

const AudiencePackShowcase = () => (
  <section id="outputs" className="pn-section reveal !pt-32">
    <div className="pn-section-intro text-center mx-auto">
      <p className="pn-kicker">Outputs</p>
      <h2 className="text-5xl md:text-7xl !max-w-none">One release anchor. Every audience version.</h2>
      <p className="text-lg opacity-60 mt-4 max-w-xl mx-auto">
        Export public notes, internal briefs, and stakeholder summaries from the same reviewed source instead of rebuilding each one by hand.
      </p>
    </div>

    <div className="pn-output-grid mt-20">
      {[
        {
          label: "Customer",
          title: "Public Release Note",
          desc: "Customer-safe summary of what shipped, why it matters, and what users can do next.",
          meta: "Release notes, changelog, launch email",
        },
        {
          label: "Internal",
          title: "Support Handoff Brief",
          desc: "Operational pack for support and success with caveats, rollout notes, and expected questions.",
          meta: "Support brief, known issues, rollout context",
        },
        {
          label: "Leadership",
          title: "Executive Summary",
          desc: "Tight stakeholder view of shipped scope, customer impact, and approval-ready messaging.",
          meta: "Leadership update, stakeholder recap, approval trail",
        }
      ].map((pack) => (
        <article key={pack.title} className="pn-output-card border-line/30 !bg-surface/40 !p-12 hover:border-[#c5a676]/30 transition-colors">
          <p className="pn-card-label !text-[#c5a676]">{pack.label}</p>
          <h3 className="text-2xl font-serif mt-6">{pack.title}</h3>
          <p className="mt-4 opacity-60 text-sm leading-relaxed">{pack.desc}</p>
          <p className="pn-output-meta">{pack.meta}</p>
        </article>
      ))}
    </div>
  </section>
);

export default function Home() {
  return (
    <main className="pn-site">
      <header className="pn-header reveal">
        <a className="pn-brand" href="#top">
          <span className="pn-brand-mark" aria-hidden>
            <BrandMark className="pn-brand-mark-image" alt="" />
          </span>
          <span className="pn-brand-copy">
            <strong>PulseNote</strong>
            <small>Release Communication System</small>
          </span>
        </a>

        <nav className="pn-nav" aria-label="Primary">
          <a href="#system">System</a>
          <a href="#flow">Flow</a>
          <a href="#outputs">Outputs</a>
          <a href="#faq">FAQ</a>
        </nav>

        <a className="pn-link-pill" href="#download">
          Download CLI
        </a>
      </header>

      <section id="top" className="pn-hero reveal !mt-32">
        <div className="pn-hero-copy">
          <p className="pn-kicker !mb-4">Release Communication</p>
          <h1 className="leading-[0.85] tracking-[-0.07em] font-serif !max-w-none italic">AI release communication, anchored to what actually shipped.</h1>
          <p className="pn-hero-lead !mt-8 !max-w-xl text-lg lg:text-xl opacity-70">
            PulseNote gathers release evidence, Linear scope, and Slack decisions into one release anchor, then drafts, checks, and exports communication your team can actually review.
          </p>

          <div className="pn-actions !mt-10">
            <a className="pn-button pn-button-primary px-10" href="#download">
              Install CLI
            </a>
            <a className="pn-button pn-button-secondary px-10" href="#flow">
              See workflow
            </a>
          </div>

          <div className="pn-stat-grid">
            {heroStats.map((item) => (
              <article key={item.label}>
                <p className="pn-stat-label">{item.label}</p>
                <p className="pn-stat-value">{item.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="pn-hero-stack">
          <Terminal />
        </div>
      </section>

      <section id="system" className="pn-section reveal !pt-28 border-0">
        <div className="pn-section-intro text-center mx-auto">
          <p className="pn-kicker">Why PulseNote</p>
          <h2 className="text-5xl md:text-7xl !max-w-none">Built for release communication. Not generic AI writing.</h2>
          <p className="text-lg opacity-60 mt-5 max-w-2xl mx-auto">
            The job is not to generate more text. The job is to turn one release into customer-safe communication with evidence, checks, and approval intact.
          </p>
        </div>

        <div className="pn-bento-grid mt-16">
          {trustCards.map((item) => (
            <article className="pn-bento-card bg-surface/50 border-line/40 md:col-span-4" key={item.title}>
              <p className="pn-card-label !text-[#c5a676]">{item.label}</p>
              <h3 className="text-2xl mt-4 font-serif">{item.title}</h3>
              <p className="mt-4 opacity-70 text-sm leading-relaxed">{item.body}</p>
            </article>
          ))}

          <article className="pn-bento-card pn-orbit-bento md:col-span-12">
            <FlowVisualizer />
          </article>
        </div>
      </section>

      <section id="flow" className="pn-section reveal !pt-20">
        <div className="pn-section-intro">
          <p className="pn-kicker">How It Works</p>
          <h2 className="!max-w-none text-5xl md:text-7xl">Collect once. Draft once. Review once.</h2>
          <p className="text-lg opacity-60 mt-4">
            PulseNote keeps the workflow intentionally narrow so the same release anchor can power drafting, safety checks, approval, and export without rewriting the story each time.
          </p>
        </div>

        <ol className="pn-flow-grid mt-16">
          {operatingFlow.map((item) => (
            <li className="pn-flow-card !bg-surface/30 border-line/30 !p-10" key={item.step}>
              <p className="pn-flow-step !text-[#c5a676] !font-bold">[{item.step}]</p>
              <h3 className="text-2xl font-serif mt-4">{item.title}</h3>
              <p className="mt-4 opacity-70 text-sm leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <AudiencePackShowcase />

      <section id="faq" className="pn-section reveal !pt-40">
        <div className="pn-faq-shell">
          <div className="pn-section-intro pn-faq-intro">
            <p className="pn-kicker">FAQ</p>
            <h2 className="text-5xl md:text-6xl">Questions.</h2>
            <p className="text-lg opacity-60 mt-4">
              Anchoring release context isn&apos;t just about automation. It&apos;s about trust.
            </p>
          </div>

          <div className="pn-faq-list">
            {faqs.map((item, index) => (
              <details
                className="pn-faq-item border-line/20 !bg-surface/20"
                key={item.question}
                open={index === 0}
              >
                <summary className="!py-8">
                  <span className="pn-faq-index !bg-surface/40 !border-line/20">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pn-faq-question font-serif text-xl">{item.question}</span>
                </summary>
                <p className="!py-8 !px-12 opacity-70 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="download" className="pn-final reveal !bg-none !border-0 !pt-40 !pb-20">
        <p className="pn-kicker !text-[#c5a676]">Start Now</p>
        <h2 className="text-6xl md:text-8xl !max-w-none italic">Your releases. <br/> Your evidence.</h2>
        <p className="text-xl opacity-60 mt-8 max-w-2xl mx-auto">
          Download the PulseNote CLI to guide your release communication workflows. Keep the interface anchored to collect, draft, check, approve, and export.
        </p>
        <div className="pn-final-actions !mt-12">
          <a className="pn-button pn-button-primary px-12" href="#top">
            Install CLI
          </a>
        </div>
      </section>
    </main>
  );
}
