-- ============================================================
-- 002_subscriptions.sql
-- Subscription Plans + Shop Subscriptions
-- ============================================================

-- ============================================================
-- TABLE: subscription_plans
-- Platform-defined plans (trial / basic / premium)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL UNIQUE
                             CHECK (name IN ('trial', 'basic', 'premium')),
  display_name   TEXT        NOT NULL,
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_cycle  TEXT        NOT NULL DEFAULT 'monthly'
                             CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
  duration_days  INTEGER     NOT NULL DEFAULT 30,
  max_products   INTEGER     NOT NULL DEFAULT 10,
  max_staff      INTEGER     NOT NULL DEFAULT 0,
  -- JSON features map for feature-gating:
  -- { "custom_domain": false, "bulk_import": false, "invoice_pdf": false,
  --   "quotation": false, "full_seo": false, "google_analytics": false,
  --   "facebook_pixel": false, "campaigns": false, "bulk_notifications": false,
  --   "two_fa": false, "ip_restrictions": false, "shop_backup": false,
  --   "clone_shop": false, "reports_excel": false, "cloudinary_own": false }
  features       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE: shop_subscriptions
-- One active subscription per shop
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shop_subscriptions (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                  UUID        NOT NULL UNIQUE
                                       REFERENCES public.shops(id) ON DELETE CASCADE,
  plan_id                  UUID        NOT NULL
                                       REFERENCES public.subscription_plans(id),
  started_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at               TIMESTAMPTZ NOT NULL,
  status                   TEXT        NOT NULL DEFAULT 'trial'
                                       CHECK (status IN (
                                         'trial', 'active', 'expired',
                                         'suspended', 'cancelled'
                                       )),
  renewal_reminder_sent    BOOLEAN     NOT NULL DEFAULT false,
  payment_reference        TEXT,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_shop_subscriptions_updated_at
  BEFORE UPDATE ON public.shop_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_shop_subs_shop_id    ON public.shop_subscriptions(shop_id);
CREATE INDEX idx_shop_subs_expires_at ON public.shop_subscriptions(expires_at);
CREATE INDEX idx_shop_subs_status     ON public.shop_subscriptions(status);

-- ============================================================
-- FUNCTION: check if shop's subscription is active
-- Used in application layer (plan-guard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_subscription_active(p_shop_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_subscriptions
    WHERE shop_id = p_shop_id
      AND status IN ('trial', 'active')
      AND expires_at > NOW()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCTION: get shop's feature access from plan
-- ============================================================
CREATE OR REPLACE FUNCTION public.shop_has_feature(p_shop_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (
      SELECT (sp.features ->> p_feature)::boolean
      FROM public.shop_subscriptions ss
      JOIN public.subscription_plans sp ON sp.id = ss.plan_id
      WHERE ss.shop_id = p_shop_id
        AND ss.status IN ('trial', 'active')
        AND ss.expires_at > NOW()
      LIMIT 1
    ),
    false
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCTION: get shop's product limit from plan
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_plan_product_limit(p_shop_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(
    (
      SELECT sp.max_products
      FROM public.shop_subscriptions ss
      JOIN public.subscription_plans sp ON sp.id = ss.plan_id
      WHERE ss.shop_id = p_shop_id
        AND ss.status IN ('trial', 'active')
        AND ss.expires_at > NOW()
      LIMIT 1
    ),
    10
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
