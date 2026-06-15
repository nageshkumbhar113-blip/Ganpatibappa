-- ============================================================
-- 007_rls_policies.sql
-- Row Level Security Policies for all 36 tables
-- Pattern:
--   super_admin → full access to everything
--   admin/staff → only their shop's data
--   customer    → read-only on active/public data
--   public      → minimal read access for shop home
-- ============================================================

-- ============================================================
-- ENABLE RLS on all tables
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
-- shops
-- ============================================================
CREATE POLICY "shops_super_admin_all" ON public.shops
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "shops_admin_read_own" ON public.shops
  FOR SELECT USING (
    owner_id = auth.uid() OR id = get_my_shop_id()
  );

CREATE POLICY "shops_admin_update_own" ON public.shops
  FOR UPDATE USING (
    id = get_my_shop_id() AND get_my_role() = 'admin'
  ) WITH CHECK (
    id = get_my_shop_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "shops_public_read_active" ON public.shops
  FOR SELECT USING (status = 'active');

-- ============================================================
-- shop_settings
-- ============================================================
CREATE POLICY "shop_settings_super_admin" ON public.shop_settings
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "shop_settings_admin_all" ON public.shop_settings
  FOR ALL USING (shop_id = get_my_shop_id())
  WITH CHECK (shop_id = get_my_shop_id());

CREATE POLICY "shop_settings_public_read" ON public.shop_settings
  FOR SELECT USING (true);

-- ============================================================
-- users
-- ============================================================
CREATE POLICY "users_super_admin_all" ON public.users
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "users_admin_read_shop_members" ON public.users
  FOR SELECT USING (
    get_my_role() IN ('admin', 'staff') AND shop_id = get_my_shop_id()
  );

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================
-- subscription_plans (read-only for all authenticated users)
-- ============================================================
CREATE POLICY "sub_plans_super_admin_all" ON public.subscription_plans
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "sub_plans_authenticated_read" ON public.subscription_plans
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- ============================================================
-- shop_subscriptions
-- ============================================================
CREATE POLICY "shop_subs_super_admin_all" ON public.shop_subscriptions
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "shop_subs_admin_read_own" ON public.shop_subscriptions
  FOR SELECT USING (shop_id = get_my_shop_id());

-- ============================================================
-- categories
-- ============================================================
CREATE POLICY "categories_super_admin_all" ON public.categories
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL USING (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  ) WITH CHECK (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "categories_staff_products" ON public.categories
  FOR ALL USING (
    shop_id = get_my_shop_id()
    AND has_staff_permission(shop_id, 'products')
  );

CREATE POLICY "categories_public_read_active" ON public.categories
  FOR SELECT USING (is_active = true);

-- ============================================================
-- products
-- ============================================================
CREATE POLICY "products_super_admin_all" ON public.products
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  ) WITH CHECK (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "products_staff_manage" ON public.products
  FOR ALL USING (
    shop_id = get_my_shop_id()
    AND has_staff_permission(shop_id, 'products')
  );

CREATE POLICY "products_public_read_active" ON public.products
  FOR SELECT USING (is_active = true);

-- ============================================================
-- orders
-- ============================================================
CREATE POLICY "orders_super_admin_all" ON public.orders
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  ) WITH CHECK (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "orders_staff_manage" ON public.orders
  FOR ALL USING (
    shop_id = get_my_shop_id()
    AND has_staff_permission(shop_id, 'orders')
  );

CREATE POLICY "orders_customer_own" ON public.orders
  FOR ALL USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ============================================================
-- order_items (follows order access)
-- ============================================================
CREATE POLICY "order_items_super_admin_all" ON public.order_items
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "order_items_via_order" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (
          o.shop_id = get_my_shop_id()
          OR o.customer_id = auth.uid()
        )
    )
  );

-- ============================================================
-- advance_payments
-- ============================================================
CREATE POLICY "advance_payments_super_admin" ON public.advance_payments
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "advance_payments_admin_staff" ON public.advance_payments
  FOR ALL USING (shop_id = get_my_shop_id())
  WITH CHECK (shop_id = get_my_shop_id());

CREATE POLICY "advance_payments_customer_own" ON public.advance_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = auth.uid()
    )
  );

