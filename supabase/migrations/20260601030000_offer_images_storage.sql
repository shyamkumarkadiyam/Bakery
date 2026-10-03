-- Public storage bucket for admin-uploaded Special Offer images

INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "offer images public read" ON storage.objects;
CREATE POLICY "offer images public read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'offer-images');

DROP POLICY IF EXISTS "offer images admin insert" ON storage.objects;
CREATE POLICY "offer images admin insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'offer-images' AND public.is_admin());

DROP POLICY IF EXISTS "offer images admin update" ON storage.objects;
CREATE POLICY "offer images admin update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'offer-images' AND public.is_admin());

DROP POLICY IF EXISTS "offer images admin delete" ON storage.objects;
CREATE POLICY "offer images admin delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'offer-images' AND public.is_admin());
