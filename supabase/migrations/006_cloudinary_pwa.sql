-- ============================================================
-- 006_cloudinary_pwa.sql
-- Marketing Settings, Domain Mappings, Cloudinary,
-- PWA Settings, Shop Backups, Clone History
-- ============================================================

-- ============================================================
-- TABLE: marketing_settings
-- GA, FB Pixel, GSC, robots.txt, OG image per shop
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_settings (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                     UUID        NOT NULL UNIQUE
                                          REFERENCES public.shops(id) ON DELETE CASCADE,
  google_analytics_id         TEXT,
  google_search_console_code  TEXT,
  facebook_pixel_id           TEXT,
  og_default_image            TEXT,
  robots_txt_custom           TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_marketing_settings_updated_at
  BEFORE UPDATE ON public.marketing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: domain_mappings
-- Custom domain DNS + SSL tracking per shop
-- ============================================================
CREATE TABLE IF NOT EXISTS public.domain_mappings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  domain            TEXT        NOT NULL UNIQUE,
  is_primary        BOOLEAN     NOT NULL DEFAULT false,
  dns_verified      BOOLEAN     NOT NULL DEFAULT false,
  dns_txt_record    TEXT,
  ssl_status        TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (ssl_status IN (
                                  'pending', 'active', 'expiring', 'expired', 'error'
                                )),
  ssl_expires_at    TIMESTAMPTZ,
  domain_expires_at TIMESTAMPTZ,
  last_checked_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_domain_mappings_updated_at
  BEFORE UPDATE ON public.domain_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_domain_mappings_shop_id ON public.domain_mappings(shop_id);
CREATE INDEX idx_domain_mappings_domain  ON public.domain_mappings(domain);

-- ============================================================
-- TABLE: cloudinary_settings
-- Per-shop Cloudinary credentials (stored encrypted by Supabase Vault ideally)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cloudinary_settings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID        NOT NULL UNIQUE
                               REFERENCES public.shops(id) ON DELETE CASCADE,
  cloud_name       TEXT        NOT NULL,
  api_key          TEXT        NOT NULL,
  api_secret       TEXT        NOT NULL,
  upload_limit_mb  INTEGER     NOT NULL DEFAULT 10,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  last_tested_at   TIMESTAMPTZ,
  test_status      TEXT        CHECK (test_status IN ('success', 'failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_cloudinary_settings_updated_at
  BEFORE UPDATE ON public.cloudinary_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: cloudinary_usage
-- Monthly storage + bandwidth tracking per shop
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cloudinary_usage (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  storage_bytes    BIGINT      NOT NULL DEFAULT 0,
  bandwidth_bytes  BIGINT      NOT NULL DEFAULT 0,
  month_year       TEXT        NOT NULL,   -- format: '2025-06'
  last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, month_year)
);

CREATE INDEX idx_cloudinary_usage_shop_id ON public.cloudinary_usage(shop_id);

-- ============================================================
-- TABLE: pwa_settings
-- Per-shop PWA manifest settings (app name, icon, colors)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pwa_settings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID        NOT NULL UNIQUE
                                REFERENCES public.shops(id) ON DELETE CASCADE,
  app_name          TEXT        NOT NULL,
  short_name        TEXT        NOT NULL,
  theme_color       TEXT        NOT NULL DEFAULT '#ff6b00',
  background_color  TEXT        NOT NULL DEFAULT '#ffffff',
  icon_url          TEXT,
  splash_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_pwa_settings_updated_at
  BEFORE UPDATE ON public.pwa_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: shop_backups
-- Full shop data backup records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shop_backups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  backup_url  TEXT,
  size_bytes  BIGINT      DEFAULT 0,
  version     TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'completed', 'failed')),
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_backups_shop_id ON public.shop_backups(shop_id);

-- ============================================================
-- TABLE: shop_clone_history
-- Records when a shop is cloned from another
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shop_clone_history (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_shop_id   UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  target_shop_id   UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  cloned_items     JSONB       NOT NULL DEFAULT '{
    "products": true,
    "categories": true,
    "settings": true,
    "theme": true,
    "gallery": false,
    "templates": true
  }'::jsonb,
  cloned_by        UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_clone_history_source
  ON public.shop_clone_history(source_shop_id);
CREATE INDEX idx_shop_clone_history_target
  ON public.shop_clone_history(target_shop_id);
