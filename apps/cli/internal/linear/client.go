package linear

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"anchra-cli/internal/envvars"
)

const (
	DefaultGraphQLEndpoint = "https://api.linear.app/graphql"
	StatusOK               = "ok"
	StatusDegraded         = "degraded"
)

var ErrMissingAPIKey = errors.New("missing linear api key")

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

type Result struct {
	Status string
	Code   string
	Error  error
}

type Issue struct {
	Identifier string
	Title      string
	URL        string
}

type FetchIssuesParams struct {
	SinceDays int
	TeamKey   string
	ProjectID string
	Limit     int
}

type Client struct {
	client   HTTPClient
	apiKey   string
	endpoint string
}

func NewClient(client HTTPClient, apiKey string, endpoint string) *Client {
	if client == nil {
		client = http.DefaultClient
	}

	if strings.TrimSpace(endpoint) == "" {
		endpoint = DefaultGraphQLEndpoint
	}

	return &Client{
		client:   client,
		apiKey:   strings.TrimSpace(apiKey),
		endpoint: strings.TrimSpace(endpoint),
	}
}

func NewClientFromEnv() *Client {
	endpoint := envvars.Get("ANCHRA_LINEAR_API_URL", "PULSENOTE_LINEAR_API_URL")
	return NewClient(http.DefaultClient, envvars.Get("ANCHRA_LINEAR_API_KEY", "PULSENOTE_LINEAR_API_KEY"), endpoint)
}

func (c *Client) CheckStatus(ctx context.Context) Result {
	if strings.TrimSpace(c.apiKey) == "" {
		return Result{Status: StatusDegraded, Code: "missing_linear_api_key", Error: ErrMissingAPIKey}
	}

	query := `query Viewer { viewer { id name email } }`

	var response struct {
		Viewer struct {
			ID    string `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"viewer"`
	}

	if err := c.doGraphQL(ctx, query, nil, &response); err != nil {
		return Result{Status: StatusDegraded, Code: "linear_connectivity_failed", Error: err}
	}

	if strings.TrimSpace(response.Viewer.ID) == "" {
		return Result{Status: StatusDegraded, Code: "linear_connectivity_failed", Error: errors.New("empty viewer id")}
	}

	return Result{Status: StatusOK}
}

func (c *Client) FetchIssuesUpdatedSince(ctx context.Context, params FetchIssuesParams) ([]Issue, error) {
	if strings.TrimSpace(c.apiKey) == "" {
		return nil, ErrMissingAPIKey
	}

	sinceDays := params.SinceDays
	if sinceDays <= 0 {
		sinceDays = 14
	}

	limit := params.Limit
	if limit <= 0 {
		limit = 50
	}

	since := time.Now().UTC().AddDate(0, 0, -sinceDays)
	filter := map[string]any{
		"updatedAt": map[string]any{"gte": since.Format(time.RFC3339)},
	}

	if teamKey := strings.TrimSpace(params.TeamKey); teamKey != "" {
		filter["team"] = map[string]any{"key": map[string]any{"eq": teamKey}}
	}

	if projectID := strings.TrimSpace(params.ProjectID); projectID != "" {
		filter["project"] = map[string]any{"id": map[string]any{"eq": projectID}}
	}

	query := `query Issues($filter: IssueFilter, $first: Int!) { issues(filter: $filter, first: $first) { nodes { identifier title url } } }`
	variables := map[string]any{
		"filter": filter,
		"first":  limit,
	}

	var response struct {
		Issues struct {
			Nodes []struct {
				Identifier string `json:"identifier"`
				Title      string `json:"title"`
				URL        string `json:"url"`
			} `json:"nodes"`
		} `json:"issues"`
	}

	if err := c.doGraphQL(ctx, query, variables, &response); err != nil {
		return nil, err
	}

	issues := make([]Issue, 0, len(response.Issues.Nodes))
	for _, node := range response.Issues.Nodes {
		issues = append(issues, Issue{Identifier: node.Identifier, Title: node.Title, URL: node.URL})
	}

	return issues, nil
}

func (c *Client) doGraphQL(ctx context.Context, query string, variables map[string]any, out any) error {
	payload := map[string]any{"query": query}
	if variables != nil {
		payload["variables"] = variables
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("request linear graphql: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("linear graphql returned status %d", resp.StatusCode)
	}

	var envelope struct {
		Data   json.RawMessage `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return fmt.Errorf("decode graphql response: %w", err)
	}

	if len(envelope.Errors) > 0 {
		return fmt.Errorf("linear graphql error: %s", envelope.Errors[0].Message)
	}

	if out == nil {
		return nil
	}

	if err := json.Unmarshal(envelope.Data, out); err != nil {
		return fmt.Errorf("decode graphql data: %w", err)
	}

	return nil
}
