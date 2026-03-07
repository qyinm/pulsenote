package draft

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"anchra-cli/internal/releasecontext"
)

func TestRenderMarkdownGolden(t *testing.T) {
	t.Parallel()

	input := RenderInput{
		Audience:    AudienceExternal,
		Format:      "release-note",
		GeneratedAt: time.Date(2026, 3, 7, 10, 30, 0, 0, time.UTC),
		Bundle: releasecontext.Bundle{
			Version:     releasecontext.CurrentVersion,
			CollectedAt: "2026-03-07T09:00:00Z",
			GitHub: releasecontext.GitHubContext{
				Repo: "acme/anchra",
				Release: releasecontext.Release{
					Title: "March Release",
					Tag:   "v1.2.0",
					URL:   "https://github.com/acme/anchra/releases/tag/v1.2.0",
				},
				PullRequests: []releasecontext.PullRequest{
					{Number: 22, Title: "Fix race in exporter", URL: "https://github.com/acme/anchra/pull/22"},
					{Number: 7, Title: "Add deterministic draft renderer", URL: "https://github.com/acme/anchra/pull/7"},
				},
			},
			Linear: releasecontext.LinearContext{
				TeamKey:   "ENG",
				SinceDays: 14,
				Issues: []releasecontext.Issue{
					{Identifier: "ENG-20", Title: "Track release receipts", URL: "https://linear.app/acme/issue/ENG-20"},
					{Identifier: "ENG-4", Title: "Draft evidence links", URL: "https://linear.app/acme/issue/ENG-4"},
				},
			},
			Slack: releasecontext.SlackContext{
				Snippets: []releasecontext.SlackSnippet{
					{Source: "manual-note-1", Text: "Do not mention roadmap timing in public notes."},
				},
			},
			Files: []releasecontext.Document{
				{Path: "/tmp/release-plan.md", Title: "release-plan.md", Excerpt: "Coordinate rollout with support and attach publish pack evidence."},
			},
		},
	}

	got := RenderMarkdown(input)
	goldenPath := filepath.Join("testdata", "draft.golden.md")
	want, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read golden file: %v", err)
	}

	if got != string(want) {
		t.Fatalf("render output mismatch\n--- got ---\n%s\n--- want ---\n%s", got, string(want))
	}
}
