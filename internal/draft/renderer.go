package draft

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"pulsenote-cli/internal/releasecontext"
)

type RenderInput struct {
	Bundle      releasecontext.Bundle
	Audience    Audience
	Format      string
	GeneratedAt time.Time
}

func RenderMarkdown(input RenderInput) string {
	bundle := input.Bundle
	prs := append([]releasecontext.PullRequest(nil), bundle.GitHub.PullRequests...)
	issues := append([]releasecontext.Issue(nil), bundle.Linear.Issues...)
	slackSnippets := append([]releasecontext.SlackSnippet(nil), bundle.Slack.Snippets...)
	documents := append([]releasecontext.Document(nil), bundle.Files...)

	sort.Slice(prs, func(i int, j int) bool { return prs[i].Number < prs[j].Number })
	sort.Slice(issues, func(i int, j int) bool { return issues[i].Identifier < issues[j].Identifier })
	sort.Slice(slackSnippets, func(i int, j int) bool { return slackSnippets[i].Source < slackSnippets[j].Source })
	sort.Slice(documents, func(i int, j int) bool { return documents[i].Path < documents[j].Path })

	generatedAt := input.GeneratedAt.UTC().Format(time.RFC3339)
	if input.GeneratedAt.IsZero() {
		generatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	var b strings.Builder
	b.WriteString(titleFor(input.Audience, input.Format))
	b.WriteString("\n\n")

	b.WriteString("## Release Anchor\n")
	b.WriteString(fmt.Sprintf("- Repository: `%s`\n", bundle.GitHub.Repo))
	b.WriteString("- Release: ")
	b.WriteString(formatRelease(bundle.GitHub.Release))
	b.WriteString("\n")
	b.WriteString(fmt.Sprintf("- Context collected at: `%s`\n", bundle.CollectedAt))
	b.WriteString(fmt.Sprintf("- Draft generated at: `%s`\n\n", generatedAt))

	switch input.Audience {
	case AudienceExternal:
		writeExternalSections(&b, bundle, prs, issues, slackSnippets, documents)
	case AudienceInternal:
		writeInternalSections(&b, bundle, prs, issues, slackSnippets, documents)
	case AudienceInvestor:
		writeInvestorSections(&b, bundle, prs, issues, slackSnippets, documents)
	}

	b.WriteString("## Review Gate\n")
	b.WriteString("- Verify every outward-facing claim against the cited PRs, issues, Slack notes, or file evidence.\n")
	b.WriteString("- Remove roadmap timing, internal-only terms, or impact claims that are not directly supported.\n")
	b.WriteString("- Confirm this draft matches the audience and channel before sending.\n")

	return b.String()
}

func titleFor(audience Audience, format string) string {
	switch audience {
	case AudienceExternal:
		return "# Pulsenote Release Note Draft"
	case AudienceInternal:
		return "# Pulsenote Deployment Brief Draft"
	case AudienceInvestor:
		return "# Pulsenote Stakeholder Update Draft"
	default:
		return "# Pulsenote Draft (" + format + ")"
	}
}

func writeExternalSections(b *strings.Builder, bundle releasecontext.Bundle, prs []releasecontext.PullRequest, issues []releasecontext.Issue, slack []releasecontext.SlackSnippet, docs []releasecontext.Document) {
	b.WriteString("## Suggested Framing\n")
	b.WriteString("This release centers on safer publish workflows, stronger review coverage, and clearer customer-ready release communication. Keep the final summary tied to the shipped evidence below.\n\n")

	b.WriteString("## What Shipped\n")
	writePRList(b, prs, "- No merged pull requests were collected for this release window.\n")
	b.WriteString("\n")

	b.WriteString("## Supporting Evidence To Weave Into Copy\n")
	writeIssueList(b, issues)
	writeSlackList(b, slack)
	writeDocumentList(b, docs)
	b.WriteString("\n")

	b.WriteString("## Publish Pack Notes\n")
	b.WriteString(fmt.Sprintf("- Release anchor: %s\n", formatRelease(bundle.GitHub.Release)))
	b.WriteString("- Include direct source links for customer-visible claims.\n")
	b.WriteString("- Call out follow-up work separately if it is not already shipped.\n\n")
}

func writeInternalSections(b *strings.Builder, _ releasecontext.Bundle, prs []releasecontext.PullRequest, issues []releasecontext.Issue, slack []releasecontext.SlackSnippet, docs []releasecontext.Document) {
	b.WriteString("## Suggested Framing\n")
	b.WriteString("Use this brief to align support, success, and engineering around rollout wording, publish pack reliability, and any internal cautions that should be resolved before customer-facing send.\n\n")

	b.WriteString("## Deployment Scope\n")
	writePRList(b, prs, "- No merged pull requests were collected for this release window.\n")
	b.WriteString("\n")

	b.WriteString("## Coordination Context\n")
	writeIssueList(b, issues)
	writeSlackList(b, slack)
	if len(issues) == 0 && len(slack) == 0 {
		b.WriteString("- No Linear or Slack coordination context was collected.\n")
	}
	b.WriteString("\n")

	b.WriteString("## Reference Files\n")
	writeDocumentList(b, docs)
	if len(docs) == 0 {
		b.WriteString("- No local release files were attached.\n")
	}
	b.WriteString("\n")

	b.WriteString("## Internal Send Checklist\n")
	b.WriteString("- Confirm rollout, support, and QA notes match the evidence bundle.\n")
	b.WriteString("- Mark customer-facing language that still needs review before reuse.\n\n")
}

func writeInvestorSections(b *strings.Builder, bundle releasecontext.Bundle, prs []releasecontext.PullRequest, issues []releasecontext.Issue, slack []releasecontext.SlackSnippet, docs []releasecontext.Document) {
	b.WriteString("## Release-Derived Stakeholder Summary\n")
	b.WriteString("Use this draft to brief investors or board stakeholders on shipped work. Do not extend beyond verified release evidence.\n\n")

	b.WriteString("## Suggested Framing\n")
	b.WriteString("This release shows execution against safer release communication, tighter review controls, and more dependable publish-pack delivery. Keep the stakeholder narrative anchored to shipped work rather than projected outcomes.\n\n")

	b.WriteString("## Shipped Signals\n")
	writePRList(b, prs, "- No merged pull requests were collected for this release window.\n")
	b.WriteString("\n")

	b.WriteString("## Supporting Internal Context\n")
	writeIssueList(b, issues)
	writeSlackList(b, slack)
	writeDocumentList(b, docs)
	b.WriteString("\n")

	b.WriteString("## Narrative Guardrails\n")
	b.WriteString(fmt.Sprintf("- Anchor the update to %s.\n", formatRelease(bundle.GitHub.Release)))
	b.WriteString("- Avoid revenue, adoption, or roadmap claims unless separate evidence exists.\n")
	b.WriteString("- Position this as shipped execution, not speculative forward guidance.\n\n")
}

func writePRList(b *strings.Builder, prs []releasecontext.PullRequest, empty string) {
	if len(prs) == 0 {
		b.WriteString(empty)
		return
	}

	for _, pr := range prs {
		b.WriteString("- ")
		b.WriteString(formatPR(pr))
		b.WriteString("\n")
	}
}

func writeIssueList(b *strings.Builder, issues []releasecontext.Issue) {
	if len(issues) == 0 {
		return
	}

	for _, issue := range issues {
		b.WriteString("- Linear: ")
		b.WriteString(formatIssue(issue))
		b.WriteString("\n")
	}
}

func writeSlackList(b *strings.Builder, snippets []releasecontext.SlackSnippet) {
	for _, snippet := range snippets {
		b.WriteString(fmt.Sprintf("- Slack (%s): %s\n", snippet.Source, snippet.Text))
	}
}

func writeDocumentList(b *strings.Builder, docs []releasecontext.Document) {
	for _, doc := range docs {
		b.WriteString(fmt.Sprintf("- File `%s`: %s\n", doc.Path, doc.Excerpt))
	}
}

func formatRelease(release releasecontext.Release) string {
	label := strings.TrimSpace(release.Title)
	if label == "" {
		label = strings.TrimSpace(release.Tag)
	}
	if label == "" {
		label = "untitled release"
	}

	tag := strings.TrimSpace(release.Tag)
	if tag != "" && tag != label {
		label = fmt.Sprintf("%s (%s)", label, tag)
	}

	if url := strings.TrimSpace(release.URL); url != "" {
		return fmt.Sprintf("[%s](%s)", label, url)
	}

	return label
}

func formatPR(pr releasecontext.PullRequest) string {
	label := strings.TrimSpace(pr.Title)
	if label == "" {
		label = "Untitled pull request"
	}

	prefix := "PR"
	if pr.Number > 0 {
		prefix = fmt.Sprintf("PR #%d", pr.Number)
	}

	if url := strings.TrimSpace(pr.URL); url != "" {
		return fmt.Sprintf("%s: %s ([source](%s))", prefix, label, url)
	}

	return fmt.Sprintf("%s: %s", prefix, label)
}

func formatIssue(issue releasecontext.Issue) string {
	identifier := strings.TrimSpace(issue.Identifier)
	if identifier == "" {
		identifier = "ISSUE"
	}

	label := strings.TrimSpace(issue.Title)
	if label == "" {
		label = "Untitled issue"
	}

	if url := strings.TrimSpace(issue.URL); url != "" {
		return fmt.Sprintf("%s: %s ([source](%s))", identifier, label, url)
	}

	return fmt.Sprintf("%s: %s", identifier, label)
}
