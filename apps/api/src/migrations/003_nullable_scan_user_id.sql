-- Allow anonymous (public) scans by making user_id nullable on scans table.
-- Public scans have user_id = NULL and are created via /api/scan/public.

ALTER TABLE scans ALTER COLUMN user_id DROP NOT NULL;
