-- ============================================================
-- Migration: menu_items table + availability_rules table
-- ============================================================

-- 1. menu_items: DB-driven menu (synced with customer portal)
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'arepa',
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  alt TEXT NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT true,
  popular BOOLEAN NOT NULL DEFAULT false,
  badges TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  calories INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(available);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_menu_items" ON public.menu_items;
CREATE POLICY "public_read_menu_items"
  ON public.menu_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_menu_items" ON public.menu_items;
CREATE POLICY "admin_manage_menu_items"
  ON public.menu_items FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 2. availability_rules: per-item daily limits + blocked dates
CREATE TABLE IF NOT EXISTS public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  rule_date DATE NOT NULL,
  daily_limit INTEGER NOT NULL DEFAULT 0,
  orders_taken INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_rules_item_date ON public.availability_rules(item_id, rule_date);
CREATE INDEX IF NOT EXISTS idx_availability_rules_date ON public.availability_rules(rule_date);

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_availability_rules" ON public.availability_rules;
CREATE POLICY "public_read_availability_rules"
  ON public.availability_rules FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_availability_rules" ON public.availability_rules;
CREATE POLICY "admin_manage_availability_rules"
  ON public.availability_rules FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 3. blocked_dates: stop ALL orders on specific dates
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_date DATE NOT NULL UNIQUE,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_blocked_dates" ON public.blocked_dates;
CREATE POLICY "public_read_blocked_dates"
  ON public.blocked_dates FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_blocked_dates" ON public.blocked_dates;
CREATE POLICY "admin_manage_blocked_dates"
  ON public.blocked_dates FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- 4. Seed menu_items from static data
