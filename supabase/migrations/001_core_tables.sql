-- ============================================================
-- 001_core_tables.sql
-- Extensions, Helper Functions, Shops, Users
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- HELPER: auto-update updated_at on every UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- HELPER FUNCTIONS for RLS
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

-- ============================================================
-- TABLE: shops
-- Core tenant record — one row per vendor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shops (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        UNIQUE NOT NULL,
  name        TEXT        NOT NULL,
  owner_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  logo_url    TEXT,
  banner_url  TEXT,
  whatsapp    TEXT,
  address     TEXT,
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'suspended', 'deleted')),
  domain      TEXT        UNIQUE,
  subdomain   TEXT        UNIQUE,
  theme_config JSONB      NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_shops_updated_at
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_shops_slug       ON public.shops(slug);
CREATE INDEX idx_shops_domain     ON public.shops(domain);
CREATE INDEX idx_shops_subdomain  ON public.shops(subdomain);
CREATE INDEX idx_shops_owner_id   ON public.shops(owner_id);
CREATE INDEX idx_shops_status     ON public.shops(status);

-- ============================================================
-- TABLE: shop_settings
-- Extended settings per shop (1-to-1 with shops)
-- ============================================================
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

-- ============================================================
-- TABLE: users
-- Extends Supabase auth.users with role + shop context
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'customer'
                          CHECK (role IN ('super_admin', 'admin', 'staff', 'customer')),
  shop_id     UUID        REFERENCES public.shops(id) ON DELETE SET NULL,
  name        TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  fcm_token   TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_users_shop_id ON public.users(shop_id);
CREATE INDEX idx_users_role    ON public.users(role);
CREATE INDEX idx_users_email   ON public.users(email);

-- ============================================================
-- TRIGGER: auto-insert into public.users on Supabase signup
-- ============================================================
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
