# Pulsenote CLI

Pulsenote CLI is the smallest executable slice of the product. It assembles release context and turns that evidence bundle into audience-specific communication drafts.

## Scope

- Collect release context from GitHub, Slack notes, and attached files
- Preserve a reviewable bundle as `context.json`
- Generate audience-specific drafts from that bundle
- Keep output tied to shipped evidence instead of open-ended writing prompts

## Commands

### Integration checks

```bash
go run ./cmd/pulsenote doctor
go run ./cmd/pulsenote github status
go run ./cmd/pulsenote linear status
go run ./cmd/pulsenote slack test --dry-run
```

### Collect a release bundle

```bash
go run ./cmd/pulsenote collect \
  --repo acme/pulsenote \
  --release-tag v1.4.0 \
  --linear-team ENG \
  --slack-note "Do not promise rollout timing in public copy." \
  --slack-file ./examples/demo-release/source/slack-product.txt \
  --file ./examples/demo-release/source \
  --out ./pulsenote-out/demo
```

This writes:

- `context.json`
- `context.md`
- `collect-receipt.json`

### Draft from a collected bundle

```bash
go run ./cmd/pulsenote draft \
  --context ./examples/demo-release/context.json \
  --audience external \
  --out ./examples/demo-release/output

go run ./cmd/pulsenote draft \
  --context ./examples/demo-release/context.json \
  --audience internal \
  --out ./examples/demo-release/output

go run ./cmd/pulsenote draft \
  --context ./examples/demo-release/context.json \
  --audience investor \
  --out ./examples/demo-release/output
```

Default formats by audience:

- `external` -> `release-note`
- `internal` -> `deployment-brief`
- `investor` -> `stakeholder-update`

You can override the format with `--format`, but the current CLI intentionally keeps the format list narrow.

## Example Bundle

`examples/demo-release/` contains:

- `source/`: representative Slack and release files
- `context.json`: a checked-in sample collect result
- `output/`: drafts generated from that sample bundle

Use it to evaluate output tone and section structure without needing live GitHub or Linear credentials.

## Environment Variables

- `PULSENOTE_GITHUB_TOKEN`
- `PULSENOTE_GITHUB_API_URL`
- `PULSENOTE_LINEAR_API_KEY`
- `PULSENOTE_LINEAR_API_URL`
- `PULSENOTE_SLACK_WEBHOOK_URL`

GitHub can also work through an authenticated `gh` CLI session.

## Validation

```bash
go test ./...
```

## MVP Boundaries

- This is not a generic document generator.
- Investor output is release-derived stakeholder communication, not a full investor relations suite.
- Final publish decisions still belong to human reviewers.
