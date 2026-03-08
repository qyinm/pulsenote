package slack

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientTestDryRunWithoutWebhookReturnsOK(t *testing.T) {
	client := NewClient(nil, "")
	result := client.Test(context.Background(), true, false, "hello from anchra")

	if result.Status != StatusOK {
		t.Fatalf("status = %q, want %q", result.Status, StatusOK)
	}

	if result.Code != "" {
		t.Fatalf("code = %q, want empty", result.Code)
	}

	if !result.Plan.DryRun {
		t.Fatal("plan.dryRun = false, want true")
	}

	if result.Plan.WebhookConfigured {
		t.Fatal("plan.webhookConfigured = true, want false")
	}
}

func TestClientTestPostWithoutWebhookReturnsDegraded(t *testing.T) {
	client := NewClient(nil, "")
	result := client.Test(context.Background(), false, true, "hello from anchra")

	if result.Status != StatusDegraded {
		t.Fatalf("status = %q, want %q", result.Status, StatusDegraded)
	}

	if result.Code != CodeMissingSlackWebhook {
		t.Fatalf("code = %q, want %q", result.Code, CodeMissingSlackWebhook)
	}
}

func TestClientTestPostSendsWebhookJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Method; got != http.MethodPost {
			t.Fatalf("method = %q, want POST", got)
		}

		if got := r.Header.Get("Content-Type"); got != "application/json" {
			t.Fatalf("content-type = %q, want application/json", got)
		}

		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode body: %v", err)
		}

		text, _ := payload["text"].(string)
		if text != "hello from anchra" {
			t.Fatalf("payload text = %q, want hello from anchra", text)
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL)
	result := client.Test(context.Background(), false, true, "hello from anchra")

	if result.Status != StatusOK {
		t.Fatalf("status = %q, want %q", result.Status, StatusOK)
	}
}