DO $$
BEGIN
  INSERT INTO public.menu_items (id, name, category, price, description, image, alt, available, popular, badges, calories)
  VALUES
    ('arepa-001', 'Reina Pepiada', 'arepa', 9.5, 'Classic arepa filled with creamy chicken and avocado salad. A Venezuelan icon.', 'https://img.rocket.new/generatedImages/rocket_gen_img_16460d06b-1773095810884.png', 'Golden arepa filled with creamy chicken avocado salad on a wooden board', true, true, ARRAY['Fan Fave', '⭐ Best Seller'], 420),
    ('arepa-002', 'Pabellón Arepa', 'arepa', 10.5, 'Loaded with shredded beef, black beans, sweet plantains, and white cheese.', 'https://img.rocket.new/generatedImages/rocket_gen_img_125685a43-1772058237094.png', 'Stuffed arepa overflowing with shredded beef black beans and sweet plantains', true, true, ARRAY['💪 Hearty'], 580),
    ('arepa-003', 'Pelúa Arepa', 'arepa', 10.0, 'Shredded beef and melted yellow cheese — the "hairy" arepa loved by all.', 'https://images.unsplash.com/photo-1526431716035-f242667a1c42', 'Arepa split open showing shredded beef and melted yellow cheese filling', true, false, ARRAY['🧀 Cheesy'], 510),
    ('arepa-004', 'Domino Arepa', 'arepa', 8.5, 'Black beans and white queso fresco — simple, satisfying, and totally Venezuelan.', 'https://images.unsplash.com/photo-1632370382707-dcd0ec55d0ab', 'Arepa filled with black beans and white fresh cheese on a pink plate', true, false, ARRAY['🌱 Veggie'], 360),
    ('empanada-001', 'Beef & Potato Empanada', 'empanada', 5.5, 'Crispy fried corn dough pocket filled with seasoned ground beef and potatoes.', 'https://images.unsplash.com/photo-1707080032705-ec2df78fd395', 'Golden crispy empanada on parchment paper with a side of pink sauce', true, true, ARRAY['⭐ Best Seller'], 310),
    ('empanada-002', 'Cheese & Jalapeño Empanada', 'empanada', 5.0, 'Melty white cheese with a gentle jalapeño kick. Vegetarian-friendly.', 'https://images.unsplash.com/photo-1722982971548-8ddb57b64b1e', 'Empanada cut in half showing melted cheese and green jalapeño filling', true, false, ARRAY['🌱 Veggie', '🔥 Spicy'], 280),
    ('empanada-003', 'Shrimp & Cilantro Empanada', 'empanada', 6.5, 'Plump shrimp with garlic, cilantro, and a squeeze of lime inside crispy corn dough.', 'https://images.unsplash.com/photo-1548228586-171fb0887ac0', 'Shrimp empanada garnished with fresh cilantro on a wooden serving board', true, false, ARRAY['🦐 Seafood'], 295),
    ('patacon-001', 'Pabellón Patacón', 'patacon', 12.0, 'Crispy twice-fried green plantain "bun" loaded with shredded beef, black beans, and cheese.', 'https://img.rocket.new/generatedImages/rocket_gen_img_1c531bb93-1765291114488.png', 'Patacon sandwich made from fried plantains filled with shredded beef and black beans', true, true, ARRAY['⭐ Best Seller', '🍌 Plantain'], 650),
    ('patacon-002', 'Chicken & Avocado Patacón', 'patacon', 11.5, 'Smoky grilled chicken, creamy avocado slices, and garlic mayo between two golden plantain discs.', 'https://img.rocket.new/generatedImages/rocket_gen_img_1e50f7f5a-1772818698896.png', 'Patacon sandwich with grilled chicken avocado and garlic mayo on a colorful plate', true, false, ARRAY['🥑 Avocado'], 590),
    ('cachapa-001', 'Classic Cachapa', 'cachapa', 8.0, 'Sweet fresh corn pancake folded over hand-pulled mozzarella. Comfort in every bite.', 'https://img.rocket.new/generatedImages/rocket_gen_img_154ecb8da-1772058235093.png', 'Golden sweet corn cachapa folded over white fresh cheese on a rustic plate', true, true, ARRAY['🌽 Sweet Corn'], 420),
    ('cachapa-002', 'Cachapa con Pernil', 'cachapa', 11.0, 'Sweet corn pancake with slow-roasted pulled pork and queso de mano.', 'https://img.rocket.new/generatedImages/rocket_gen_img_1287547ce-1772058237100.png', 'Cachapa with slow-roasted pork and fresh white cheese on a colorful ceramic plate', false, false, ARRAY['🐷 Pernil', '🔜 Back Soon'], 560),
    ('tequeno-001', 'Classic Tequeños (6pc)', 'tequeno', 7.0, 'Six golden fried cheese sticks made with queso blanco wrapped in dough. Irresistible.', 'https://img.rocket.new/generatedImages/rocket_gen_img_125c7fa97-1772058236283.png', 'Six golden fried tequeños cheese sticks arranged on a pink plate with dipping sauce', true, true, ARRAY['⭐ Best Seller', '🎉 Party Fave'], 380),
    ('tequeno-002', 'Nutella Tequeños (4pc)', 'tequeno', 7.5, 'Sweet fried dough filled with Nutella and dusted with powdered sugar. Pure joy.', 'https://img.rocket.new/generatedImages/rocket_gen_img_46385b5a2-1789982806650.png', 'Four sweet tequeños dusted with powdered sugar with Nutella oozing out', true, false, ARRAY['🍫 Sweet', '✨ New'], 340),
    ('sweet-001', 'Bienmesabe Cup', 'sweet', 4.5, 'Traditional Venezuelan coconut cream dessert, served chilled with a sprinkle of cinnamon.', 'https://images.unsplash.com/photo-1494537649270-44355997d3e3', 'Creamy coconut bienmesabe served in a small cup with cinnamon on top', true, false, ARRAY['🥥 Traditional'], 210),
    ('sweet-002', 'Quesillo Slice', 'sweet', 5.0, 'Venezuelan-style flan with caramel sauce — dense, creamy, and dreamy.', 'https://img.rocket.new/generatedImages/rocket_gen_img_141ceddb0-1765232175619.png', 'Slice of Venezuelan quesillo flan with golden caramel sauce on a white plate', true, true, ARRAY['🍮 Flan', '⭐ Best Seller'], 280)
  ON CONFLICT (id) DO NOTHING;
END $$;
