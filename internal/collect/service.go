package collect

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"pulsenote-cli/internal/releasecontext"
)

const statusOK = "ok"

type Release = releasecontext.Release
type PullRequest = releasecontext.PullRequest
type Issue = releasecontext.Issue

type LinearFetchParams struct {
	SinceDays int
	TeamKey   string
	ProjectID string
	Limit     int
}

type Options struct {
	Repo            string
	UseLatest       bool
	ReleaseTag      string
	LinearTeam      string
	LinearSinceDays int
	SlackNotes      []string
	SlackFiles      []string
	Files           []string
	ContextFiles    []string
	OutDir          string
	Now             func() time.Time
}

type Result struct {
	ContextPath string
	SummaryPath string
	ReceiptPath string
	Bundle      releasecontext.Bundle
	Receipt     Receipt
}

type Receipt struct {
	Status      string                      `json:"status"`
	ContextPath string                      `json:"contextPath"`
	SummaryPath string                      `json:"summaryPath"`
	Counts      releasecontext.SourceCounts `json:"counts"`
	GeneratedAt string                      `json:"generatedAt"`
}

type GitHubFetcher interface {
	FetchRelease(ctx context.Context, repo string, latest bool, tag string) (Release, error)
	FetchMergedPullRequests(ctx context.Context, repo string, limit int) ([]PullRequest, error)
}

type LinearFetcher interface {
	FetchIssuesUpdatedSince(ctx context.Context, params LinearFetchParams) ([]Issue, error)
}

func Collect(ctx context.Context, opts Options, github GitHubFetcher, linear LinearFetcher) (Result, error) {
	if github == nil {
		return Result{}, fmt.Errorf("github fetcher is required")
	}
	if strings.TrimSpace(opts.OutDir) == "" {
		return Result{}, fmt.Errorf("out directory is required")
	}
	if strings.TrimSpace(opts.Repo) == "" {
		return Result{}, fmt.Errorf("repo is required")
	}
	if opts.UseLatest == (strings.TrimSpace(opts.ReleaseTag) != "") {
		return Result{}, fmt.Errorf("exactly one of use latest or release tag must be set")
	}

	now := time.Now().UTC()
	if opts.Now != nil {
		now = opts.Now().UTC()
	}

	if err := os.MkdirAll(opts.OutDir, 0o755); err != nil {
		return Result{}, fmt.Errorf("create output directory: %w", err)
	}

	release, err := github.FetchRelease(ctx, opts.Repo, opts.UseLatest, opts.ReleaseTag)
	if err != nil {
		return Result{}, fmt.Errorf("fetch release: %w", err)
	}

	prs, err := github.FetchMergedPullRequests(ctx, opts.Repo, 100)
	if err != nil {
		return Result{}, fmt.Errorf("fetch pull requests: %w", err)
	}
	sortPullRequests(prs)

	issues, err := collectLinearIssues(ctx, opts, linear)
	if err != nil {
		return Result{}, err
	}

	slackSnippets, err := readSlackSnippets(opts.SlackNotes, opts.SlackFiles)
	if err != nil {
		return Result{}, err
	}

	documents, err := readDocuments(append(append([]string(nil), opts.Files...), opts.ContextFiles...))
	if err != nil {
		return Result{}, err
	}

	bundle := releasecontext.Bundle{
		Version:     releasecontext.CurrentVersion,
		CollectedAt: now.Format(time.RFC3339),
		GitHub: releasecontext.GitHubContext{
			Repo:         strings.TrimSpace(opts.Repo),
			Release:      release,
			PullRequests: append([]releasecontext.PullRequest(nil), prs...),
		},
		Slack: releasecontext.SlackContext{
			Snippets: slackSnippets,
		},
		Files: documents,
		SourceCounts: releasecontext.SourceCounts{
			PullRequests: len(prs),
			Issues:       len(issues),
			SlackNotes:   len(slackSnippets),
			Files:        len(documents),
		},
	}
	if len(issues) > 0 || strings.TrimSpace(opts.LinearTeam) != "" {
		bundle.Linear = releasecontext.LinearContext{
			TeamKey:   strings.TrimSpace(opts.LinearTeam),
			SinceDays: normalizeSinceDays(opts.LinearSinceDays),
			Issues:    issues,
		}
	}

	contextPath := filepath.Join(opts.OutDir, "context.json")
	if err := releasecontext.Save(contextPath, bundle); err != nil {
		return Result{}, fmt.Errorf("save context: %w", err)
	}

	summaryPath := filepath.Join(opts.OutDir, "context.md")
	if err := os.WriteFile(summaryPath, []byte(RenderMarkdown(bundle)), 0o644); err != nil {
		return Result{}, fmt.Errorf("write context summary: %w", err)
	}

	receipt := Receipt{
		Status:      statusOK,
		ContextPath: contextPath,
		SummaryPath: summaryPath,
		Counts:      bundle.SourceCounts,
		GeneratedAt: now.Format(time.RFC3339),
	}
	receiptPath := filepath.Join(opts.OutDir, "collect-receipt.json")
	encodedReceipt, err := json.MarshalIndent(receipt, "", "  ")
	if err != nil {
		return Result{}, fmt.Errorf("encode receipt: %w", err)
	}
	encodedReceipt = append(encodedReceipt, '\n')
	if err := os.WriteFile(receiptPath, encodedReceipt, 0o644); err != nil {
		return Result{}, fmt.Errorf("write receipt: %w", err)
	}

	return Result{
		ContextPath: contextPath,
		SummaryPath: summaryPath,
		ReceiptPath: receiptPath,
		Bundle:      bundle,
		Receipt:     receipt,
	}, nil
}

