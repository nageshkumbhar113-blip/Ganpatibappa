-- ============================================================
-- 016_platform_cloudinary_exempt.sql
--
-- Policy change (explicit user decision): every shop must connect its
-- own Cloudinary account before any image upload succeeds -- including
-- the payment-screenshot upload at checkout, which used to always fall
-- back to the platform's own account so a shop that hadn't configured
-- Cloudinary yet could still take orders. That guaranteed fallback is
-- now removed for everyone except the platform owner's own reference
-- shop (Shree Arts), which keeps using the platform account.
--
-- Checkout itself still never fails outright if a screenshot upload is
-- refused -- app/api/shop/orders/route.ts treats payment_screenshot_url
-- as optional and places the order regardless; only the image itself is
-- blocked, with a clear error surfaced to the customer.
-- ============================================================

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS platform_cloudinary_exempt BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.shops.platform_cloudinary_exempt IS
  'True only for the platform owner''s own shop(s) -- lets uploads (including payment screenshots) use the platform Cloudinary account indefinitely, with no own-account requirement. Every other shop must connect its own Cloudinary before any upload succeeds.';

UPDATE public.shops
  SET platform_cloudinary_exempt = true
  WHERE slug = 'shree-arts';

NOTIFY pgrst, 'reload schema';
