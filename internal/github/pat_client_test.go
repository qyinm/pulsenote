package github

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPATClientCheckUserSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/user" {
			t.Fatalf("path = %q, want /user", r.URL.Path)
		}

		if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
			t.Fatalf("authorization header = %q", got)
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewPATClient(server.Client(), "test-token", server.URL)
	if err := client.CheckUser(context.Background()); err != nil {
		t.Fatalf("CheckUser() error = %v", err)
	}
}

func TestPATClientCheckUserUnauthorized(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	client := NewPATClient(server.Client(), "bad-token", server.URL)
	if err := client.CheckUser(context.Background()); err == nil {
		t.Fatal("expected error, got nil")
	}
}
