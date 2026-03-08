# Anchra Release Note Draft

## Release Anchor
- Repository: `acme/anchra`
- Release: [March Reliability Release (v1.4.0)](https://github.com/acme/anchra/releases/tag/v1.4.0)
- Context collected at: `2026-03-07T09:00:00Z`
- Draft generated at: `2026-03-07T05:17:48Z`

## Suggested Framing
This release centers on safer publish workflows, stronger review coverage, and clearer customer-ready release communication. Keep the final summary tied to the shipped evidence below.

## What Shipped
- PR #14: Add publish pack diff export ([source](https://github.com/acme/anchra/pull/14))
- PR #22: Tighten billing migration claim checks ([source](https://github.com/acme/anchra/pull/22))
- PR #31: Retry failed publish pack exports ([source](https://github.com/acme/anchra/pull/31))

## Supporting Evidence To Weave Into Copy
- Linear: ENG-104: Track approval audit trail coverage ([source](https://linear.app/acme/issue/ENG-104))
- Linear: ENG-118: Clarify billing migration release wording ([source](https://linear.app/acme/issue/ENG-118))
- Slack (examples/demo-release/source/slack-product.txt): Keep customer-facing language focused on shipped workflow improvements. Do not imply universal rollout completion. Use "publish pack" consistently instead of "campaign kit".
- Slack (examples/demo-release/source/slack-support.txt): Billing migration copy needs a caution line for existing enterprise customers. The export retry fix reduced support escalations during QA. Internal teams need rollback wording before public publish.
- File `examples/demo-release/source/qa-notes.md`: Verified retry behavior for publish pack export on repeated network failures. Checked approval audit trail rendering for product and support reviewers. Flagged one unsupported rollout claim in an earlier release note draft.
- File `examples/demo-release/source/release-plan.md`: Publish customer-facing notes after support and product approve the billing migration wording. Include exporter retry and approval audit trail updates in the external draft. Send the deployment brief to support, success, and engineering leads before release day close.

## Publish Pack Notes
- Release anchor: [March Reliability Release (v1.4.0)](https://github.com/acme/anchra/releases/tag/v1.4.0)
- Include direct source links for customer-visible claims.
- Call out follow-up work separately if it is not already shipped.

## Review Gate
- Verify every outward-facing claim against the cited PRs, issues, Slack notes, or file evidence.
- Remove roadmap timing, internal-only terms, or impact claims that are not directly supported.
- Confirm this draft matches the audience and channel before sending.
