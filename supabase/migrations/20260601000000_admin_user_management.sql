-- Admin user management: list users and set roles (promote/demote admins by email)

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(id uuid, email text, role text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  SELECT up.id, up.email, up.role, up.created_at
  FROM public.user_profiles up
  ORDER BY (up.role = 'admin') DESC, up.email;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_email text, new_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE='42501';
  END IF;
  IF new_role NOT IN ('admin','customer') THEN
    RAISE EXCEPTION 'Invalid role' USING ERRCODE='22023';
  END IF;
  SELECT id INTO uid FROM public.user_profiles WHERE lower(email) = lower(trim(target_email));
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No registered account found for %', target_email USING ERRCODE='P0001';
  END IF;
  UPDATE public.user_profiles SET role = new_role, updated_at = now() WHERE id = uid;
  BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('role', new_role)
    WHERE id = uid;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- user_profiles.role is sufficient for is_admin(); metadata sync is best-effort
  END;
  RETURN json_build_object('ok', true, 'email', target_email, 'role', new_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(text, text) TO authenticated;
