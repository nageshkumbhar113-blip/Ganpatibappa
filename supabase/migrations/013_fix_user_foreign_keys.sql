-- ============================================================
-- 013_fix_user_foreign_keys.sql
--
-- staff, audit_logs, login_history and reviews all point their user
-- column at auth.users(id), but every API route embeds the profile via
-- PostgREST as `users(name, email, ...)`, which resolves against
-- public.users. With no FK to public.users, PostgREST answers PGRST200
-- ("Could not find a relationship ... in the schema cache"), the route's
-- catch block swallows it, and the Staff / Security / Reviews screens all
-- fail — Staff and Security misleadingly as "401 Unauthorized".
--
-- public.users.id is itself a FK to auth.users(id) (see 001_core_tables),
-- so these columns already hold valid public.users ids; adding the second
-- FK is safe and is what makes the embed resolvable.
-- ============================================================

-- staff.user_id → public.users(id)
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_user_id_public_users_fkey;
ALTER TABLE public.staff
  ADD CONSTRAINT staff_user_id_public_users_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- audit_logs.user_id → public.users(id)
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_public_users_fkey;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_public_users_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- login_history.user_id → public.users(id)
ALTER TABLE public.login_history DROP CONSTRAINT IF EXISTS login_history_user_id_public_users_fkey;
ALTER TABLE public.login_history
  ADD CONSTRAINT login_history_user_id_public_users_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- reviews.customer_id → public.users(id)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_customer_id_public_users_fkey;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_customer_id_public_users_fkey
  FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
