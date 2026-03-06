package linear

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientCheckStatusMissingAPIKey(t *testing.T) {
	client := NewClient(nil, "", "")
	result := client.CheckStatus(context.Background())

	if result.Status != StatusDegraded {
		t.Fatalf("status = %q, want %q", result.Status, StatusDegraded)
	}

	if result.Code != "missing_linear_api_key" {
		t.Fatalf("code = %q, want missing_linear_api_key", result.Code)
	}
}

func TestClientCheckStatusSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "test-api-key" {
			t.Fatalf("authorization header = %q, want test-api-key", got)
		}

		if got := r.Method; got != http.MethodPost {
			t.Fatalf("method = %q, want POST", got)
		}

		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request body: %v", err)
		}

		query, _ := payload["query"].(string)
		if query == "" {
			t.Fatal("query is empty")
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"viewer":{"id":"user-1","name":"Ada","email":"ada@example.com"}}}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), "test-api-key", server.URL)
	result := client.CheckStatus(context.Background())

	if result.Status != StatusOK {
		t.Fatalf("status = %q, want %q", result.Status, StatusOK)
	}
}

func TestClientFetchIssuesUpdatedSince(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "test-api-key" {
			t.Fatalf("authorization header = %q, want test-api-key", got)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"issues":{"nodes":[{"identifier":"ENG-1","title":"Fix release note typo","url":"https://linear.app/example/issue/ENG-1"}]}}}`))
	}))
	defer server.Close()

	client := NewClient(server.Client(), "test-api-key", server.URL)
	issues, err := client.FetchIssuesUpdatedSince(context.Background(), FetchIssuesParams{SinceDays: 14, TeamKey: "ENG"})
	if err != nil {
		t.Fatalf("FetchIssuesUpdatedSince() error = %v", err)
	}

	if len(issues) != 1 {
		t.Fatalf("len(issues) = %d, want 1", len(issues))
	}

	if issues[0].Identifier != "ENG-1" {
		t.Fatalf("identifier = %q, want ENG-1", issues[0].Identifier)
	}
}

func TestNewClientDefaultsEndpoint(t *testing.T) {
	client := NewClient(nil, "token", "")
	if client.endpoint != DefaultGraphQLEndpoint {
		t.Fatalf("endpoint = %q, want %q", client.endpoint, DefaultGraphQLEndpoint)
	}
}

func TestNewClientFromEnvUsesOverrideEndpoint(t *testing.T) {
	t.Setenv("PULSENOTE_LINEAR_API_KEY", "test-key")
	t.Setenv("PULSENOTE_LINEAR_API_URL", "https://example.com/graphql")

	client := NewClientFromEnv()

	if client.apiKey != "test-key" {
		t.Fatalf("apiKey = %q, want test-key", client.apiKey)
	}

	if client.endpoint != "https://example.com/graphql" {
		t.Fatalf("endpoint = %q, want https://example.com/graphql", client.endpoint)
	}
}

func TestNewClientFromEnvDefaultEndpoint(t *testing.T) {
	t.Setenv("PULSENOTE_LINEAR_API_KEY", "test-key")
	t.Setenv("PULSENOTE_LINEAR_API_URL", "")

	client := NewClientFromEnv()
	if client.endpoint != DefaultGraphQLEndpoint {
		t.Fatalf("endpoint = %q, want %q", client.endpoint, DefaultGraphQLEndpoint)
	}
}
