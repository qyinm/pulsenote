package cli

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"anchra-cli/internal/collect"
	"anchra-cli/internal/draft"
	"anchra-cli/internal/envvars"
	githubadapter "anchra-cli/internal/github"
	linearadapter "anchra-cli/internal/linear"
	"anchra-cli/internal/output"
	"anchra-cli/internal/releasecontext"
	slackadapter "anchra-cli/internal/slack"
)

const (
	statusOK       = "ok"
	statusDegraded = "degraded"
	statusError    = "error"
)

type options struct {
	jsonOut bool
	outDir  string
	verbose bool
}

func NewRootCmd() *cobra.Command {
	opts := &options{}

	rootCmd := &cobra.Command{
		Use:           "anchra",
		Short:         "Anchra release communication CLI",
		SilenceErrors: true,
		SilenceUsage:  true,
	}
	rootCmd.CompletionOptions.DisableDefaultCmd = true

	rootCmd.PersistentFlags().BoolVar(&opts.jsonOut, "json", false, "Emit machine-readable JSON only")
	rootCmd.PersistentFlags().StringVar(&opts.outDir, "out", defaultOutDir(), "Output directory root")
	rootCmd.PersistentFlags().BoolVar(&opts.verbose, "verbose", false, "Include debug details (secrets always redacted)")

	rootCmd.AddCommand(newDoctorCmd(opts))
	rootCmd.AddCommand(newGitHubCmd(opts))
	rootCmd.AddCommand(newLinearCmd(opts))
	rootCmd.AddCommand(newSlackCmd(opts))
	rootCmd.AddCommand(newCollectCmd(opts))
	rootCmd.AddCommand(newDraftCmd(opts))
	rootCmd.AddCommand(newTUICmd(opts))

	return rootCmd
}

func newDoctorCmd(opts *options) *cobra.Command {
	return &cobra.Command{
		Use:   "doctor",
		Short: "Run integration readiness checks",
		RunE: func(_ *cobra.Command, _ []string) error {
			checks := []output.Check{
				githubCheck(),
				linearCheck(),
				slackCredCheck(),
			}

			resp := output.StatusResponse{Status: aggregateStatus(checks), Checks: checks}
			return printStatus(opts, resp)
		},
	}
}

func newGitHubCmd(opts *options) *cobra.Command {
	githubCmd := &cobra.Command{Use: "github", Short: "GitHub integration commands"}

	statusCmd := &cobra.Command{
		Use:   "status",
		Short: "Check GitHub integration readiness",
		RunE: func(_ *cobra.Command, _ []string) error {
			check := githubCheck()
			resp := output.StatusResponse{Status: check.Status, Checks: []output.Check{check}}
			if check.Error != nil {
				resp.Error = check.Error
			}
			return printStatus(opts, resp)
		},
	}

	githubCmd.AddCommand(statusCmd)
	return githubCmd
}

func newLinearCmd(opts *options) *cobra.Command {
	linearCmd := &cobra.Command{Use: "linear", Short: "Linear integration commands"}

	statusCmd := &cobra.Command{
		Use:   "status",
		Short: "Check Linear integration readiness",
		RunE: func(_ *cobra.Command, _ []string) error {
			check := linearCheck()
			resp := output.StatusResponse{Status: check.Status, Checks: []output.Check{check}}
			if check.Error != nil {
				resp.Error = check.Error
			}
			return printStatus(opts, resp)
		},
	}

	linearCmd.AddCommand(statusCmd)
	return linearCmd
}

func newSlackCmd(opts *options) *cobra.Command {
	slackCmd := &cobra.Command{Use: "slack", Short: "Slack integration commands"}

	var dryRun bool
	var post bool
	var text string
	testCmd := &cobra.Command{
		Use:   "test",
		Short: "Check Slack integration readiness",
		RunE: func(_ *cobra.Command, _ []string) error {
			check := slackCheck(dryRun, post, text)
			resp := output.StatusResponse{Status: check.Status, Checks: []output.Check{check}}
			if check.Error != nil {
				resp.Error = check.Error
			}
			return printStatus(opts, resp)
		},
	}
	testCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Validate without posting")
	testCmd.Flags().BoolVar(&post, "post", false, "Post test message to configured incoming webhook")
	testCmd.Flags().StringVar(&text, "text", slackadapter.DefaultTestMessage, "Message text used for test post")

	slackCmd.AddCommand(testCmd)
	return slackCmd
}

