-- Add Google Maps URL field to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS maps_url TEXT;

-- Add YouTube video URL to shop_settings
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS youtube_url TEXT;
