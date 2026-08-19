-- ============================================================
-- 015_reviews_order_link.sql
--
-- Reviews were completely broken: the POST insert in
-- app/api/shop/reviews/route.ts never set customer_name, which is
-- NOT NULL with no default -- every single review submission attempt
-- failed at the database level (customer submission has never worked,
-- for any shop, ever). Separately, there is no customer signup/login
-- anywhere in this app (checkout is guest-only), so the login-gated
-- design (customer_id = auth.uid()) could never have worked either --
-- reviews_customer_insert's RLS check can never be satisfied by a
-- guest request.
--
-- Fix: reviews are now submitted from a specific delivered order (the
-- same phone+order_number "track my order" flow used for guest order
-- lookup), verified server-side with the admin client (bypasses RLS by
-- design, same trust model as the now-public order confirmation page).
-- customer_name comes from the order itself. order_id is added here so
-- one order+product combo can be deviewed at most once, and so a
-- review can show a "verified purchase" provenance later without
-- needing a login system.
-- ============================================================

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_product_unique
  ON public.reviews(order_id, product_id)
  WHERE order_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