func newCollectCmd(opts *options) *cobra.Command {
	var repo string
	var latest bool
	var releaseTag string
	var linearTeam string
	var linearSinceDays int
	var slackNotes []string
	var slackFiles []string
	var filePaths []string

	cmd := &cobra.Command{
		Use:   "collect",
		Short: "Build a release context bundle from GitHub, Slack notes, and local files",
		RunE: func(_ *cobra.Command, _ []string) error {
			if strings.TrimSpace(repo) == "" {
				return fmt.Errorf("--repo is required")
			}
			if latest == (strings.TrimSpace(releaseTag) != "") {
				return fmt.Errorf("exactly one of --latest or --release-tag must be set")
			}

			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			result, err := collect.Collect(
				ctx,
				collect.Options{
					Repo:            repo,
					UseLatest:       latest,
					ReleaseTag:      releaseTag,
					LinearTeam:      linearTeam,
					LinearSinceDays: linearSinceDays,
					SlackNotes:      slackNotes,
					SlackFiles:      slackFiles,
					Files:           filePaths,
					OutDir:          opts.outDir,
				},
				githubCollectFetcher{client: githubadapter.NewReleaseClientFromEnv()},
				linearCollectFetcher{client: linearadapter.NewClientFromEnv()},
			)
			if err != nil {
				resp := output.CollectResponse{
					Status:      statusError,
					ContextPath: "",
					ReceiptPath: "",
					Error: &output.ErrorDetail{
						Code:    "collect_failed",
						Message: err.Error(),
					},
				}

				if opts.jsonOut {
					return output.PrintJSON(resp)
				}

				_, writeErr := fmt.Fprintf(os.Stdout, "collect command failed (code=%s): %s\n", resp.Error.Code, resp.Error.Message)
				if writeErr != nil {
					return writeErr
				}
				return err
			}

			resp := output.CollectResponse{
				Status:      statusOK,
				ContextPath: result.ContextPath,
				ReceiptPath: result.ReceiptPath,
			}
			if opts.jsonOut {
				return output.PrintJSON(resp)
			}

			_, err = fmt.Fprintf(os.Stdout, "context collected\n- context: %s\n- receipt: %s\n", result.ContextPath, result.ReceiptPath)
			return err
		},
	}

	cmd.Flags().StringVar(&repo, "repo", "", "Repository in owner/name format")
	cmd.Flags().BoolVar(&latest, "latest", false, "Use latest GitHub release")
	cmd.Flags().StringVar(&releaseTag, "release-tag", "", "Use a specific GitHub release tag")
	cmd.Flags().StringVar(&linearTeam, "linear-team", "", "Optional Linear team key")
	cmd.Flags().IntVar(&linearSinceDays, "linear-since-days", 14, "Lookback window for Linear issues")
	cmd.Flags().StringArrayVar(&slackNotes, "slack-note", nil, "Slack text snippet copied into the evidence bundle")
	cmd.Flags().StringArrayVar(&slackFiles, "slack-file", nil, "Path to a Slack transcript or note file")
	cmd.Flags().StringArrayVar(&filePaths, "file", nil, "Path to a local file or directory with release context")
	_ = cmd.MarkFlagRequired("repo")

	return cmd
}

