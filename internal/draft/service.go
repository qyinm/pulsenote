package draft

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"anchra-cli/internal/releasecontext"
)

const statusOK = "ok"

type Audience string

const (
	AudienceExternal Audience = "external"
	AudienceInternal Audience = "internal"
	AudienceInvestor Audience = "investor"
)

type Options struct {
	ContextPath string
	Audience    Audience
	Format      string
	OutDir      string
	Now         func() time.Time
}

type Result struct {
	DraftPath   string
	ReceiptPath string
	Receipt     Receipt
}

type Receipt struct {
	Status      string                      `json:"status"`
	ContextPath string                      `json:"contextPath"`
	Audience    string                      `json:"audience"`
	Format      string                      `json:"format"`
	Counts      releasecontext.SourceCounts `json:"counts"`
	GeneratedAt string                      `json:"generatedAt"`
}

func Generate(opts Options) (Result, error) {
	outDir := strings.TrimSpace(opts.OutDir)
	if outDir == "" {
		return Result{}, fmt.Errorf("out directory is required")
	}

	contextPath := strings.TrimSpace(opts.ContextPath)
	if contextPath == "" {
		return Result{}, fmt.Errorf("context path is required")
	}

	audience, err := normalizeAudience(opts.Audience)
	if err != nil {
		return Result{}, err
	}

	format, err := resolveFormat(audience, opts.Format)
	if err != nil {
		return Result{}, err
	}

	bundle, err := releasecontext.Load(contextPath)
	if err != nil {
		return Result{}, err
	}

	now := time.Now().UTC()
	if opts.Now != nil {
		now = opts.Now().UTC()
	}

	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return Result{}, fmt.Errorf("create output directory: %w", err)
	}

	draftPath := filepath.Join(outDir, string(audience)+"-"+format+".md")
	content := RenderMarkdown(RenderInput{
		Bundle:      bundle,
		Audience:    audience,
		Format:      format,
		GeneratedAt: now,
	})
	if err := os.WriteFile(draftPath, []byte(content), 0o644); err != nil {
		return Result{}, fmt.Errorf("write draft: %w", err)
	}

	receipt := Receipt{
		Status:      statusOK,
		ContextPath: contextPath,
		Audience:    string(audience),
		Format:      format,
		Counts:      bundle.SourceCounts,
		GeneratedAt: now.Format(time.RFC3339),
	}

	receiptPath := filepath.Join(outDir, string(audience)+"-"+format+"-receipt.json")
	body, err := json.MarshalIndent(receipt, "", "  ")
	if err != nil {
		return Result{}, fmt.Errorf("encode receipt: %w", err)
	}
	body = append(body, '\n')
	if err := os.WriteFile(receiptPath, body, 0o644); err != nil {
		return Result{}, fmt.Errorf("write receipt: %w", err)
	}

	return Result{DraftPath: draftPath, ReceiptPath: receiptPath, Receipt: receipt}, nil
}

func normalizeAudience(audience Audience) (Audience, error) {
	switch Audience(strings.ToLower(strings.TrimSpace(string(audience)))) {
	case AudienceExternal:
		return AudienceExternal, nil
	case AudienceInternal:
		return AudienceInternal, nil
	case AudienceInvestor:
		return AudienceInvestor, nil
	default:
		return "", fmt.Errorf("audience must be one of external, internal, investor")
	}
}

func resolveFormat(audience Audience, format string) (string, error) {
	trimmed := strings.ToLower(strings.TrimSpace(format))
	if trimmed == "" {
		switch audience {
		case AudienceExternal:
			return "release-note", nil
		case AudienceInternal:
			return "deployment-brief", nil
		case AudienceInvestor:
			return "stakeholder-update", nil
		}
	}

	switch trimmed {
	case "release-note", "deployment-brief", "stakeholder-update":
		return trimmed, nil
	default:
		return "", fmt.Errorf("format must be one of release-note, deployment-brief, stakeholder-update")
	}
}
