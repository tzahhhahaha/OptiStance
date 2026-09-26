-- Server-side aggregate for total media storage (bytes).
-- The client (mediaService.getTotalStorageUsage) prefers this RPC so it does
-- not have to download every media_uploads row just to sum sizes.
--
-- Apply from the Supabase SQL editor. Safe to run more than once.

CREATE OR REPLACE FUNCTION get_total_storage_usage()
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT
  FROM media_uploads;
$$;

-- Revoke from anon (should never run unauthenticated), keep for authenticated.
REVOKE ALL ON FUNCTION get_total_storage_usage() FROM anon, public;
GRANT EXECUTE ON FUNCTION get_total_storage_usage() TO authenticated;