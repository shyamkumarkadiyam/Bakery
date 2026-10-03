-- Daily cleanup: expire unaccepted cake quotes after 10 days and drop inspiration image
-- references for expired/declined quotes and for accepted quotes whose order is delivered.
-- NOTE: Supabase blocks direct SQL deletes on storage.objects (storage.protect_delete),
-- so we clear the DB references here; physical blob removal needs a service-role Storage API job.

CREATE OR REPLACE FUNCTION public.cleanup_cake_quotes()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE expired_count int; cleaned_count int;
BEGIN
  WITH e AS (
    UPDATE public.cake_quotes SET status='expired'
    WHERE status IN ('requested','quoted') AND created_at < now() - interval '10 days'
    RETURNING id
  ) SELECT count(*) INTO expired_count FROM e;

  WITH c AS (
    UPDATE public.cake_quotes cq SET inspiration_images='{}'
    WHERE cardinality(cq.inspiration_images) > 0
      AND (cq.status IN ('expired','declined')
           OR (cq.status='accepted' AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id=cq.order_id AND o.status='delivered')))
    RETURNING cq.id
  ) SELECT count(*) INTO cleaned_count FROM c;

  RETURN jsonb_build_object('expired', expired_count, 'cleaned', cleaned_count);
END $$;
GRANT EXECUTE ON FUNCTION public.cleanup_cake_quotes() TO anon, authenticated;

NOTIFY pgrst,'reload schema';