-- ============================================================
-- quotations
-- ============================================================
CREATE POLICY "quotations_super_admin" ON public.quotations
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "quotations_admin_all" ON public.quotations
  FOR ALL USING (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  ) WITH CHECK (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "quotations_customer_own" ON public.quotations
  FOR SELECT USING (customer_id = auth.uid());

-- ============================================================
-- gallery (public read, admin/staff write)
-- ============================================================
CREATE POLICY "gallery_super_admin" ON public.gallery
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "gallery_admin_all" ON public.gallery
  FOR ALL USING (shop_id = get_my_shop_id())
  WITH CHECK (shop_id = get_my_shop_id());

CREATE POLICY "gallery_public_read" ON public.gallery
  FOR SELECT USING (true);

-- ============================================================
-- reviews
-- ============================================================
CREATE POLICY "reviews_super_admin" ON public.reviews
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "reviews_admin_manage" ON public.reviews
  FOR ALL USING (shop_id = get_my_shop_id())
  WITH CHECK (shop_id = get_my_shop_id());

CREATE POLICY "reviews_public_read_approved" ON public.reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "reviews_customer_insert" ON public.reviews
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- ============================================================
-- wishlists
-- ============================================================
CREATE POLICY "wishlists_customer_own" ON public.wishlists
  FOR ALL USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "wishlists_admin_read" ON public.wishlists
  FOR SELECT USING (shop_id = get_my_shop_id());

-- ============================================================
-- recently_viewed
-- ============================================================
CREATE POLICY "recently_viewed_customer_own" ON public.recently_viewed
  FOR ALL USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- ============================================================
-- inquiries
-- ============================================================
CREATE POLICY "inquiries_super_admin" ON public.inquiries
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "inquiries_admin_manage" ON public.inquiries
  FOR ALL USING (shop_id = get_my_shop_id())
  WITH CHECK (shop_id = get_my_shop_id());

CREATE POLICY "inquiries_public_insert" ON public.inquiries
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- whatsapp_templates / email_templates
-- ============================================================
CREATE POLICY "wa_templates_admin_all" ON public.whatsapp_templates
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

CREATE POLICY "email_templates_admin_all" ON public.email_templates
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

-- ============================================================
-- newsletter_subscribers
-- ============================================================
CREATE POLICY "newsletter_admin_all" ON public.newsletter_subscribers
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

CREATE POLICY "newsletter_public_insert" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- notifications
-- ============================================================
CREATE POLICY "notifications_super_admin" ON public.notifications
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "notifications_admin_shop" ON public.notifications
  FOR ALL USING (shop_id = get_my_shop_id())
  WITH CHECK (shop_id = get_my_shop_id());

CREATE POLICY "notifications_customer_own" ON public.notifications
  FOR SELECT USING (target_user_id = auth.uid());

-- ============================================================
-- fcm_subscriptions
-- ============================================================
CREATE POLICY "fcm_user_own" ON public.fcm_subscriptions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fcm_admin_read_shop" ON public.fcm_subscriptions
  FOR SELECT USING (shop_id = get_my_shop_id());

-- ============================================================
-- scheduled_notifications / festival_campaigns (admin only)
-- ============================================================
CREATE POLICY "scheduled_notifs_admin" ON public.scheduled_notifications
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

CREATE POLICY "festival_campaigns_admin" ON public.festival_campaigns
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

-- ============================================================
-- staff
-- ============================================================
CREATE POLICY "staff_super_admin" ON public.staff
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "staff_admin_manage" ON public.staff
  FOR ALL USING (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  ) WITH CHECK (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "staff_read_own" ON public.staff
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- login_history
-- ============================================================
CREATE POLICY "login_history_super_admin" ON public.login_history
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "login_history_own" ON public.login_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "login_history_admin_shop" ON public.login_history
  FOR SELECT USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin');

-- ============================================================
-- two_factor_auth (private per user)
-- ============================================================
CREATE POLICY "2fa_own" ON public.two_factor_auth
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "2fa_super_admin" ON public.two_factor_auth
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============================================================
-- ip_restrictions
-- ============================================================
CREATE POLICY "ip_restrictions_admin" ON public.ip_restrictions
  FOR ALL USING (
    is_super_admin() OR (
      shop_id = get_my_shop_id() AND get_my_role() = 'admin'
    )
  ) WITH CHECK (
    is_super_admin() OR (
      shop_id = get_my_shop_id() AND get_my_role() = 'admin'
    )
  );

-- ============================================================
-- audit_logs / activity_logs (read-only for admin)
-- ============================================================
CREATE POLICY "audit_logs_super_admin" ON public.audit_logs
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT USING (shop_id = get_my_shop_id() AND get_my_role() = 'admin');

CREATE POLICY "audit_logs_insert_service" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "activity_logs_admin_all" ON public.activity_logs
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

-- ============================================================
-- marketing_settings (admin only)
-- ============================================================
CREATE POLICY "marketing_admin_all" ON public.marketing_settings
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

CREATE POLICY "marketing_public_read" ON public.marketing_settings
  FOR SELECT USING (true);

-- ============================================================
-- domain_mappings
-- ============================================================
CREATE POLICY "domain_super_admin" ON public.domain_mappings
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "domain_admin_read_own" ON public.domain_mappings
  FOR SELECT USING (shop_id = get_my_shop_id());

-- ============================================================
-- cloudinary_settings (admin only — api_secret is sensitive)
-- ============================================================
CREATE POLICY "cloudinary_super_admin" ON public.cloudinary_settings
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "cloudinary_admin_own" ON public.cloudinary_settings
  FOR ALL USING (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  ) WITH CHECK (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  );

-- cloudinary_usage
CREATE POLICY "cloudinary_usage_admin" ON public.cloudinary_usage
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

-- ============================================================
-- pwa_settings (public read needed for manifest API)
-- ============================================================
CREATE POLICY "pwa_admin_all" ON public.pwa_settings
  FOR ALL USING (
    is_super_admin() OR shop_id = get_my_shop_id()
  ) WITH CHECK (
    is_super_admin() OR shop_id = get_my_shop_id()
  );

CREATE POLICY "pwa_public_read" ON public.pwa_settings
  FOR SELECT USING (true);

-- ============================================================
-- shop_backups / shop_clone_history
-- ============================================================
CREATE POLICY "backups_super_admin" ON public.shop_backups
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "backups_admin_own" ON public.shop_backups
  FOR ALL USING (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  ) WITH CHECK (
    shop_id = get_my_shop_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "clone_history_super_admin" ON public.shop_clone_history
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "clone_history_admin_read" ON public.shop_clone_history
  FOR SELECT USING (
    source_shop_id = get_my_shop_id() OR target_shop_id = get_my_shop_id()
  );
