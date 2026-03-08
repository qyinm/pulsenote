package github

import (
	"context"
	"errors"
	"reflect"
	"testing"
)

type runnerStub struct {
	name string
	args []string
	err  error
}

func (r *runnerStub) Run(_ context.Context, name string, args ...string) ([]byte, error) {
	r.name = name
	r.args = append([]string{}, args...)
	if r.err != nil {
		return nil, r.err
	}

	return []byte("{}"), nil
}

func TestCLIClientCheckUserRunsExpectedCommand(t *testing.T) {
	runner := &runnerStub{}
	client := NewCLIClient(runner)

	if err := client.CheckUser(context.Background()); err != nil {
		t.Fatalf("CheckUser() error = %v", err)
	}

	if runner.name != "gh" {
		t.Fatalf("command name = %q, want gh", runner.name)
	}

	wantArgs := []string{"api", "user", "--method", "GET"}
	if !reflect.DeepEqual(runner.args, wantArgs) {
		t.Fatalf("command args = %#v, want %#v", runner.args, wantArgs)
	}
}

func TestCLIClientCheckUserPropagatesRunnerError(t *testing.T) {
	runner := &runnerStub{err: errors.New("not authenticated")}
	client := NewCLIClient(runner)

	if err := client.CheckUser(context.Background()); err == nil {
		t.Fatal("expected error, got nil")
	}
}
