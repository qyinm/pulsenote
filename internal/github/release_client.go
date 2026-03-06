package github

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
)

type Release struct {
	Title string
	Tag   string
	URL   string
}

type PullRequest struct {
	Number int
	Title  string
	URL    string
}

type ReleaseClient struct {
	runner  Runner
	http    HTTPClient
	token   string
	baseURL string
}

func NewReleaseClient(runner Runner, httpClient HTTPClient, token string, baseURL string) *ReleaseClient {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	if strings.TrimSpace(baseURL) == "" {
		baseURL = defaultAPIBaseURL
	}

	return &ReleaseClient{
		runner:  runner,
		http:    httpClient,
		token:   strings.TrimSpace(token),
		baseURL: strings.TrimRight(baseURL, "/"),
	}
}

func NewReleaseClientFromEnv() *ReleaseClient {
	token := strings.TrimSpace(os.Getenv("PULSENOTE_GITHUB_TOKEN"))
	baseURL := strings.TrimSpace(os.Getenv("PULSENOTE_GITHUB_API_URL"))
	return NewReleaseClient(NewExecRunner(), nil, token, baseURL)
}

func (c *ReleaseClient) FetchRelease(ctx context.Context, repo string, latest bool, tag string) (Release, error) {
	endpoint, err := releaseEndpoint(repo, latest, tag)
	if err != nil {
		return Release{}, err
	}

	release, ghErr := c.fetchReleaseViaGH(ctx, endpoint)
	if ghErr == nil {
		return release, nil
	}

	release, patErr := c.fetchReleaseViaPAT(ctx, endpoint)
	if patErr == nil {
		return release, nil
	}

	if ghErr != nil && patErr != nil {
		return Release{}, fmt.Errorf("github release fetch failed via gh (%v) and pat (%v)", ghErr, patErr)
	}

	return Release{}, fmt.Errorf("github release fetch failed")
}

func (c *ReleaseClient) FetchMergedPullRequests(ctx context.Context, repo string, limit int) ([]PullRequest, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	endpoint, err := pullsEndpoint(repo, limit)
	if err != nil {
		return nil, err
	}

	prs, ghErr := c.fetchPullsViaGH(ctx, endpoint)
	if ghErr == nil {
		return prs, nil
	}

	prs, patErr := c.fetchPullsViaPAT(ctx, endpoint)
	if patErr == nil {
		return prs, nil
	}

	if ghErr != nil && patErr != nil {
		return nil, fmt.Errorf("github pull request fetch failed via gh (%v) and pat (%v)", ghErr, patErr)
	}

	return nil, fmt.Errorf("github pull request fetch failed")
}

func (c *ReleaseClient) fetchReleaseViaGH(ctx context.Context, endpoint string) (Release, error) {
	if c.runner == nil {
		return Release{}, fmt.Errorf("gh runner is not configured")
	}

	output, err := c.runner.Run(ctx, "gh", "api", endpoint, "--method", "GET")
	if err != nil {
		return Release{}, err
	}

	var payload struct {
		Name    string `json:"name"`
		TagName string `json:"tag_name"`
		HTMLURL string `json:"html_url"`
	}
	if err := json.Unmarshal(output, &payload); err != nil {
		return Release{}, fmt.Errorf("decode gh release response: %w", err)
	}

	return Release{Title: payload.Name, Tag: payload.TagName, URL: payload.HTMLURL}, nil
}

func (c *ReleaseClient) fetchReleaseViaPAT(ctx context.Context, endpoint string) (Release, error) {
	if strings.TrimSpace(c.token) == "" {
		return Release{}, ErrMissingAuth
	}

	body, err := c.doPATRequest(ctx, endpoint)
	if err != nil {
		return Release{}, err
	}

	var payload struct {
		Name    string `json:"name"`
		TagName string `json:"tag_name"`
		HTMLURL string `json:"html_url"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return Release{}, fmt.Errorf("decode github release response: %w", err)
	}

	return Release{Title: payload.Name, Tag: payload.TagName, URL: payload.HTMLURL}, nil
}

func (c *ReleaseClient) fetchPullsViaGH(ctx context.Context, endpoint string) ([]PullRequest, error) {
	if c.runner == nil {
		return nil, fmt.Errorf("gh runner is not configured")
	}

	output, err := c.runner.Run(ctx, "gh", "api", endpoint, "--method", "GET")
	if err != nil {
		return nil, err
	}

	return decodePulls(output)
}

func (c *ReleaseClient) fetchPullsViaPAT(ctx context.Context, endpoint string) ([]PullRequest, error) {
	if strings.TrimSpace(c.token) == "" {
		return nil, ErrMissingAuth
	}

	body, err := c.doPATRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	return decodePulls(body)
}

func (c *ReleaseClient) doPATRequest(ctx context.Context, endpoint string) ([]byte, error) {
	if c.http == nil {
		return nil, fmt.Errorf("http client is required")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/"+strings.TrimPrefix(endpoint, "/"), nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request github api: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read github response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("github api returned status %d", resp.StatusCode)
	}

	return body, nil
}

func releaseEndpoint(repo string, latest bool, tag string) (string, error) {
	ownerRepo := strings.TrimSpace(repo)
	if ownerRepo == "" || !strings.Contains(ownerRepo, "/") {
		return "", fmt.Errorf("repo must be in owner/name format")
	}

	if latest {
		return "repos/" + ownerRepo + "/releases/latest", nil
	}

	trimmedTag := strings.TrimSpace(tag)
	if trimmedTag == "" {
		return "", fmt.Errorf("release tag is required")
	}

	return "repos/" + ownerRepo + "/releases/tags/" + trimmedTag, nil
}

func pullsEndpoint(repo string, limit int) (string, error) {
	ownerRepo := strings.TrimSpace(repo)
	if ownerRepo == "" || !strings.Contains(ownerRepo, "/") {
		return "", fmt.Errorf("repo must be in owner/name format")
	}

	return "repos/" + ownerRepo + "/pulls?state=closed&sort=updated&direction=desc&per_page=" + strconv.Itoa(limit), nil
}

func decodePulls(payload []byte) ([]PullRequest, error) {
	var nodes []struct {
		Number   int    `json:"number"`
		Title    string `json:"title"`
		HTMLURL  string `json:"html_url"`
		MergedAt string `json:"merged_at"`
	}

	if err := json.Unmarshal(payload, &nodes); err != nil {
		return nil, fmt.Errorf("decode github pull requests response: %w", err)
	}

	prs := make([]PullRequest, 0, len(nodes))
	for _, node := range nodes {
		if strings.TrimSpace(node.MergedAt) == "" {
			continue
		}
		prs = append(prs, PullRequest{Number: node.Number, Title: node.Title, URL: node.HTMLURL})
	}

	return prs, nil
}
