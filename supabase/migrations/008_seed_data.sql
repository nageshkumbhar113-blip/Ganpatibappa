-- ============================================================
-- 008_seed_data.sql
-- Default Subscription Plans + Shop Setup Function
-- ============================================================

-- ============================================================
-- DEFAULT SUBSCRIPTION PLANS
-- ============================================================
INSERT INTO public.subscription_plans
  (name, display_name, price, billing_cycle, duration_days,
   max_products, max_staff, features, sort_order)
VALUES
  (
    'trial',
    'Free Trial',
    0,
    'one_time',
    14,
    10,
    0,
    '{
      "custom_domain":       false,
      "bulk_import":         false,
      "invoice_pdf":         false,
      "quotation":           false,
      "full_seo":            false,
      "google_analytics":    false,
      "facebook_pixel":      false,
      "campaigns":           false,
      "bulk_notifications":  false,
      "two_fa":              false,
      "ip_restrictions":     false,
      "shop_backup":         false,
      "clone_shop":          false,
      "reports_excel":       false,
      "cloudinary_own":      false
    }'::jsonb,
    1
  ),
  (
    'basic',
    'Basic',
    999,
    'monthly',
    30,
    50,
    2,
    '{
      "custom_domain":       false,
      "bulk_import":         true,
      "invoice_pdf":         true,
      "quotation":           true,
      "full_seo":            true,
      "google_analytics":    true,
      "facebook_pixel":      false,
      "campaigns":           false,
      "bulk_notifications":  false,
      "two_fa":              false,
      "ip_restrictions":     false,
      "shop_backup":         false,
      "clone_shop":          false,
      "reports_excel":       false,
      "cloudinary_own":      true
    }'::jsonb,
    2
  ),
  (
    'premium',
    'Premium',
    2499,
    'monthly',
    30,
    -1,
    10,
    '{
      "custom_domain":       true,
      "bulk_import":         true,
      "invoice_pdf":         true,
      "quotation":           true,
      "full_seo":            true,
      "google_analytics":    true,
      "facebook_pixel":      true,
      "campaigns":           true,
      "bulk_notifications":  true,
      "two_fa":              true,
      "ip_restrictions":     true,
      "shop_backup":         true,
      "clone_shop":          true,
      "reports_excel":       true,
      "cloudinary_own":      true
    }'::jsonb,
    3
  )
ON CONFLICT (name) DO UPDATE SET
  display_name   = EXCLUDED.display_name,
  price          = EXCLUDED.price,
  duration_days  = EXCLUDED.duration_days,
  max_products   = EXCLUDED.max_products,
  max_staff      = EXCLUDED.max_staff,
  features       = EXCLUDED.features,
  updated_at     = NOW();

-- ============================================================
-- FUNCTION: setup_new_shop
-- Called after a Super Admin creates a new shop.
-- Auto-creates: shop_settings, marketing_settings,
-- pwa_settings, cloudinary_settings, subscription (trial),
-- default WhatsApp templates
-- ============================================================
CREATE OR REPLACE FUNCTION public.setup_new_shop(
  p_shop_id        UUID,
  p_shop_name      TEXT,
  p_cloud_name     TEXT,
  p_cloud_api_key  TEXT,
  p_cloud_secret   TEXT
)
RETURNS VOID AS $$
DECLARE
  v_trial_plan_id UUID;
BEGIN
  -- shop_settings
  INSERT INTO public.shop_settings (shop_id)
  VALUES (p_shop_id)
  ON CONFLICT (shop_id) DO NOTHING;

  -- marketing_settings
  INSERT INTO public.marketing_settings (shop_id)
  VALUES (p_shop_id)
  ON CONFLICT (shop_id) DO NOTHING;

  -- pwa_settings
  INSERT INTO public.pwa_settings
    (shop_id, app_name, short_name, theme_color, background_color)
  VALUES
    (p_shop_id, p_shop_name, LEFT(p_shop_name, 12), '#ff6b00', '#ffffff')
  ON CONFLICT (shop_id) DO NOTHING;

  -- cloudinary_settings
  INSERT INTO public.cloudinary_settings
    (shop_id, cloud_name, api_key, api_secret)
  VALUES
    (p_shop_id, p_cloud_name, p_cloud_api_key, p_cloud_secret)
  ON CONFLICT (shop_id) DO NOTHING;

  -- trial subscription
  SELECT id INTO v_trial_plan_id
  FROM public.subscription_plans WHERE name = 'trial' LIMIT 1;

  INSERT INTO public.shop_subscriptions
    (shop_id, plan_id, started_at, expires_at, status)
  VALUES
    (
      p_shop_id,
      v_trial_plan_id,
      NOW(),
      NOW() + INTERVAL '14 days',
      'trial'
    )
  ON CONFLICT (shop_id) DO NOTHING;

  -- Default WhatsApp templates
  INSERT INTO public.whatsapp_templates (shop_id, name, template, type) VALUES
    (
      p_shop_id,
      'Order Confirmed',
      'नमस्कार {customer_name}! 🙏 तुमची Order #{order_number} confirm झाली आहे. {shop_name} मध्ये Order केल्याबद्दल धन्यवाद! अधिक माहितीसाठी: {whatsapp}',
      'order_confirm'
    ),
    (
      p_shop_id,
      'Murti Ready',
      'नमस्कार {customer_name}! 🎉 तुमची Ganesh Murti (Order #{order_number}) तयार आहे. कृपया {pickup_date} ला Pickup करावी. {shop_name} - {whatsapp}',
      'ready'
    ),
    (
      p_shop_id,
      'Delivery Update',
      'नमस्कार {customer_name}! 🚚 तुमची Order #{order_number} {delivery_date} ला Deliver होईल. {shop_name} - {whatsapp}',
      'delivery'
    )
  ON CONFLICT DO NOTHING;

  -- Default categories
  INSERT INTO public.categories (shop_id, name, slug, sort_order) VALUES
    (p_shop_id, 'Eco Friendly',    'eco-friendly',    1),
    (p_shop_id, 'Shadu Mati',      'shadu-mati',      2),
    (p_shop_id, 'Plaster of Paris','plaster-of-paris', 3),
    (p_shop_id, 'Clay Ganesh',     'clay-ganesh',     4),
    (p_shop_id, 'Decorative',      'decorative',      5)
  ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: check_and_suspend_expired_shops
-- Run this via a cron job daily
-- ============================================================
CREATE OR REPLACE FUNCTION public.suspend_expired_shops()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Suspend shops with expired subscriptions
  UPDATE public.shops
  SET status = 'suspended', updated_at = NOW()
  WHERE id IN (
    SELECT shop_id FROM public.shop_subscriptions
    WHERE expires_at < NOW()
      AND status IN ('trial', 'active')
  )
  AND status = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Mark subscriptions as expired
  UPDATE public.shop_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE expires_at < NOW()
    AND status IN ('trial', 'active');

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: mark_renewal_reminders
-- Run this via a cron job daily — marks shops expiring in 7 days
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_shops_needing_renewal_reminder()
RETURNS TABLE(shop_id UUID, expires_at TIMESTAMPTZ, days_left INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.shop_id,
    ss.expires_at,
    EXTRACT(DAY FROM ss.expires_at - NOW())::INTEGER AS days_left
  FROM public.shop_subscriptions ss
  WHERE ss.status IN ('trial', 'active')
    AND ss.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    AND ss.renewal_reminder_sent = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
