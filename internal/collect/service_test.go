package collect

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"anchra-cli/internal/releasecontext"
)

type githubFetcherStub struct {
	release releasecontext.Release
	prs     []releasecontext.PullRequest
}

func (s githubFetcherStub) FetchRelease(context.Context, string, bool, string) (releasecontext.Release, error) {
	return s.release, nil
}

func (s githubFetcherStub) FetchMergedPullRequests(context.Context, string, int) ([]releasecontext.PullRequest, error) {
	return s.prs, nil
}

type linearFetcherStub struct {
	issues []releasecontext.Issue
}

func (s linearFetcherStub) FetchIssuesUpdatedSince(context.Context, LinearFetchParams) ([]releasecontext.Issue, error) {
	return s.issues, nil
}

func TestCollectWritesContextAndReceipt(t *testing.T) {
	t.Parallel()

	outDir := t.TempDir()
	filesDir := filepath.Join(outDir, "sources")
	if err := os.MkdirAll(filesDir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	docPath := filepath.Join(filesDir, "release-plan.md")
	if err := os.WriteFile(docPath, []byte("# Release plan\n\nCoordinate rollout with support.\nShare final notes with CS.\n"), 0o644); err != nil {
		t.Fatalf("write doc: %v", err)
	}

	slackPath := filepath.Join(filesDir, "slack.txt")
	if err := os.WriteFile(slackPath, []byte("Support asked for billing migration wording.\nUse customer-safe phrasing.\n"), 0o644); err != nil {
		t.Fatalf("write slack: %v", err)
	}

	now := time.Date(2026, 3, 7, 9, 0, 0, 0, time.UTC)
	result, err := Collect(
		context.Background(),
		Options{
			Repo:            "acme/anchra",
			UseLatest:       true,
			LinearTeam:      "ENG",
			LinearSinceDays: 7,
			SlackNotes:      []string{"Do not mention roadmap timing in public notes."},
			SlackFiles:      []string{slackPath},
			Files:           []string{filesDir},
			OutDir:          outDir,
			Now:             func() time.Time { return now },
		},
		githubFetcherStub{
			release: releasecontext.Release{Title: "March Release", Tag: "v1.2.0", URL: "https://example.com/releases/v1.2.0"},
			prs: []releasecontext.PullRequest{
				{Number: 12, Title: "Add publish pack receipts", URL: "https://example.com/pulls/12"},
			},
		},
		linearFetcherStub{
			issues: []releasecontext.Issue{
				{Identifier: "ENG-20", Title: "Capture approval audit trail", URL: "https://example.com/issues/ENG-20"},
			},
		},
	)
	if err != nil {
		t.Fatalf("Collect() error = %v", err)
	}

	if result.ContextPath != filepath.Join(outDir, "context.json") {
		t.Fatalf("context path = %q", result.ContextPath)
	}
	if result.ReceiptPath != filepath.Join(outDir, "collect-receipt.json") {
		t.Fatalf("receipt path = %q", result.ReceiptPath)
	}

	contextBytes, err := os.ReadFile(result.ContextPath)
	if err != nil {
		t.Fatalf("read context: %v", err)
	}

	var bundle releasecontext.Bundle
	if err := json.Unmarshal(contextBytes, &bundle); err != nil {
		t.Fatalf("unmarshal bundle: %v", err)
	}

	if bundle.GitHub.Repo != "acme/anchra" {
		t.Fatalf("repo = %q", bundle.GitHub.Repo)
	}
	if bundle.SourceCounts.SlackNotes != 2 {
		t.Fatalf("slack note count = %d", bundle.SourceCounts.SlackNotes)
	}
	if bundle.SourceCounts.Files != 2 {
		t.Fatalf("file count = %d", bundle.SourceCounts.Files)
	}
	if bundle.CollectedAt != now.Format(time.RFC3339) {
		t.Fatalf("collectedAt = %q", bundle.CollectedAt)
	}

	receiptBytes, err := os.ReadFile(result.ReceiptPath)
	if err != nil {
		t.Fatalf("read receipt: %v", err)
	}

	var receipt Receipt
	if err := json.Unmarshal(receiptBytes, &receipt); err != nil {
		t.Fatalf("unmarshal receipt: %v", err)
	}

	if receipt.Status != statusOK {
		t.Fatalf("status = %q", receipt.Status)
	}
	if receipt.Counts.PullRequests != 1 || receipt.Counts.Issues != 1 {
		t.Fatalf("unexpected receipt counts: %+v", receipt.Counts)
	}
}
