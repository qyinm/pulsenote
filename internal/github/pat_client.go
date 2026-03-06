package github

import (
	"context"
	"fmt"
	"net/http"
	"strings"
)

const defaultAPIBaseURL = "https://api.github.com"

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

type PATClient struct {
	client  HTTPClient
	token   string
	baseURL string
}

func NewPATClient(client HTTPClient, token string, baseURL string) *PATClient {
	if client == nil {
		client = http.DefaultClient
	}

	if strings.TrimSpace(baseURL) == "" {
		baseURL = defaultAPIBaseURL
	}

	return &PATClient{client: client, token: strings.TrimSpace(token), baseURL: strings.TrimRight(baseURL, "/")}
}

func (c *PATClient) CheckUser(ctx context.Context) error {
	if strings.TrimSpace(c.token) == "" {
		return ErrMissingAuth
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/user", nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("request github user: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("github user probe returned status %d", resp.StatusCode)
	}

	return nil
}
