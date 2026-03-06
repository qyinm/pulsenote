package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
)

const (
	StatusOK       = "ok"
	StatusDegraded = "degraded"
)

const (
	CodeMissingSlackWebhook    = "missing_slack_webhook"
	CodeSlackConnectivityError = "slack_connectivity_failed"
)

const DefaultTestMessage = "Pulsenote Slack test message"

var ErrMissingWebhook = errors.New("missing slack webhook")

type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

type Plan struct {
	DryRun            bool   `json:"dryRun"`
	WillPost          bool   `json:"willPost"`
	Method            string `json:"method"`
	ContentType       string `json:"contentType"`
	WebhookConfigured bool   `json:"webhookConfigured"`
	WebhookMasked     string `json:"webhookMasked,omitempty"`
	Text              string `json:"text"`
}

type Result struct {
	Status string
	Code   string
	Error  error
	Plan   Plan
}

type Client struct {
	client     HTTPClient
	webhookURL string
}

func NewClient(client HTTPClient, webhookURL string) *Client {
	if client == nil {
		client = http.DefaultClient
	}

	return &Client{client: client, webhookURL: strings.TrimSpace(webhookURL)}
}

func NewClientFromEnv() *Client {
	return NewClient(http.DefaultClient, os.Getenv("PULSENOTE_SLACK_WEBHOOK_URL"))
}

func (c *Client) Test(ctx context.Context, dryRun bool, post bool, text string) Result {
	trimmedText := strings.TrimSpace(text)
	if trimmedText == "" {
		trimmedText = DefaultTestMessage
	}

	plan := Plan{
		DryRun:            dryRun,
		WillPost:          post,
		Method:            http.MethodPost,
		ContentType:       "application/json",
		WebhookConfigured: strings.TrimSpace(c.webhookURL) != "",
		WebhookMasked:     maskWebhook(c.webhookURL),
		Text:              trimmedText,
	}

	if dryRun || !post {
		return Result{Status: StatusOK, Plan: plan}
	}

	if !plan.WebhookConfigured {
		return Result{Status: StatusDegraded, Code: CodeMissingSlackWebhook, Error: ErrMissingWebhook, Plan: plan}
	}

	payload, err := json.Marshal(map[string]string{"text": trimmedText})
	if err != nil {
		return Result{Status: StatusDegraded, Code: CodeSlackConnectivityError, Error: fmt.Errorf("marshal slack payload: %w", err), Plan: plan}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.webhookURL, bytes.NewReader(payload))
	if err != nil {
		return Result{Status: StatusDegraded, Code: CodeSlackConnectivityError, Error: fmt.Errorf("create slack request: %w", err), Plan: plan}
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return Result{Status: StatusDegraded, Code: CodeSlackConnectivityError, Error: fmt.Errorf("send slack webhook request: %w", err), Plan: plan}
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return Result{Status: StatusDegraded, Code: CodeSlackConnectivityError, Error: fmt.Errorf("slack webhook returned status %d", resp.StatusCode), Plan: plan}
	}

	return Result{Status: StatusOK, Plan: plan}
}

func maskWebhook(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}

	if len(trimmed) <= 8 {
		return "****"
	}

	return trimmed[:4] + "..." + trimmed[len(trimmed)-4:]
}