func collectLinearIssues(ctx context.Context, opts Options, linear LinearFetcher) ([]Issue, error) {
	if linear == nil || strings.TrimSpace(opts.LinearTeam) == "" {
		return nil, nil
	}

	issues, err := linear.FetchIssuesUpdatedSince(ctx, LinearFetchParams{
		SinceDays: normalizeSinceDays(opts.LinearSinceDays),
		TeamKey:   strings.TrimSpace(opts.LinearTeam),
		Limit:     100,
	})
	if err != nil {
		return nil, fmt.Errorf("fetch linear issues: %w", err)
	}

	slices.SortFunc(issues, func(a Issue, b Issue) int {
		if a.Identifier != b.Identifier {
			return strings.Compare(a.Identifier, b.Identifier)
		}
		if a.Title != b.Title {
			return strings.Compare(a.Title, b.Title)
		}
		return strings.Compare(a.URL, b.URL)
	})

	return issues, nil
}

func readSlackSnippets(notes []string, files []string) ([]releasecontext.SlackSnippet, error) {
	snippets := make([]releasecontext.SlackSnippet, 0, len(notes)+len(files))

	for idx, note := range notes {
		trimmed := strings.TrimSpace(note)
		if trimmed == "" {
			continue
		}
		snippets = append(snippets, releasecontext.SlackSnippet{
			Source: fmt.Sprintf("manual-note-%d", idx+1),
			Text:   trimmed,
		})
	}

	for _, sourcePath := range expandPaths(files) {
		body, err := os.ReadFile(sourcePath)
		if err != nil {
			return nil, fmt.Errorf("read slack file %q: %w", sourcePath, err)
		}
		text := buildExcerpt(string(body))
		if text == "" {
			continue
		}
		snippets = append(snippets, releasecontext.SlackSnippet{
			Source: sourcePath,
			Text:   text,
		})
	}

	slices.SortFunc(snippets, func(a releasecontext.SlackSnippet, b releasecontext.SlackSnippet) int {
		if a.Source != b.Source {
			return strings.Compare(a.Source, b.Source)
		}
		return strings.Compare(a.Text, b.Text)
	})

	return snippets, nil
}

func readDocuments(rawPaths []string) ([]releasecontext.Document, error) {
	paths := expandPaths(rawPaths)
	documents := make([]releasecontext.Document, 0, len(paths))

	for _, sourcePath := range paths {
		body, err := os.ReadFile(sourcePath)
		if err != nil {
			return nil, fmt.Errorf("read file %q: %w", sourcePath, err)
		}

		content := string(body)
		documents = append(documents, releasecontext.Document{
			Path:    sourcePath,
			Title:   detectTitle(sourcePath, content),
			Excerpt: buildExcerpt(content),
		})
	}

	return documents, nil
}

func expandPaths(rawPaths []string) []string {
	seen := make(map[string]struct{}, len(rawPaths))
	expanded := make([]string, 0, len(rawPaths))

	for _, rawPath := range rawPaths {
		trimmed := strings.TrimSpace(rawPath)
		if trimmed == "" {
			continue
		}

		info, err := os.Stat(trimmed)
		if err != nil {
			if _, ok := seen[trimmed]; !ok {
				seen[trimmed] = struct{}{}
				expanded = append(expanded, trimmed)
			}
			continue
		}

		if !info.IsDir() {
			if _, ok := seen[trimmed]; !ok {
				seen[trimmed] = struct{}{}
				expanded = append(expanded, trimmed)
			}
			continue
		}

		_ = filepath.WalkDir(trimmed, func(path string, entry fs.DirEntry, walkErr error) error {
			if walkErr != nil || entry == nil || entry.IsDir() {
				return walkErr
			}
			if _, ok := seen[path]; ok {
				return nil
			}
			seen[path] = struct{}{}
			expanded = append(expanded, path)
			return nil
		})
	}

	slices.Sort(expanded)
	return expanded
}

func sortPullRequests(prs []PullRequest) {
	slices.SortFunc(prs, func(a PullRequest, b PullRequest) int {
		if a.Number != b.Number {
			if a.Number < b.Number {
				return -1
			}
			return 1
		}
		if a.Title != b.Title {
			return strings.Compare(a.Title, b.Title)
		}
		return strings.Compare(a.URL, b.URL)
	})
}

func normalizeSinceDays(raw int) int {
	if raw <= 0 {
		return 14
	}
	return raw
}

func detectTitle(path string, content string) string {
	for _, line := range strings.Split(content, "\n") {
		trimmed := normalizeLine(line)
		if trimmed != "" {
			return trimmed
		}
	}

	return filepath.Base(path)
}

func buildExcerpt(content string) string {
	lines := make([]string, 0, 3)
	for _, line := range strings.Split(content, "\n") {
		trimmed := normalizeLine(line)
		if trimmed == "" {
			continue
		}
		lines = append(lines, trimmed)
		if len(lines) == 3 {
			break
		}
	}

	if len(lines) == 0 {
		return ""
	}

	excerpt := strings.Join(lines, " ")
	if len(excerpt) <= 220 {
		return excerpt
	}
	return strings.TrimSpace(excerpt[:217]) + "..."
}

func normalizeLine(line string) string {
	trimmed := strings.TrimSpace(line)
	trimmed = strings.TrimPrefix(trimmed, "#")
	trimmed = strings.TrimPrefix(trimmed, "-")
	trimmed = strings.TrimPrefix(trimmed, "*")
	return strings.TrimSpace(trimmed)
}
