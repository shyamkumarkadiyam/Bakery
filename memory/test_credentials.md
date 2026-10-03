# Test credentials — updated 2026-06

## Admin account
- **shyamkumar2411@live.com** — `role='admin'` (user_profiles + auth metadata). Password is user-owned (not stored here).
- The `is_admin()` / `is_admin_user()` SQL functions read admin status live from `public.user_profiles.role` and `auth.users` metadata.

## Other accounts (all `role='customer'`)
- shyamkumar.kadiyam@gmail.com
- shyamkadiyamkumar1994@gmail.com
- katrenikonahimateja@gmail.com

## Admin management (new, 2026-06)
- Admins can promote/demote any registered account to admin from **Admin → Admins** (`/admin/admins`), or via SQL RPCs `admin_set_user_role(target_email, new_role)` and `admin_list_users()` (both SECURITY DEFINER, guarded by `is_admin()`, granted to `authenticated`).
- Setting `public.user_profiles.role='admin'` is sufficient for `is_admin()`; the RPC also best-effort syncs `auth.users` metadata.

## Integrations
- **Cake quotes / cron**: cleanup cron `/api/cron/cleanup-cakes` is guarded by `WEBHOOK_CRON_SECRET` in /app/.env. Guest cake tracking codes look like `CK-XXXXXX`; test via `/cake-tracking/<code>` or Track Order page. Lifecycle RPCs: submit_cake_quote, track_cake, admin_quote_cake, accept_cake_quote, decline_cake_quote.
- **Twilio SMS** (order status texts): `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` set in /app/.env (account active, TRIAL). `TWILIO_PHONE_NUMBER` is still EMPTY — user will provide; until then `/api/notify-status` returns `{skipped:'twilio-not-configured'}` and status updates still work. Trial account can only text numbers verified in the Twilio console.
- SMS fires from `src/app/api/notify-status/route.ts` (admin-only) on status change to: confirmed (with tracking link `/order-status/{id}`), enroute ("on the way"), delivered, cancelled.

## Notes
- DB connection: DATABASE_URL in git-ignored /app/.env. Never copy its value into docs/reports.
- Admin portal now requires login + admin role (guard in `src/components/AdminLayout.tsx`); non-admins see an "Administrator access required" screen, logged-out users are redirected to `/login?redirect=...`.
