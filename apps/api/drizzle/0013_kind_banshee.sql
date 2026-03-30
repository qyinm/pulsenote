ALTER TABLE "draft_revisions"
ADD COLUMN "template_id" text DEFAULT 'release_note_packet' NOT NULL;
--> statement-breakpoint
ALTER TABLE "draft_revisions"
ADD COLUMN "template_label" text DEFAULT 'Release notes packet' NOT NULL;
--> statement-breakpoint
ALTER TABLE "draft_revisions"
ADD COLUMN "template_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "draft_revisions"
ADD COLUMN "field_snapshots" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "draft_revisions"
ADD COLUMN "evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "draft_revisions"
SET "field_snapshots" = jsonb_build_array(
  jsonb_build_object(
    'content', "release_notes_body",
    'contentFormat', 'markdown',
    'fieldKey', 'release_notes',
    'label', 'Release notes',
    'plainText', regexp_replace(regexp_replace(regexp_replace("release_notes_body", E'(?m)^#+\\s*', '', 'g'), E'(?m)^\\s*[-*+]\\s+', '', 'g'), E'[`*_>#]', '', 'g'),
    'sortOrder', 0
  ),
  jsonb_build_object(
    'content', "changelog_body",
    'contentFormat', 'markdown',
    'fieldKey', 'changelog',
    'label', 'Changelog',
    'plainText', regexp_replace(regexp_replace(regexp_replace("changelog_body", E'(?m)^#+\\s*', '', 'g'), E'(?m)^\\s*[-*+]\\s+', '', 'g'), E'[`*_>#]', '', 'g'),
    'sortOrder', 1
  )
)
WHERE jsonb_array_length("field_snapshots") = 0;
