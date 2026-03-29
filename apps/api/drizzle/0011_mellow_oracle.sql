CREATE TABLE "workspace_policy_settings" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"include_evidence_links_in_export" boolean DEFAULT true NOT NULL,
	"include_source_links_in_export" boolean DEFAULT true NOT NULL,
	"require_claim_check_before_approval" boolean DEFAULT true NOT NULL,
	"require_reviewer_assignment" boolean DEFAULT true NOT NULL,
	"show_blocked_claims_in_inbox" boolean DEFAULT true NOT NULL,
	"show_pending_approvals_in_inbox" boolean DEFAULT true NOT NULL,
	"show_reopened_drafts_in_inbox" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_policy_settings" ADD CONSTRAINT "workspace_policy_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "workspace_policy_settings" (
  "workspace_id",
  "created_at",
  "updated_at",
  "include_evidence_links_in_export",
  "include_source_links_in_export",
  "require_claim_check_before_approval",
  "require_reviewer_assignment",
  "show_blocked_claims_in_inbox",
  "show_pending_approvals_in_inbox",
  "show_reopened_drafts_in_inbox"
)
SELECT
  "id",
  now(),
  now(),
  true,
  true,
  true,
  true,
  true,
  true,
  true
FROM "workspaces"
ON CONFLICT ("workspace_id") DO NOTHING;
