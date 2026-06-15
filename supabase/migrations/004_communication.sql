-- ============================================================
-- 004_communication.sql
-- Gallery, Reviews, Wishlists, Recently Viewed,
-- Inquiries, Templates, Newsletter, Notifications,
-- FCM Subscriptions, Scheduled Notifications, Festival Campaigns
-- ============================================================

-- ============================================================
-- TABLE: gallery
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gallery (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  caption     TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gallery_shop_id ON public.gallery(shop_id);

-- ============================================================
-- TABLE: reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id     UUID        REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name  TEXT        NOT NULL,
  rating         INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  is_approved    BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_reviews_shop_id    ON public.reviews(shop_id);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_reviews_approved   ON public.reviews(is_approved);

-- ============================================================
-- TABLE: wishlists
-- Customer product wishlist per shop
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wishlists (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, customer_id, product_id)
);

CREATE INDEX idx_wishlists_customer_id ON public.wishlists(customer_id);
CREATE INDEX idx_wishlists_shop_id     ON public.wishlists(shop_id);

-- ============================================================
-- TABLE: recently_viewed
-- Upserted on every product page visit
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, customer_id, product_id)
);

CREATE INDEX idx_recently_viewed_customer
  ON public.recently_viewed(customer_id, viewed_at DESC);

-- ============================================================
-- TABLE: inquiries
-- Contact form leads + product inquiries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inquiries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  email        TEXT,
  product_id   UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  message      TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'new'
                           CHECK (status IN ('new', 'read', 'replied', 'closed')),
  admin_reply  TEXT,
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_inquiries_shop_id ON public.inquiries(shop_id);
CREATE INDEX idx_inquiries_status  ON public.inquiries(status);

-- ============================================================
-- TABLE: whatsapp_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  template    TEXT        NOT NULL,
  -- Variables: {order_number}, {customer_name}, {status}, {shop_name}, {whatsapp}
  type        TEXT        NOT NULL DEFAULT 'custom'
                          CHECK (type IN (
                            'order_confirm', 'ready', 'delivery',
                            'custom', 'festival', 'reminder'
                          )),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_templates_shop_id ON public.whatsapp_templates(shop_id);

-- ============================================================
-- TABLE: email_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  subject     TEXT        NOT NULL,
  body_html   TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'custom'
                          CHECK (type IN (
                            'order_confirm', 'ready', 'delivery',
                            'newsletter', 'renewal', 'custom'
                          )),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_templates_shop_id ON public.email_templates(shop_id);

-- ============================================================
-- TABLE: newsletter_subscribers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL,
  name              TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at   TIMESTAMPTZ,
  UNIQUE(shop_id, email)
);

CREATE INDEX idx_newsletter_shop_id ON public.newsletter_subscribers(shop_id);

-- ============================================================
-- TABLE: notifications
-- In-app notifications for admin/staff/customer
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  body           TEXT        NOT NULL,
  type           TEXT        NOT NULL DEFAULT 'info'
                             CHECK (type IN (
                               'order', 'payment', 'review', 'inquiry',
                               'system', 'info', 'stock_low', 'renewal'
                             )),
  reference_id   UUID,
  is_read        BOOLEAN     NOT NULL DEFAULT false,
  target_user_id UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_shop_id        ON public.notifications(shop_id);
CREATE INDEX idx_notifications_target_user_id ON public.notifications(target_user_id);
CREATE INDEX idx_notifications_is_read        ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at     ON public.notifications(created_at DESC);

-- ============================================================
-- TABLE: fcm_subscriptions
-- Firebase Cloud Messaging device tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fcm_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token   TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('admin', 'staff', 'customer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

CREATE INDEX idx_fcm_shop_id ON public.fcm_subscriptions(shop_id);
CREATE INDEX idx_fcm_user_id ON public.fcm_subscriptions(user_id);

-- ============================================================
-- TABLE: scheduled_notifications
-- Future-dated push notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  image_url    TEXT,
  target       TEXT        NOT NULL DEFAULT 'all'
                           CHECK (target IN ('all', 'customers', 'admins')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_count   INTEGER     NOT NULL DEFAULT 0,
  created_by   UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_scheduled_notifs_updated_at
  BEFORE UPDATE ON public.scheduled_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_scheduled_notifs_shop_id
  ON public.scheduled_notifications(shop_id);
CREATE INDEX idx_scheduled_notifs_scheduled_at
  ON public.scheduled_notifications(scheduled_at)
  WHERE status = 'pending';

-- ============================================================
-- TABLE: festival_campaigns
-- Multi-channel festival/promotional campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS public.festival_campaigns (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  festival_name     TEXT,
  message           TEXT        NOT NULL,
  image_url         TEXT,
  target_audience   TEXT        NOT NULL DEFAULT 'all'
                                CHECK (target_audience IN ('all', 'customers', 'subscribers')),
  whatsapp_enabled  BOOLEAN     NOT NULL DEFAULT true,
  email_enabled     BOOLEAN     NOT NULL DEFAULT false,
  push_enabled      BOOLEAN     NOT NULL DEFAULT true,
  scheduled_at      TIMESTAMPTZ,
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  sent_count        INTEGER     NOT NULL DEFAULT 0,
  created_by        UUID        REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_festival_campaigns_updated_at
  BEFORE UPDATE ON public.festival_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_festival_campaigns_shop_id ON public.festival_campaigns(shop_id);
CREATE INDEX idx_festival_campaigns_status  ON public.festival_campaigns(status);