func newDraftCmd(opts *options) *cobra.Command {
	var contextPath string
	var audience string
	var format string

	cmd := &cobra.Command{
		Use:   "draft",
		Short: "Generate an audience-specific draft from a collected release context",
		RunE: func(cmd *cobra.Command, _ []string) error {
			outDir := resolveDraftOutDir(cmd, opts.outDir, contextPath)

			result, err := draft.Generate(draft.Options{
				ContextPath: contextPath,
				Audience:    draft.Audience(audience),
				Format:      format,
				OutDir:      outDir,
			})
			if err != nil {
				resp := output.DraftResponse{
					Status:      statusError,
					ContextPath: contextPath,
					Audience:    audience,
					Format:      format,
					DraftPath:   "",
					ReceiptPath: "",
					Error: &output.ErrorDetail{
						Code:    "draft_generation_failed",
						Message: err.Error(),
					},
				}

				if opts.jsonOut {
					return output.PrintJSON(resp)
				}

				_, writeErr := fmt.Fprintf(os.Stdout, "draft command failed (code=%s): %s\n", resp.Error.Code, resp.Error.Message)
				if writeErr != nil {
					return writeErr
				}
				return err
			}

			resp := output.DraftResponse{
				Status:      statusOK,
				ContextPath: contextPath,
				Audience:    result.Receipt.Audience,
				Format:      result.Receipt.Format,
				DraftPath:   result.DraftPath,
				ReceiptPath: result.ReceiptPath,
			}
			if opts.jsonOut {
				return output.PrintJSON(resp)
			}

			_, err = fmt.Fprintf(os.Stdout, "draft generated\n- audience: %s\n- format: %s\n- draft: %s\n- receipt: %s\n", result.Receipt.Audience, result.Receipt.Format, result.DraftPath, result.ReceiptPath)
			return err
		},
	}

	cmd.Flags().StringVar(&contextPath, "context", "", "Path to a context.json bundle from `anchra collect`")
	cmd.Flags().StringVar(&audience, "audience", "", "Draft audience: external, internal, or investor")
	cmd.Flags().StringVar(&format, "format", "", "Optional format override: release-note, deployment-brief, stakeholder-update")
	_ = cmd.MarkFlagRequired("context")
	_ = cmd.MarkFlagRequired("audience")

	return cmd
}

type githubCollectFetcher struct {
	client *githubadapter.ReleaseClient
}

func (f githubCollectFetcher) FetchRelease(ctx context.Context, repo string, latest bool, tag string) (releasecontext.Release, error) {
	release, err := f.client.FetchRelease(ctx, repo, latest, tag)
	if err != nil {
		return releasecontext.Release{}, err
	}

	return releasecontext.Release{Title: release.Title, Tag: release.Tag, URL: release.URL}, nil
}

func (f githubCollectFetcher) FetchMergedPullRequests(ctx context.Context, repo string, limit int) ([]releasecontext.PullRequest, error) {
	prs, err := f.client.FetchMergedPullRequests(ctx, repo, limit)
	if err != nil {
		return nil, err
	}

	out := make([]releasecontext.PullRequest, 0, len(prs))
	for _, pr := range prs {
		out = append(out, releasecontext.PullRequest{Number: pr.Number, Title: pr.Title, URL: pr.URL})
	}

	return out, nil
}

type linearCollectFetcher struct {
	client *linearadapter.Client
}

func (f linearCollectFetcher) FetchIssuesUpdatedSince(ctx context.Context, params collect.LinearFetchParams) ([]releasecontext.Issue, error) {
	issues, err := f.client.FetchIssuesUpdatedSince(ctx, linearadapter.FetchIssuesParams{
		SinceDays: params.SinceDays,
		TeamKey:   params.TeamKey,
		ProjectID: params.ProjectID,
		Limit:     params.Limit,
	})
	if err != nil {
		return nil, err
	}

	out := make([]releasecontext.Issue, 0, len(issues))
	for _, issue := range issues {
		out = append(out, releasecontext.Issue{Identifier: issue.Identifier, Title: issue.Title, URL: issue.URL})
	}

	return out, nil
}

func newTUICmd(opts *options) *cobra.Command {
	return &cobra.Command{
		Use:   "tui",
		Short: "Run interactive Anchra wizard",
		RunE: func(_ *cobra.Command, _ []string) error {
			resp := output.StatusResponse{
				Status: statusError,
				Error: &output.ErrorDetail{
					Code:    "not_implemented",
					Message: "tui workflow is not implemented yet",
				},
			}

			if opts.jsonOut {
				return output.PrintJSON(resp)
			}

			_, err := fmt.Fprintf(os.Stdout, "tui command is not implemented yet (code=%s)\n", resp.Error.Code)
			return err
		},
	}
}

func resolveDraftOutDir(cmd *cobra.Command, defaultOutDir string, contextPath string) string {
	if flag := cmd.Flag("out"); flag != nil && flag.Changed {
		return defaultOutDir
	}

	if trimmed := strings.TrimSpace(contextPath); trimmed != "" {
		return filepath.Dir(trimmed)
	}

	return defaultOutDir
}

func defaultOutDir() string {
	sessionID := time.Now().UTC().Format("20060102T150405Z")
	return filepath.Join(".", "anchra-out", sessionID)
}

