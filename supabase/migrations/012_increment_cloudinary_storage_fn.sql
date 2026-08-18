-- ============================================================
-- 012_increment_cloudinary_storage_fn.sql
-- lib/cloudinary/upload.ts has always called
-- supabase.rpc('increment_cloudinary_storage', { p_shop_id, p_bytes, p_month_year })
-- after every upload to track per-shop Cloudinary storage usage — but no migration
-- ever created this function, so every call has been failing silently (the RPC
-- error is never checked), meaning storage usage has never actually been recorded.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_cloudinary_storage(
  p_shop_id UUID,
  p_bytes BIGINT,
  p_month_year TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cloudinary_usage (shop_id, storage_bytes, month_year, last_updated_at)
  VALUES (p_shop_id, GREATEST(p_bytes, 0), p_month_year, NOW())
  ON CONFLICT (shop_id, month_year)
  DO UPDATE SET
    storage_bytes = GREATEST(public.cloudinary_usage.storage_bytes + p_bytes, 0),
    last_updated_at = NOW();
END;
$$;
