-- ============================================================
-- 005_security_logs.sql
-- Staff, Login History, 2FA, IP Restrictions,
-- Audit Logs, Activity Logs
-- ============================================================

-- ============================================================
-- TABLE: staff
-- Additional staff members under an Admin
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'employee'
                          CHECK (role IN ('manager', 'employee')),
  -- Granular permissions (each boolean):
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

CREATE INDEX idx_staff_shop_id ON public.staff(shop_id);
CREATE INDEX idx_staff_user_id ON public.staff(user_id);

-- ============================================================
-- TABLE: login_history
-- Every login attempt (success & failure) is recorded
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id         UUID        REFERENCES public.shops(id) ON DELETE SET NULL,
  ip_address      INET,
  user_agent      TEXT,
  location        TEXT,
  status          TEXT        NOT NULL DEFAULT 'success'
                              CHECK (status IN ('success', 'failed', 'blocked', '2fa_required')),
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_history_user_id
  ON public.login_history(user_id, created_at DESC);
CREATE INDEX idx_login_history_shop_id
  ON public.login_history(shop_id);
CREATE INDEX idx_login_history_ip
  ON public.login_history(ip_address);

-- ============================================================
-- TABLE: two_factor_auth
-- TOTP 2FA per user (Google Authenticator compatible)
-- ============================================================
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

-- ============================================================
-- TABLE: ip_restrictions
-- Admin can allow/block specific IP addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ip_restrictions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  ip_address  INET        NOT NULL,
  action      TEXT        NOT NULL DEFAULT 'block'
                          CHECK (action IN ('allow', 'block')),
  note        TEXT,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, ip_address)
);

CREATE INDEX idx_ip_restrictions_shop_id ON public.ip_restrictions(shop_id);

-- ============================================================
-- TABLE: audit_logs
-- Full audit trail: who changed what, old value vs new value
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        REFERENCES public.shops(id) ON DELETE SET NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_id    UUID        REFERENCES public.staff(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_shop_id
  ON public.audit_logs(shop_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id
  ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name
  ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

-- ============================================================
-- TABLE: activity_logs
-- Human-readable action log per shop
-- e.g. "Nagesh added product 'Ganesha 12 inch'"
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'general'
                          CHECK (category IN (
                            'product', 'order', 'customer', 'settings',
                            'payment', 'staff', 'security', 'general'
                          )),
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_shop_id
  ON public.activity_logs(shop_id, created_at DESC);
CREATE INDEX idx_activity_logs_category
  ON public.activity_logs(category);
