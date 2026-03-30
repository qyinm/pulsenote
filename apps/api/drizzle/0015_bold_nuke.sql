ALTER TABLE "release_records"
ADD COLUMN "preferred_draft_template_id" text DEFAULT 'release_note_packet' NOT NULL;
