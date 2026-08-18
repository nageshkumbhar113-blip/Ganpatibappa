-- ============================================================
-- 011_orders_payment_method_cash.sql
-- The shop checkout UI (app/(shop)/checkout/page.tsx and
-- app/shop/[shopSlug]/checkout/page.tsx) has always offered "Cash" as a selectable
-- payment method, and the order-creation API's Zod schema accepts payment_method
-- 'cash' — but orders.payment_method's CHECK constraint never allowed 'cash',
-- so any customer choosing Cash at checkout had their order insert fail outright
-- (DB constraint violation -> 500). Bring the constraint in line with what the
-- app has always allowed (advance_payments.payment_method already includes 'cash').
-- ============================================================

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('upi', 'qr', 'cod', 'partial', 'bank_transfer', 'cash'));
