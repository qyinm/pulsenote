package github

import (
	"context"
	"fmt"
	"os/exec"
)

type Runner interface {
	Run(ctx context.Context, name string, args ...string) ([]byte, error)
}

type ExecRunner struct{}

func NewExecRunner() ExecRunner {
	return ExecRunner{}
}

func (ExecRunner) Run(ctx context.Context, name string, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("exec %s: %w", name, err)
	}

	return out, nil
}

type CLIClient struct {
	runner Runner
}

func NewCLIClient(runner Runner) *CLIClient {
	return &CLIClient{runner: runner}
}

func (c *CLIClient) CheckUser(ctx context.Context) error {
	if c.runner == nil {
		return fmt.Errorf("runner is required")
	}

	if _, err := c.runner.Run(ctx, "gh", "api", "user", "--method", "GET"); err != nil {
		return fmt.Errorf("gh user probe failed: %w", err)
	}

	return nil
}
