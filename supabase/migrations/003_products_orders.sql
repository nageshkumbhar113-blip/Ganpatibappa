-- ============================================================
-- 003_products_orders.sql
-- Categories, Products, Orders, Order Items,
-- Advance Payments, Quotations
-- ============================================================

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  image_url   TEXT,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, slug)
);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_categories_shop_id ON public.categories(shop_id);
CREATE INDEX idx_categories_slug    ON public.categories(slug);

-- ============================================================
-- TABLE: products
-- ============================================================
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

CREATE INDEX idx_products_shop_id     ON public.products(shop_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_is_active   ON public.products(is_active);
CREATE INDEX idx_products_is_featured ON public.products(is_featured);
CREATE INDEX idx_products_slug        ON public.products(slug);
CREATE INDEX idx_products_created_at  ON public.products(created_at DESC);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                  UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id              UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number             TEXT          NOT NULL,
  customer_name            TEXT          NOT NULL,
  customer_phone           TEXT          NOT NULL,
  customer_email           TEXT,
  customer_address         TEXT,
  total_amount             NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  status                   TEXT          NOT NULL DEFAULT 'pending'
                                         CHECK (status IN (
                                           'pending', 'confirmed', 'in_production',
                                           'ready', 'delivered', 'cancelled'
                                         )),
  payment_method           TEXT          NOT NULL DEFAULT 'upi'
                                         CHECK (payment_method IN (
                                           'upi', 'qr', 'cod', 'partial', 'bank_transfer'
                                         )),
  payment_status           TEXT          NOT NULL DEFAULT 'pending'
                                         CHECK (payment_status IN (
                                           'pending', 'partial', 'paid', 'refunded'
                                         )),
  payment_screenshot_url   TEXT,
  pickup_date              DATE,
  delivery_date            DATE,
  notes                    TEXT,
  admin_notes              TEXT,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_orders_shop_id      ON public.orders(shop_id);
CREATE INDEX idx_orders_customer_id  ON public.orders(customer_id);
CREATE INDEX idx_orders_status       ON public.orders(status);
CREATE INDEX idx_orders_created_at   ON public.orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);

-- ============================================================
-- FUNCTION + TRIGGER: auto-generate unique order number
-- Format: {SHOP_PREFIX}{YYYYMMDD}{SEQ4}  e.g. NAG202406010001
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INTEGER;
BEGIN
  SELECT UPPER(LEFT(slug, 3)) INTO v_prefix
  FROM public.shops WHERE id = NEW.shop_id;

  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.orders WHERE shop_id = NEW.shop_id;

  NEW.order_number := v_prefix
    || TO_CHAR(NOW(), 'YYYYMMDD')
    || LPAD(v_seq::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- ============================================================
-- TABLE: order_items
-- ============================================================
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

CREATE INDEX idx_order_items_order_id   ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);

-- ============================================================
-- TABLE: advance_payments
-- Tracks partial/advance payment proofs per order
-- ============================================================
CREATE TABLE IF NOT EXISTS public.advance_payments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  shop_id         UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  payment_method  TEXT          NOT NULL
                                CHECK (payment_method IN ('upi', 'qr', 'bank_transfer', 'cash')),
  screenshot_url  TEXT,
  status          TEXT          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by     UUID          REFERENCES auth.users(id),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_advance_payments_updated_at
  BEFORE UPDATE ON public.advance_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_advance_payments_order_id ON public.advance_payments(order_id);
CREATE INDEX idx_advance_payments_shop_id  ON public.advance_payments(shop_id);

-- ============================================================
-- TABLE: quotations
-- Estimates / Quotations for customers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotations (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID          NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  quotation_number  TEXT          NOT NULL,
  customer_name     TEXT          NOT NULL,
  customer_phone    TEXT          NOT NULL,
  customer_email    TEXT,
  -- items: [{ product_id, product_name, price, quantity, subtotal }]
  items             JSONB         NOT NULL DEFAULT '[]'::jsonb,
  total_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  valid_until       DATE,
  status            TEXT          NOT NULL DEFAULT 'draft'
                                  CHECK (status IN (
                                    'draft', 'sent', 'accepted', 'rejected', 'expired'
                                  )),
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_quotations_shop_id ON public.quotations(shop_id);
CREATE INDEX idx_quotations_status  ON public.quotations(status);

-- Auto-generate quotation number
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_seq    INTEGER;
BEGIN
  SELECT UPPER(LEFT(slug, 3)) INTO v_prefix
  FROM public.shops WHERE id = NEW.shop_id;

  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.quotations WHERE shop_id = NEW.shop_id;

  NEW.quotation_number := 'QT-' || v_prefix
    || TO_CHAR(NOW(), 'YYYYMM')
    || LPAD(v_seq::TEXT, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_quotation_number
  BEFORE INSERT ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.generate_quotation_number();
