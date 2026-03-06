package github

import (
	"context"
	"errors"
	"os"
	"strings"
)

const (
	StatusOK       = "ok"
	StatusDegraded = "degraded"
)

var (
	ErrMissingAuth = errors.New("missing github authentication")
)

type Result struct {
	Status string
	Mode   string
	Code   string
	Error  error
}

type UserChecker interface {
	CheckUser(context.Context) error
}

type Adapter struct {
	gh    UserChecker
	pat   UserChecker
	token string
}

func NewAdapter(gh UserChecker, pat UserChecker, token string) *Adapter {
	return &Adapter{gh: gh, pat: pat, token: token}
}

func NewAdapterFromEnv() *Adapter {
	token := strings.TrimSpace(os.Getenv("PULSENOTE_GITHUB_TOKEN"))
	return NewAdapter(NewCLIClient(NewExecRunner()), NewPATClient(nil, token, ""), token)
}

func (a *Adapter) CheckStatus(ctx context.Context) Result {
	if a.gh != nil {
		if err := a.gh.CheckUser(ctx); err == nil {
			return Result{Status: StatusOK, Mode: "gh"}
		}
	}

	if strings.TrimSpace(a.token) == "" {
		return Result{Status: StatusDegraded, Code: "missing_github_auth", Error: ErrMissingAuth}
	}

	if a.pat == nil {
		return Result{Status: StatusDegraded, Code: "github_connectivity_failed", Error: ErrMissingAuth}
	}

	if err := a.pat.CheckUser(ctx); err != nil {
		return Result{Status: StatusDegraded, Code: "github_connectivity_failed", Error: err}
	}

	return Result{Status: StatusOK, Mode: "pat"}
}
