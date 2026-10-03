-- Special Offers: admin-managed homepage promo cards linked to a menu category

CREATE TABLE IF NOT EXISTS public.special_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'all',
  badge text NOT NULL DEFAULT '',
  badge_color text NOT NULL DEFAULT '#7a2a3a',
  active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offers_public_read ON public.special_offers;
CREATE POLICY offers_public_read ON public.special_offers
  FOR SELECT TO anon, authenticated
  USING (active = true OR public.is_admin());

DROP POLICY IF EXISTS offers_admin_all ON public.special_offers;
CREATE POLICY offers_admin_all ON public.special_offers
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed with the two existing hardcoded offers (only if table is empty)
INSERT INTO public.special_offers (title, description, image, category, badge, badge_color, sort)
SELECT * FROM (VALUES
  ('Arepa 2×1 Tuesdays','Buy any Arepa and get the second one for free! Venezuelan traditions meant for sharing.','https://images.unsplash.com/photo-1634750188038-d0f806ebe6c5','arepa','Every Tuesday','#2a7a8a',0),
  ('Bundle Deals','Mix & match 5 pastries + 2 coffees for only $25. Perfect for your afternoon merienda.','https://img.rocket.new/generatedImages/rocket_gen_img_104c93e91-1772214527119.png','sweet','Summer Deal','#7a6a2a',1)
) AS v(title,description,image,category,badge,badge_color,sort)
WHERE NOT EXISTS (SELECT 1 FROM public.special_offers);
