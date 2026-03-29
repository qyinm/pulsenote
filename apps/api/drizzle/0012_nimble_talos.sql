ALTER TABLE "publish_pack_exports"
ADD COLUMN "evidence_snapshots" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "publish_pack_exports"
ADD COLUMN "source_snapshots" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "publish_pack_exports"
ADD COLUMN "context_snapshot" jsonb;
--> statement-breakpoint
ALTER TABLE "publish_pack_exports"
ADD COLUMN "policy_snapshot" jsonb;
--> statement-breakpoint
UPDATE "publish_pack_exports"
SET
  "context_snapshot" = COALESCE(
    "context_snapshot",
    jsonb_build_object(
      'approvalNote', null,
      'approvalOwnerName', null,
      'approvalOwnerUserId', null,
      'approvalRequestedByName', null,
      'approvalRequestedByUserId', null,
      'approvalState', 'approved',
      'exportedByName', null,
      'exportedByUserId', "created_by_user_id"
    )
  ),
  "policy_snapshot" = COALESCE(
    "policy_snapshot",
    jsonb_build_object(
      'includeEvidenceLinksInExport', true,
      'includeSourceLinksInExport', true
    )
  );
--> statement-breakpoint
ALTER TABLE "publish_pack_exports"
ALTER COLUMN "evidence_snapshots" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "publish_pack_exports"
ALTER COLUMN "source_snapshots" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "publish_pack_exports"
ALTER COLUMN "context_snapshot" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "publish_pack_exports"
ALTER COLUMN "policy_snapshot" SET NOT NULL;
