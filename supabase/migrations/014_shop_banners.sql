-- ============================================================
-- 014_shop_banners.sql
--
-- Multiple rotating hero banners per shop (a carousel), replacing the
-- single shops.banner_url image. Mirrors the gallery table exactly —
-- same shape, same RLS pattern — since the admin UI and API reuse the
-- same public-read / owner-write model.
--
-- shops.banner_url is left in place as a fallback for shops that set one
-- before this migration and never add a slide: the storefront shows the
-- carousel when shop_banners has active rows, otherwise falls back to the
-- single banner_url, otherwise the plain gradient.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shop_banners (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  link_url    TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_banners_shop_id ON public.shop_banners(shop_id);

ALTER TABLE public.shop_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_banners_super_admin" ON public.shop_banners
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "shop_banners_admin_all" ON public.shop_banners
  FOR ALL USING (shop_id = get_my_shop_id())
  WITH CHECK (shop_id = get_my_shop_id());

CREATE POLICY "shop_banners_public_read" ON public.shop_banners
  FOR SELECT USING (is_active = true);

NOTIFY pgrst, 'reload schema';
