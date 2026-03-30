ALTER TABLE "release_records"
ADD COLUMN "preferred_draft_template_id" text DEFAULT 'release_note_packet' NOT NULL;
--> statement-breakpoint
UPDATE "release_records" AS "release_records"
SET "preferred_draft_template_id" = "latest_draft_revisions"."template_id"
FROM (
  SELECT DISTINCT ON ("release_record_id")
    "release_record_id",
    "template_id"
  FROM "draft_revisions"
  ORDER BY "release_record_id", "version" DESC, "created_at" DESC
) AS "latest_draft_revisions"
WHERE "release_records"."id" = "latest_draft_revisions"."release_record_id";
