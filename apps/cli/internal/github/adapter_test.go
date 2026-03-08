package github

import (
	"context"
	"errors"
	"testing"
)

type checkerStub struct {
	err error
}

func (s checkerStub) CheckUser(context.Context) error {
	return s.err
}

func TestAdapterCheckStatusMissingAuth(t *testing.T) {
	adapter := NewAdapter(checkerStub{err: errors.New("gh unavailable")}, nil, "")
	result := adapter.CheckStatus(context.Background())

	if result.Status != StatusDegraded {
		t.Fatalf("status = %q, want %q", result.Status, StatusDegraded)
	}

	if result.Code != "missing_github_auth" {
		t.Fatalf("code = %q, want missing_github_auth", result.Code)
	}
}

func TestAdapterCheckStatusFallsBackToPAT(t *testing.T) {
	adapter := NewAdapter(checkerStub{err: errors.New("gh unauthenticated")}, checkerStub{}, "test-token")
	result := adapter.CheckStatus(context.Background())

	if result.Status != StatusOK {
		t.Fatalf("status = %q, want %q", result.Status, StatusOK)
	}

	if result.Mode != "pat" {
		t.Fatalf("mode = %q, want pat", result.Mode)
	}
}
