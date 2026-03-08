package collect

import (
	"fmt"
	"strings"

	"anchra-cli/internal/releasecontext"
)

func RenderMarkdown(bundle releasecontext.Bundle) string {
	var b strings.Builder

	b.WriteString("# Anchra Context Summary\n\n")
	b.WriteString("## Release Anchor\n")
	b.WriteString(fmt.Sprintf("- Repository: `%s`\n", bundle.GitHub.Repo))
	b.WriteString("- Release: ")
	b.WriteString(formatRelease(bundle.GitHub.Release))
	b.WriteString("\n\n")

	b.WriteString("## Source Counts\n")
	b.WriteString(fmt.Sprintf("- Pull requests: %d\n", bundle.SourceCounts.PullRequests))
	b.WriteString(fmt.Sprintf("- Linear issues: %d\n", bundle.SourceCounts.Issues))
	b.WriteString(fmt.Sprintf("- Slack notes: %d\n", bundle.SourceCounts.SlackNotes))
	b.WriteString(fmt.Sprintf("- Files: %d\n\n", bundle.SourceCounts.Files))

	if len(bundle.Slack.Snippets) > 0 {
		b.WriteString("## Slack Notes\n")
		for _, snippet := range bundle.Slack.Snippets {
			b.WriteString(fmt.Sprintf("- %s: %s\n", snippet.Source, snippet.Text))
		}
		b.WriteString("\n")
	}

	if len(bundle.Files) > 0 {
		b.WriteString("## File Notes\n")
		for _, doc := range bundle.Files {
			b.WriteString(fmt.Sprintf("- `%s`: %s\n", doc.Path, doc.Excerpt))
		}
		b.WriteString("\n")
	}

	return b.String()
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
