package releasecontext

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const CurrentVersion = "v1"

type Bundle struct {
	Version      string        `json:"version"`
	CollectedAt  string        `json:"collectedAt"`
	GitHub       GitHubContext `json:"github"`
	Linear       LinearContext `json:"linear,omitempty"`
	Slack        SlackContext  `json:"slack,omitempty"`
	Files        []Document    `json:"files,omitempty"`
	SourceCounts SourceCounts  `json:"sourceCounts"`
}

type GitHubContext struct {
	Repo         string        `json:"repo"`
	Release      Release       `json:"release"`
	PullRequests []PullRequest `json:"pullRequests,omitempty"`
}

type Release struct {
	Title string `json:"title"`
	Tag   string `json:"tag"`
	URL   string `json:"url"`
}

type PullRequest struct {
	Number int    `json:"number"`
	Title  string `json:"title"`
	URL    string `json:"url"`
}

type LinearContext struct {
	TeamKey   string  `json:"teamKey"`
	SinceDays int     `json:"sinceDays"`
	Issues    []Issue `json:"issues,omitempty"`
}

type Issue struct {
	Identifier string `json:"identifier"`
	Title      string `json:"title"`
	URL        string `json:"url"`
}

type SlackContext struct {
	Snippets []SlackSnippet `json:"snippets,omitempty"`
}

type SlackSnippet struct {
	Source string `json:"source"`
	Text   string `json:"text"`
}

type Document struct {
	Path    string `json:"path"`
	Title   string `json:"title"`
	Excerpt string `json:"excerpt"`
}

type SourceCounts struct {
	PullRequests int `json:"pullRequests"`
	Issues       int `json:"issues"`
	SlackNotes   int `json:"slackNotes"`
	Files        int `json:"files"`
}

func Save(path string, bundle Bundle) error {
	if strings.TrimSpace(path) == "" {
		return fmt.Errorf("path is required")
	}

	if bundle.Version == "" {
		bundle.Version = CurrentVersion
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create bundle directory: %w", err)
	}

	body, err := json.MarshalIndent(bundle, "", "  ")
	if err != nil {
		return fmt.Errorf("encode bundle: %w", err)
	}

	body = append(body, '\n')
	if err := os.WriteFile(path, body, 0o644); err != nil {
		return fmt.Errorf("write bundle: %w", err)
	}

	return nil
}

func Load(path string) (Bundle, error) {
	if strings.TrimSpace(path) == "" {
		return Bundle{}, fmt.Errorf("path is required")
	}

	body, err := os.ReadFile(path)
	if err != nil {
		return Bundle{}, fmt.Errorf("read bundle: %w", err)
	}

	var bundle Bundle
	if err := json.Unmarshal(body, &bundle); err != nil {
		return Bundle{}, fmt.Errorf("decode bundle: %w", err)
	}

	return bundle, nil
}
