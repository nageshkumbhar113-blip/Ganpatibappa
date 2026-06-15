-- ============================================================
-- GANPATIBAPPA SaaS — Combined Migration (001 → 008)
-- Paste into: https://supabase.com/dashboard/project/ptycszhdzucwptagnnfi/sql/new
-- ============================================================

-- ============================================================
-- STEP 1: Extensions + base trigger function
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 2: Core tables (shops, shop_settings, users, staff)
--         Helper functions come AFTER these tables exist.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shops (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT        UNIQUE NOT NULL,
  name         TEXT        NOT NULL,
  owner_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  logo_url     TEXT,
  banner_url   TEXT,
  whatsapp     TEXT,
  address      TEXT,
  status       TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'suspended', 'deleted')),
  domain       TEXT        UNIQUE,
  subdomain    TEXT        UNIQUE,
  theme_config JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_shops_slug      ON public.shops(slug);
CREATE INDEX IF NOT EXISTS idx_shops_domain    ON public.shops(domain);
CREATE INDEX IF NOT EXISTS idx_shops_subdomain ON public.shops(subdomain);
CREATE INDEX IF NOT EXISTS idx_shops_owner_id  ON public.shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_status    ON public.shops(status);

CREATE TABLE IF NOT EXISTS public.shop_settings (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id              UUID        NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  about_text           TEXT,
  contact_email        TEXT,
  show_prices          BOOLEAN     NOT NULL DEFAULT true,
  allow_whatsapp_order BOOLEAN     NOT NULL DEFAULT true,
  meta_title           TEXT,
  meta_description     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_shop_settings_updated_at
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.users (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'customer'
                         CHECK (role IN ('super_admin', 'admin', 'staff', 'customer')),
  shop_id    UUID        REFERENCES public.shops(id) ON DELETE SET NULL,
  name       TEXT,
  phone      TEXT,
  avatar_url TEXT,
  fcm_token  TEXT,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_users_shop_id ON public.users(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_role    ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email   ON public.users(email);

-- staff moved here so has_staff_permission() can reference it
CREATE TABLE IF NOT EXISTS public.staff (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'employee'
                          CHECK (role IN ('manager', 'employee')),
  permissions JSONB       NOT NULL DEFAULT '{
    "products":  false,
    "orders":    false,
    "customers": false,
    "gallery":   false,
    "reports":   false,
    "settings":  false,
    "staff":     false
  }'::jsonb,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  invited_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);
CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_staff_shop_id ON public.staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);

-- ============================================================
-- STEP 3: RLS helper functions (tables now exist)
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_shop_id()
RETURNS UUID AS $$
  SELECT shop_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_shop_admin_or_staff(p_shop_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND shop_id = p_shop_id
      AND role IN ('admin', 'staff')
      AND is_active = true
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_staff_permission(p_shop_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid()
      AND shop_id = p_shop_id
      AND is_active = true
      AND (permissions ->> p_permission)::boolean = true
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Auth trigger: auto-create public.users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- STEP 4: Subscription plans & shop subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL UNIQUE
                              CHECK (name IN ('trial', 'basic', 'premium')),
  display_name  TEXT          NOT NULL,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT          NOT NULL DEFAULT 'monthly'
                              CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
  duration_days INTEGER       NOT NULL DEFAULT 30,
  max_products  INTEGER       NOT NULL DEFAULT 10,
  max_staff     INTEGER       NOT NULL DEFAULT 0,
  features      JSONB         NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shop_subscriptions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               UUID        NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  plan_id               UUID        NOT NULL REFERENCES public.subscription_plans(id),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'trial'
                                    CHECK (status IN ('trial','active','expired','suspended','cancelled')),
  renewal_reminder_sent BOOLEAN     NOT NULL DEFAULT false,
  payment_reference     TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_shop_subscriptions_updated_at
  BEFORE UPDATE ON public.shop_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_shop_subs_shop_id    ON public.shop_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_subs_expires_at ON public.shop_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_shop_subs_status     ON public.shop_subscriptions(status);

CREATE OR REPLACE FUNCTION public.is_subscription_active(p_shop_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_subscriptions
    WHERE shop_id = p_shop_id AND status IN ('trial','active') AND expires_at > NOW()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.shop_has_feature(p_shop_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE((
    SELECT (sp.features ->> p_feature)::boolean
    FROM public.shop_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.shop_id = p_shop_id AND ss.status IN ('trial','active') AND ss.expires_at > NOW()
    LIMIT 1
  ), false)
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_plan_product_limit(p_shop_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE((
    SELECT sp.max_products
    FROM public.shop_subscriptions ss
    JOIN public.subscription_plans sp ON sp.id = ss.plan_id
    WHERE ss.shop_id = p_shop_id AND ss.status IN ('trial','active') AND ss.expires_at > NOW()
    LIMIT 1
  ), 10)
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- STEP 5: Categories, Products, Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  image_url  TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, slug)
);
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_categories_shop_id ON public.categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug    ON public.categories(slug);

CREATE TABLE IF NOT EXISTS public.products (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  category_id     UUID          REFERENCES public.categories(id) ON DELETE SET NULL,
  name            TEXT          NOT NULL,
  slug            TEXT          NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  offer_price     NUMERIC(10,2),
  height_cm       NUMERIC(6,2),
  material        TEXT,
  weight_kg       NUMERIC(6,3),
  stock           INTEGER       NOT NULL DEFAULT 0,
  is_featured     BOOLEAN       NOT NULL DEFAULT false,
  is_active       BOOLEAN       NOT NULL DEFAULT true,
  images          TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[],
  video_url       TEXT,
  seo_title       TEXT,
  seo_description TEXT,
  seo_keywords    TEXT,
  og_image_url    TEXT,
  view_count      INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, slug)
);
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_products_shop_id     ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active   ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_slug        ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_created_at  ON public.products(created_at DESC);

CREATE TABLE IF NOT EXISTS public.orders (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id            UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number           TEXT          NOT NULL,
  customer_name          TEXT          NOT NULL,
  customer_phone         TEXT          NOT NULL,
  customer_email         TEXT,
  customer_address       TEXT,
  total_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status                 TEXT          NOT NULL DEFAULT 'pending'
                                       CHECK (status IN ('pending','confirmed','in_production','ready','delivered','cancelled')),
  payment_method         TEXT          NOT NULL DEFAULT 'upi'
                                       CHECK (payment_method IN ('upi','qr','cod','partial','bank_transfer')),
  payment_status         TEXT          NOT NULL DEFAULT 'pending'
                                       CHECK (payment_status IN ('pending','partial','paid','refunded')),
  payment_screenshot_url TEXT,
  pickup_date            DATE,
  delivery_date          DATE,
  notes                  TEXT,
  admin_notes            TEXT,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_orders_shop_id      ON public.orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE v_prefix TEXT; v_seq INTEGER;
BEGIN
  SELECT UPPER(LEFT(slug,3)) INTO v_prefix FROM public.shops WHERE id = NEW.shop_id;
  SELECT COUNT(*)+1 INTO v_seq FROM public.orders WHERE shop_id = NEW.shop_id;
  NEW.order_number := v_prefix || TO_CHAR(NOW(),'YYYYMMDD') || LPAD(v_seq::TEXT,4,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

CREATE TABLE IF NOT EXISTS public.order_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID          REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT          NOT NULL,
  product_image TEXT,
  price         NUMERIC(10,2) NOT NULL,
  quantity      INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  subtotal      NUMERIC(10,2) GENERATED ALWAYS AS (price * quantity) STORED,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

CREATE TABLE IF NOT EXISTS public.advance_payments (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  shop_id        UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  payment_method TEXT          NOT NULL CHECK (payment_method IN ('upi','qr','bank_transfer','cash')),
  screenshot_url TEXT,
  status         TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_by    UUID          REFERENCES auth.users(id),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_advance_payments_updated_at
  BEFORE UPDATE ON public.advance_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_advance_payments_order_id ON public.advance_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_advance_payments_shop_id  ON public.advance_payments(shop_id);

CREATE TABLE IF NOT EXISTS public.quotations (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  quotation_number TEXT          NOT NULL,
  customer_name    TEXT          NOT NULL,
  customer_phone   TEXT          NOT NULL,
  customer_email   TEXT,
  items            JSONB         NOT NULL DEFAULT '[]'::jsonb,
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  valid_until      DATE,
  status           TEXT          NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_quotations_shop_id ON public.quotations(shop_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status  ON public.quotations(status);

CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER AS $$
DECLARE v_prefix TEXT; v_seq INTEGER;
BEGIN
  SELECT UPPER(LEFT(slug,3)) INTO v_prefix FROM public.shops WHERE id = NEW.shop_id;
  SELECT COUNT(*)+1 INTO v_seq FROM public.quotations WHERE shop_id = NEW.shop_id;
  NEW.quotation_number := 'QT-' || v_prefix || TO_CHAR(NOW(),'YYYYMM') || LPAD(v_seq::TEXT,3,'0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_quotation_number ON public.quotations;
CREATE TRIGGER trg_set_quotation_number
  BEFORE INSERT ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.generate_quotation_number();

-- ============================================================
-- STEP 6: Communication tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gallery (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  image_url  TEXT        NOT NULL,
  caption    TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gallery_shop_id ON public.gallery(shop_id);

CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id    UUID        REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT        NOT NULL,
  rating        INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  is_approved   BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_reviews_shop_id    ON public.reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved   ON public.reviews(is_approved);

CREATE TABLE IF NOT EXISTS public.wishlists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, customer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlists_customer_id ON public.wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_shop_id     ON public.wishlists(shop_id);

CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, customer_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_customer
  ON public.recently_viewed(customer_id, viewed_at DESC);

CREATE TABLE IF NOT EXISTS public.inquiries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  email       TEXT,
  product_id  UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new','read','replied','closed')),
  admin_reply TEXT,
  replied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_inquiries_shop_id ON public.inquiries(shop_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON public.inquiries(status);

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  template   TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'custom'
                         CHECK (type IN ('order_confirm','ready','delivery','custom','festival','reminder')),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_shop_id ON public.whatsapp_templates(shop_id);

CREATE TABLE IF NOT EXISTS public.email_templates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  body_html  TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'custom'
                         CHECK (type IN ('order_confirm','ready','delivery','newsletter','renewal','custom')),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_templates_shop_id ON public.email_templates(shop_id);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  name            TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  UNIQUE(shop_id, email)
);
CREATE INDEX IF NOT EXISTS idx_newsletter_shop_id ON public.newsletter_subscribers(shop_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  body           TEXT        NOT NULL,
  type           TEXT        NOT NULL DEFAULT 'info'
                             CHECK (type IN ('order','payment','review','inquiry','system','info','stock_low','renewal')),
  reference_id   UUID,
  is_read        BOOLEAN     NOT NULL DEFAULT false,
  target_user_id UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_shop_id        ON public.notifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read        ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at     ON public.notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS public.fcm_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token  TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('admin','staff','customer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);
CREATE INDEX IF NOT EXISTS idx_fcm_shop_id ON public.fcm_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_fcm_user_id ON public.fcm_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  image_url    TEXT,
  target       TEXT        NOT NULL DEFAULT 'all' CHECK (target IN ('all','customers','admins')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_count   INTEGER     NOT NULL DEFAULT 0,
  created_by   UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_scheduled_notifs_updated_at
  BEFORE UPDATE ON public.scheduled_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_scheduled_notifs_shop_id ON public.scheduled_notifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifs_scheduled_at
  ON public.scheduled_notifications(scheduled_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.festival_campaigns (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  festival_name    TEXT,
  message          TEXT        NOT NULL,
  image_url        TEXT,
  target_audience  TEXT        NOT NULL DEFAULT 'all'
                               CHECK (target_audience IN ('all','customers','subscribers')),
  whatsapp_enabled BOOLEAN     NOT NULL DEFAULT true,
  email_enabled    BOOLEAN     NOT NULL DEFAULT false,
  push_enabled     BOOLEAN     NOT NULL DEFAULT true,
  scheduled_at     TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','scheduled','sent','failed')),
  sent_count       INTEGER     NOT NULL DEFAULT 0,
  created_by       UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_festival_campaigns_updated_at
  BEFORE UPDATE ON public.festival_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_festival_campaigns_shop_id ON public.festival_campaigns(shop_id);
CREATE INDEX IF NOT EXISTS idx_festival_campaigns_status  ON public.festival_campaigns(status);

-- ============================================================
-- STEP 7: Security & log tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id        UUID        REFERENCES public.shops(id) ON DELETE SET NULL,
  ip_address     INET,
  user_agent     TEXT,
  location       TEXT,
  status         TEXT        NOT NULL DEFAULT 'success'
                             CHECK (status IN ('success','failed','blocked','2fa_required')),
  failure_reason TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_shop_id ON public.login_history(shop_id);
CREATE INDEX IF NOT EXISTS idx_login_history_ip      ON public.login_history(ip_address);

CREATE TABLE IF NOT EXISTS public.two_factor_auth (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  secret       TEXT        NOT NULL,
  is_enabled   BOOLEAN     NOT NULL DEFAULT false,
  backup_codes TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_two_factor_auth_updated_at
  BEFORE UPDATE ON public.two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ip_restrictions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  ip_address INET        NOT NULL,
  action     TEXT        NOT NULL DEFAULT 'block' CHECK (action IN ('allow','block')),
  note       TEXT,
  created_by UUID        REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, ip_address)
);
CREATE INDEX IF NOT EXISTS idx_ip_restrictions_shop_id ON public.ip_restrictions(shop_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        REFERENCES public.shops(id) ON DELETE SET NULL,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_id   UUID        REFERENCES public.staff(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  table_name TEXT,
  record_id  UUID,
  old_value  JSONB,
  new_value  JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_id    ON public.audit_logs(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'general'
                          CHECK (category IN ('product','order','customer','settings','payment','staff','security','general')),
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_shop_id  ON public.activity_logs(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON public.activity_logs(category);

-- ============================================================
-- STEP 8: Cloudinary, PWA, Marketing, Domains
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_settings (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                    UUID        NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  google_analytics_id        TEXT,
  google_search_console_code TEXT,
  facebook_pixel_id          TEXT,
  og_default_image           TEXT,
  robots_txt_custom          TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_marketing_settings_updated_at
  BEFORE UPDATE ON public.marketing_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.domain_mappings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  domain            TEXT        NOT NULL UNIQUE,
  is_primary        BOOLEAN     NOT NULL DEFAULT false,
  dns_verified      BOOLEAN     NOT NULL DEFAULT false,
  dns_txt_record    TEXT,
  ssl_status        TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (ssl_status IN ('pending','active','expiring','expired','error')),
  ssl_expires_at    TIMESTAMPTZ,
  domain_expires_at TIMESTAMPTZ,
  last_checked_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_domain_mappings_updated_at
  BEFORE UPDATE ON public.domain_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_domain_mappings_shop_id ON public.domain_mappings(shop_id);
CREATE INDEX IF NOT EXISTS idx_domain_mappings_domain  ON public.domain_mappings(domain);

CREATE TABLE IF NOT EXISTS public.cloudinary_settings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID        NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  cloud_name      TEXT        NOT NULL,
  api_key         TEXT        NOT NULL,
  api_secret      TEXT        NOT NULL,
  upload_limit_mb INTEGER     NOT NULL DEFAULT 10,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  last_tested_at  TIMESTAMPTZ,
  test_status     TEXT        CHECK (test_status IN ('success','failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_cloudinary_settings_updated_at
  BEFORE UPDATE ON public.cloudinary_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.cloudinary_usage (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  storage_bytes   BIGINT      NOT NULL DEFAULT 0,
  bandwidth_bytes BIGINT      NOT NULL DEFAULT 0,
  month_year      TEXT        NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, month_year)
);
CREATE INDEX IF NOT EXISTS idx_cloudinary_usage_shop_id ON public.cloudinary_usage(shop_id);

CREATE TABLE IF NOT EXISTS public.pwa_settings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID        NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  app_name         TEXT        NOT NULL,
  short_name       TEXT        NOT NULL,
  theme_color      TEXT        NOT NULL DEFAULT '#ff6b00',
  background_color TEXT        NOT NULL DEFAULT '#ffffff',
  icon_url         TEXT,
  splash_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_pwa_settings_updated_at
  BEFORE UPDATE ON public.pwa_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shop_backups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  backup_url TEXT,
  size_bytes BIGINT      DEFAULT 0,
  version    TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_by UUID        REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_backups_shop_id ON public.shop_backups(shop_id);

CREATE TABLE IF NOT EXISTS public.shop_clone_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_shop_id UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  target_shop_id UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  cloned_items   JSONB       NOT NULL DEFAULT '{"products":true,"categories":true,"settings":true,"theme":true,"gallery":false,"templates":true}'::jsonb,
  cloned_by      UUID        REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_clone_history_source ON public.shop_clone_history(source_shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_clone_history_target ON public.shop_clone_history(target_shop_id);

-- ============================================================
-- STEP 9: Enable RLS on all tables
-- ============================================================
ALTER TABLE public.shops                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.festival_campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_auth        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_restrictions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_mappings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloudinary_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloudinary_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_backups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_clone_history     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 10: RLS Policies
-- ============================================================

-- shops
CREATE POLICY "shops_super_admin_all"     ON public.shops FOR ALL     USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "shops_admin_read_own"      ON public.shops FOR SELECT  USING (owner_id = auth.uid() OR id = get_my_shop_id());
CREATE POLICY "shops_admin_update_own"    ON public.shops FOR UPDATE  USING (id = get_my_shop_id() AND get_my_role() = 'admin') WITH CHECK (id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "shops_public_read_active"  ON public.shops FOR SELECT  USING (status = 'active');

-- shop_settings
CREATE POLICY "shop_settings_super_admin" ON public.shop_settings FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "shop_settings_admin_all"   ON public.shop_settings FOR ALL    USING (shop_id = get_my_shop_id()) WITH CHECK (shop_id = get_my_shop_id());
CREATE POLICY "shop_settings_public_read" ON public.shop_settings FOR SELECT USING (true);

-- users
CREATE POLICY "users_super_admin_all"          ON public.users FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "users_read_own"                 ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own"               ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "users_admin_read_shop_members"  ON public.users FOR SELECT USING (get_my_role() IN ('admin','staff') AND shop_id = get_my_shop_id());
CREATE POLICY "users_insert_own"               ON public.users FOR INSERT WITH CHECK (id = auth.uid());

-- subscription_plans
CREATE POLICY "sub_plans_super_admin_all"      ON public.subscription_plans FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "sub_plans_authenticated_read"   ON public.subscription_plans FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- shop_subscriptions
CREATE POLICY "shop_subs_super_admin_all"  ON public.shop_subscriptions FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "shop_subs_admin_read_own"   ON public.shop_subscriptions FOR SELECT USING (shop_id = get_my_shop_id());

-- categories
CREATE POLICY "categories_super_admin_all"    ON public.categories FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "categories_admin_all"          ON public.categories FOR ALL    USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin') WITH CHECK (shop_id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "categories_staff_products"     ON public.categories FOR ALL    USING (shop_id = get_my_shop_id() AND has_staff_permission(shop_id, 'products'));
CREATE POLICY "categories_public_read_active" ON public.categories FOR SELECT USING (is_active = true);

-- products
CREATE POLICY "products_super_admin_all"    ON public.products FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "products_admin_all"          ON public.products FOR ALL    USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin') WITH CHECK (shop_id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "products_staff_manage"       ON public.products FOR ALL    USING (shop_id = get_my_shop_id() AND has_staff_permission(shop_id, 'products'));
CREATE POLICY "products_public_read_active" ON public.products FOR SELECT USING (is_active = true);

-- orders
CREATE POLICY "orders_super_admin_all" ON public.orders FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "orders_admin_all"       ON public.orders FOR ALL USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin') WITH CHECK (shop_id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "orders_staff_manage"    ON public.orders FOR ALL USING (shop_id = get_my_shop_id() AND has_staff_permission(shop_id, 'orders'));
CREATE POLICY "orders_customer_own"    ON public.orders FOR ALL USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

-- order_items
CREATE POLICY "order_items_super_admin_all" ON public.order_items FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "order_items_via_order"       ON public.order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.shop_id = get_my_shop_id() OR o.customer_id = auth.uid())));

-- advance_payments
CREATE POLICY "advance_payments_super_admin"   ON public.advance_payments FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "advance_payments_admin_staff"   ON public.advance_payments FOR ALL    USING (shop_id = get_my_shop_id()) WITH CHECK (shop_id = get_my_shop_id());
CREATE POLICY "advance_payments_customer_own"  ON public.advance_payments FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

-- quotations
CREATE POLICY "quotations_super_admin"  ON public.quotations FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "quotations_admin_all"    ON public.quotations FOR ALL    USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin') WITH CHECK (shop_id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "quotations_customer_own" ON public.quotations FOR SELECT USING (customer_id = auth.uid());

-- gallery
CREATE POLICY "gallery_super_admin"  ON public.gallery FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "gallery_admin_all"    ON public.gallery FOR ALL    USING (shop_id = get_my_shop_id()) WITH CHECK (shop_id = get_my_shop_id());
CREATE POLICY "gallery_public_read"  ON public.gallery FOR SELECT USING (true);

-- reviews
CREATE POLICY "reviews_super_admin"         ON public.reviews FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "reviews_admin_manage"        ON public.reviews FOR ALL    USING (shop_id = get_my_shop_id()) WITH CHECK (shop_id = get_my_shop_id());
CREATE POLICY "reviews_public_read_approved" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "reviews_customer_insert"     ON public.reviews FOR INSERT WITH CHECK (customer_id = auth.uid());

-- wishlists
CREATE POLICY "wishlists_customer_own" ON public.wishlists FOR ALL    USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "wishlists_admin_read"   ON public.wishlists FOR SELECT USING (shop_id = get_my_shop_id());

-- recently_viewed
CREATE POLICY "recently_viewed_customer_own" ON public.recently_viewed FOR ALL USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());

-- inquiries
CREATE POLICY "inquiries_super_admin"   ON public.inquiries FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "inquiries_admin_manage"  ON public.inquiries FOR ALL    USING (shop_id = get_my_shop_id()) WITH CHECK (shop_id = get_my_shop_id());
CREATE POLICY "inquiries_public_insert" ON public.inquiries FOR INSERT WITH CHECK (true);

-- whatsapp_templates / email_templates
CREATE POLICY "wa_templates_admin_all"    ON public.whatsapp_templates FOR ALL USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());
CREATE POLICY "email_templates_admin_all" ON public.email_templates    FOR ALL USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());

-- newsletter_subscribers
CREATE POLICY "newsletter_admin_all"      ON public.newsletter_subscribers FOR ALL    USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());
CREATE POLICY "newsletter_public_insert"  ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

-- notifications
CREATE POLICY "notifications_super_admin"   ON public.notifications FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "notifications_admin_shop"    ON public.notifications FOR ALL    USING (shop_id = get_my_shop_id()) WITH CHECK (shop_id = get_my_shop_id());
CREATE POLICY "notifications_customer_own"  ON public.notifications FOR SELECT USING (target_user_id = auth.uid());

-- fcm_subscriptions
CREATE POLICY "fcm_user_own"       ON public.fcm_subscriptions FOR ALL    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "fcm_admin_read_shop" ON public.fcm_subscriptions FOR SELECT USING (shop_id = get_my_shop_id());

-- scheduled_notifications / festival_campaigns
CREATE POLICY "scheduled_notifs_admin"   ON public.scheduled_notifications FOR ALL USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());
CREATE POLICY "festival_campaigns_admin" ON public.festival_campaigns      FOR ALL USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());

-- staff
CREATE POLICY "staff_super_admin"   ON public.staff FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "staff_admin_manage"  ON public.staff FOR ALL    USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin') WITH CHECK (shop_id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "staff_read_own"      ON public.staff FOR SELECT USING (user_id = auth.uid());

-- login_history
CREATE POLICY "login_history_super_admin" ON public.login_history FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "login_history_own"         ON public.login_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "login_history_admin_shop"  ON public.login_history FOR SELECT USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin');

-- two_factor_auth
CREATE POLICY "2fa_own"         ON public.two_factor_auth FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "2fa_super_admin" ON public.two_factor_auth FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ip_restrictions
CREATE POLICY "ip_restrictions_admin" ON public.ip_restrictions FOR ALL
  USING (is_super_admin() OR (shop_id = get_my_shop_id() AND get_my_role() = 'admin'))
  WITH CHECK (is_super_admin() OR (shop_id = get_my_shop_id() AND get_my_role() = 'admin'));

-- audit_logs / activity_logs
CREATE POLICY "audit_logs_super_admin"    ON public.audit_logs FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "audit_logs_admin_read"     ON public.audit_logs FOR SELECT USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "audit_logs_insert_service" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "activity_logs_admin_all"   ON public.activity_logs FOR ALL USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());

-- marketing_settings
CREATE POLICY "marketing_admin_all"   ON public.marketing_settings FOR ALL    USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());
CREATE POLICY "marketing_public_read" ON public.marketing_settings FOR SELECT USING (true);

-- domain_mappings
CREATE POLICY "domain_super_admin"    ON public.domain_mappings FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "domain_admin_read_own" ON public.domain_mappings FOR SELECT USING (shop_id = get_my_shop_id());

-- cloudinary_settings / cloudinary_usage
CREATE POLICY "cloudinary_super_admin"  ON public.cloudinary_settings FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "cloudinary_admin_own"    ON public.cloudinary_settings FOR ALL USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin') WITH CHECK (shop_id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "cloudinary_usage_admin"  ON public.cloudinary_usage    FOR ALL USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());

-- pwa_settings
CREATE POLICY "pwa_admin_all"   ON public.pwa_settings FOR ALL    USING (is_super_admin() OR shop_id = get_my_shop_id()) WITH CHECK (is_super_admin() OR shop_id = get_my_shop_id());
CREATE POLICY "pwa_public_read" ON public.pwa_settings FOR SELECT USING (true);

-- shop_backups / shop_clone_history
CREATE POLICY "backups_super_admin"       ON public.shop_backups       FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "backups_admin_own"         ON public.shop_backups       FOR ALL    USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin') WITH CHECK (shop_id = get_my_shop_id() AND get_my_role() = 'admin');
CREATE POLICY "clone_history_super_admin" ON public.shop_clone_history FOR ALL    USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "clone_history_admin_read"  ON public.shop_clone_history FOR SELECT USING (source_shop_id = get_my_shop_id() OR target_shop_id = get_my_shop_id());

-- ============================================================
-- STEP 11: Seed data + utility functions
-- ============================================================
INSERT INTO public.subscription_plans
  (name, display_name, price, billing_cycle, duration_days, max_products, max_staff, features, sort_order)
VALUES
  ('trial','Free Trial',0,'one_time',14,10,0,
   '{"custom_domain":false,"bulk_import":false,"invoice_pdf":false,"quotation":false,"full_seo":false,"google_analytics":false,"facebook_pixel":false,"campaigns":false,"bulk_notifications":false,"two_fa":false,"ip_restrictions":false,"shop_backup":false,"clone_shop":false,"reports_excel":false,"cloudinary_own":false}'::jsonb,
   1),
  ('basic','Basic',999,'monthly',30,50,2,
   '{"custom_domain":false,"bulk_import":true,"invoice_pdf":true,"quotation":true,"full_seo":true,"google_analytics":true,"facebook_pixel":false,"campaigns":false,"bulk_notifications":false,"two_fa":false,"ip_restrictions":false,"shop_backup":false,"clone_shop":false,"reports_excel":false,"cloudinary_own":true}'::jsonb,
   2),
  ('premium','Premium',2499,'monthly',30,-1,10,
   '{"custom_domain":true,"bulk_import":true,"invoice_pdf":true,"quotation":true,"full_seo":true,"google_analytics":true,"facebook_pixel":true,"campaigns":true,"bulk_notifications":true,"two_fa":true,"ip_restrictions":true,"shop_backup":true,"clone_shop":true,"reports_excel":true,"cloudinary_own":true}'::jsonb,
   3)
ON CONFLICT (name) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  price         = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  max_products  = EXCLUDED.max_products,
  max_staff     = EXCLUDED.max_staff,
  features      = EXCLUDED.features,
  updated_at    = NOW();

CREATE OR REPLACE FUNCTION public.setup_new_shop(
  p_shop_id UUID, p_shop_name TEXT,
  p_cloud_name TEXT, p_cloud_api_key TEXT, p_cloud_secret TEXT
)
RETURNS VOID AS $$
DECLARE v_trial_plan_id UUID;
BEGIN
  INSERT INTO public.shop_settings (shop_id) VALUES (p_shop_id) ON CONFLICT (shop_id) DO NOTHING;
  INSERT INTO public.marketing_settings (shop_id) VALUES (p_shop_id) ON CONFLICT (shop_id) DO NOTHING;
  INSERT INTO public.pwa_settings (shop_id, app_name, short_name, theme_color, background_color)
    VALUES (p_shop_id, p_shop_name, LEFT(p_shop_name,12), '#ff6b00', '#ffffff') ON CONFLICT (shop_id) DO NOTHING;
  INSERT INTO public.cloudinary_settings (shop_id, cloud_name, api_key, api_secret)
    VALUES (p_shop_id, p_cloud_name, p_cloud_api_key, p_cloud_secret) ON CONFLICT (shop_id) DO NOTHING;

  SELECT id INTO v_trial_plan_id FROM public.subscription_plans WHERE name = 'trial' LIMIT 1;
  INSERT INTO public.shop_subscriptions (shop_id, plan_id, started_at, expires_at, status)
    VALUES (p_shop_id, v_trial_plan_id, NOW(), NOW() + INTERVAL '14 days', 'trial') ON CONFLICT (shop_id) DO NOTHING;

  INSERT INTO public.whatsapp_templates (shop_id, name, template, type) VALUES
    (p_shop_id,'Order Confirmed','नमस्कार {customer_name}! 🙏 तुमची Order #{order_number} confirm झाली आहे. {shop_name} मध्ये Order केल्याबद्दल धन्यवाद! अधिक माहितीसाठी: {whatsapp}','order_confirm'),
    (p_shop_id,'Murti Ready','नमस्कार {customer_name}! 🎉 तुमची Ganesh Murti (Order #{order_number}) तयार आहे. कृपया {pickup_date} ला Pickup करावी. {shop_name} - {whatsapp}','ready'),
    (p_shop_id,'Delivery Update','नमस्कार {customer_name}! 🚚 तुमची Order #{order_number} {delivery_date} ला Deliver होईल. {shop_name} - {whatsapp}','delivery')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.categories (shop_id, name, slug, sort_order) VALUES
    (p_shop_id,'Eco Friendly','eco-friendly',1),(p_shop_id,'Shadu Mati','shadu-mati',2),
    (p_shop_id,'Plaster of Paris','plaster-of-paris',3),(p_shop_id,'Clay Ganesh','clay-ganesh',4),
    (p_shop_id,'Decorative','decorative',5)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.suspend_expired_shops()
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.shops SET status = 'suspended', updated_at = NOW()
  WHERE id IN (SELECT shop_id FROM public.shop_subscriptions WHERE expires_at < NOW() AND status IN ('trial','active'))
    AND status = 'active';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.shop_subscriptions SET status = 'expired', updated_at = NOW()
  WHERE expires_at < NOW() AND status IN ('trial','active');
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_shops_needing_renewal_reminder()
RETURNS TABLE(shop_id UUID, expires_at TIMESTAMPTZ, days_left INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT ss.shop_id, ss.expires_at,
    EXTRACT(DAY FROM ss.expires_at - NOW())::INTEGER AS days_left
  FROM public.shop_subscriptions ss
  WHERE ss.status IN ('trial','active')
    AND ss.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND ss.renewal_reminder_sent = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DONE! 36 tables + RLS + functions. Run succeeded!
-- ============================================================
