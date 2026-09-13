-- Add an independent gatekeepers collection for the current app_data storage model.
-- This is non-destructive and does not modify existing guards, schools, or operations.
INSERT INTO app_data (key, value, updated_at)
VALUES ('gatekeepers', '[]'::jsonb, now())
ON CONFLICT (key) DO NOTHING;