func printStatus(opts *options, resp output.StatusResponse) error {
	if opts.jsonOut {
		return output.PrintJSON(resp)
	}

	_, err := fmt.Fprintf(os.Stdout, "status: %s\n", resp.Status)
	if err != nil {
		return err
	}

	for _, check := range resp.Checks {
		if check.Error == nil {
			if _, err := fmt.Fprintf(os.Stdout, "- %s: %s\n", check.Name, check.Status); err != nil {
				return err
			}
			continue
		}

		if _, err := fmt.Fprintf(os.Stdout, "- %s: %s (%s)\n", check.Name, check.Status, check.Error.Code); err != nil {
			return err
		}
	}

	return nil
}

func githubCheck() output.Check {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result := githubadapter.NewAdapterFromEnv().CheckStatus(ctx)
	if result.Status == githubadapter.StatusOK {
		return output.Check{Name: "github", Status: statusOK}
	}

	errDetail := &output.ErrorDetail{
		Code: result.Code,
	}

	if result.Code == "missing_github_auth" {
		errDetail.Message = "set ANCHRA_GITHUB_TOKEN (or legacy PULSENOTE_GITHUB_TOKEN) or authenticate with gh"
	} else {
		errDetail.Message = "failed to verify GitHub connectivity using gh or token"
	}

	return output.Check{
		Name:   "github",
		Status: statusDegraded,
		Error:  errDetail,
	}
}

func linearCheck() output.Check {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result := linearadapter.NewClientFromEnv().CheckStatus(ctx)
	if result.Status == linearadapter.StatusOK {
		return output.Check{Name: "linear", Status: statusOK}
	}

	errDetail := &output.ErrorDetail{Code: result.Code}
	if result.Code == "missing_linear_api_key" {
		errDetail.Message = "set ANCHRA_LINEAR_API_KEY (or legacy PULSENOTE_LINEAR_API_KEY)"
	} else {
		errDetail.Message = "failed to verify Linear GraphQL connectivity"
	}

	return output.Check{
		Name:   "linear",
		Status: statusDegraded,
		Error:  errDetail,
	}
}

func slackCredCheck() output.Check {
	if envvars.Get("ANCHRA_SLACK_WEBHOOK_URL", "PULSENOTE_SLACK_WEBHOOK_URL") == "" {
		return output.Check{
			Name:   "slack",
			Status: statusDegraded,
			Error: &output.ErrorDetail{
				Code:    "missing_slack_webhook",
				Message: "set ANCHRA_SLACK_WEBHOOK_URL (or legacy PULSENOTE_SLACK_WEBHOOK_URL)",
			},
		}
	}

	return output.Check{Name: "slack", Status: statusOK}
}

func slackCheck(dryRun bool, post bool, text string) output.Check {
	doDryRun := dryRun || !post
	doPost := post && !dryRun

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result := slackadapter.NewClientFromEnv().Test(ctx, doDryRun, doPost, text)

	details := map[string]any{
		"plan": map[string]any{
			"dryRun":            result.Plan.DryRun,
			"willPost":          result.Plan.WillPost,
			"method":            result.Plan.Method,
			"contentType":       result.Plan.ContentType,
			"webhookConfigured": result.Plan.WebhookConfigured,
			"text":              result.Plan.Text,
		},
	}

	if result.Plan.WebhookMasked != "" {
		plan := details["plan"].(map[string]any)
		plan["webhookMasked"] = result.Plan.WebhookMasked
	}

	if result.Status == slackadapter.StatusOK {
		return output.Check{Name: "slack", Status: statusOK, Details: details}
	}

	errDetail := &output.ErrorDetail{Code: result.Code}
	if result.Code == slackadapter.CodeMissingSlackWebhook {
		errDetail.Message = "set ANCHRA_SLACK_WEBHOOK_URL (or legacy PULSENOTE_SLACK_WEBHOOK_URL)"
	} else {
		errDetail.Message = "failed to post to Slack incoming webhook"
	}

	return output.Check{Name: "slack", Status: statusDegraded, Details: details, Error: errDetail}
}

func aggregateStatus(checks []output.Check) string {
	overall := statusOK

	for _, check := range checks {
		switch check.Status {
		case statusError:
			return statusError
		case statusDegraded:
			overall = statusDegraded
		}
	}

	return overall
}
