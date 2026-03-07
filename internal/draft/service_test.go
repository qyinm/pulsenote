package draft

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"anchra-cli/internal/releasecontext"
)

func TestGenerateWritesAudienceDraftAndReceipt(t *testing.T) {
	t.Parallel()

	outDir := t.TempDir()
	contextPath := filepath.Join(outDir, "context.json")
	bundle := releasecontext.Bundle{
		Version:     releasecontext.CurrentVersion,
		CollectedAt: "2026-03-07T09:00:00Z",
		GitHub: releasecontext.GitHubContext{
			Repo: "acme/anchra",
			Release: releasecontext.Release{
				Title: "March Release",
				Tag:   "v1.2.0",
				URL:   "https://example.com/releases/v1.2.0",
			},
			PullRequests: []releasecontext.PullRequest{
				{Number: 18, Title: "Tighten publish pack receipts", URL: "https://example.com/pulls/18"},
			},
		},
		Slack: releasecontext.SlackContext{
			Snippets: []releasecontext.SlackSnippet{
				{Source: "manual-note-1", Text: "Do not promise rollout timing publicly."},
			},
		},
		SourceCounts: releasecontext.SourceCounts{
			PullRequests: 1,
			SlackNotes:   1,
		},
	}

	if err := releasecontext.Save(contextPath, bundle); err != nil {
		t.Fatalf("save context: %v", err)
	}

	now := time.Date(2026, 3, 7, 10, 0, 0, 0, time.UTC)
	result, err := Generate(Options{
		ContextPath: contextPath,
		Audience:    AudienceInvestor,
		OutDir:      outDir,
		Now:         func() time.Time { return now },
	})
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	if result.DraftPath != filepath.Join(outDir, "investor-stakeholder-update.md") {
		t.Fatalf("draft path = %q", result.DraftPath)
	}
	if result.ReceiptPath != filepath.Join(outDir, "investor-stakeholder-update-receipt.json") {
		t.Fatalf("receipt path = %q", result.ReceiptPath)
	}

	draftBytes, err := os.ReadFile(result.DraftPath)
	if err != nil {
		t.Fatalf("read draft: %v", err)
	}
	draftText := string(draftBytes)
	if !strings.Contains(draftText, "Release-Derived Stakeholder Summary") {
		t.Fatalf("draft missing investor section:\n%s", draftText)
	}
	if !strings.Contains(draftText, "Do not promise rollout timing publicly.") {
		t.Fatalf("draft missing slack note:\n%s", draftText)
	}

	receiptBytes, err := os.ReadFile(result.ReceiptPath)
	if err != nil {
		t.Fatalf("read receipt: %v", err)
	}

	var receipt Receipt
	if err := json.Unmarshal(receiptBytes, &receipt); err != nil {
		t.Fatalf("unmarshal receipt: %v", err)
	}
	if receipt.Format != "stakeholder-update" {
		t.Fatalf("format = %q", receipt.Format)
	}
	if receipt.GeneratedAt != now.Format(time.RFC3339) {
		t.Fatalf("generatedAt = %q", receipt.GeneratedAt)
	}
}
