-- ============================================================
-- 010_add_category_description.sql
-- The shop-facing category detail page (app/shop/[shopSlug]/categories/[id]/page.tsx)
-- has always selected and rendered `categories.description`, but no prior migration
-- ever added that column — the query has been failing against the real schema
-- ("column categories.description does not exist"), silently breaking the page.
-- ============================================================

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
