# Lolita Bakery — inventory synchronization

## Original requirements
Existing Next.js bakery from the user's Bakery repository. Guest order tracking was completed previously; AI image-generation upgrade is deferred by the user.

Current P0/P1: Menu is the master catalogue; deleting menu items cascades to availability. Configurable default daily quantities, date-specific overrides, synchronized Available/Out of Stock controls, blocked calendar days. Customer menu and cart use the selected fulfillment date/time; orders reserve only that date's inventory atomically, without overselling. Implement schema, APIs and reactive UI, then test end to end.

## Architecture
- Existing Next.js 15 App Router, React 19, TypeScript, Tailwind, Zustand.
- Existing Supabase Postgres/Auth/Realtime. SQL migrations in `supabase/migrations`.
- Supervisor `nextapp` on port 3000. Not a FastAPI application.
- Supabase browser and cookie-session server clients in `src/lib/supabase`.
- Credentials live only in ignored `.env`. Database migration connection provided by the user.
- Bakery location is Miami in existing checkout; timezone America/New_York, configurable via env/database settings.

## Implementation plan
1. Schema and transactional RPCs: per-item defaults, date rules, calendar blocking, atomic/idempotent order reservation, cancellation release.
2. Shared date-aware availability for Menu, Availability, Inventory and Customer portals.
3. Scheduling persisted with cart, date/time displayed in checkout and order views.
4. Test concurrency, cross-portal updates, deletion, zero stock, blocked days, daily defaults, failure handling and responsive UI.

## Implemented — 2026-10-02
- Applied additive date-inventory migration and SQL alias repair to the user's supplied Supabase database. Runner: `node scripts/apply-inventory-migration.cjs`; versions recorded in `bakery_schema_migrations`. No historical migration reruns.
- Menu master data includes configurable default daily quantity, maximum per order and low-stock threshold. Date overrides are nullable (blank = use default). Reservations are independent per item/date; daily availability resolves automatically without a reset job or wiping future bookings.
- Availability and Inventory share one editor. Admin Menu and Availability have the same date-aware stock toggle. Menu deletion cascades stock/rules; historical order lines retain snapshots with nullable item ID.
- Calendar closure masks all remaining stock to zero for that date. Zero never means unlimited. Unblocking preserves previous quotas and reservations. Existing orders are not cancelled automatically by a closure.
- Canonical Supabase RPC APIs: menu_availability, set_item_inventory, set_blocked_date, place_inventory_order. Equivalent Next wrappers under `/api/availability`, `/api/admin/inventory`, `/api/admin/blocked-days`, `/api/orders`.
- Transactional checkout validates quantities, current menu prices, per-order caps, date/time and stock; sorted menu row locks plus date locks prevent overselling. Private idempotency receipts prevent duplicate reservation on retries. Failures preserve the cart and no longer show fake order success.
- Cancellation releases the specific date's reservation exactly once; reopening a cancelled order is rejected. Client direct writes which bypass inventory transactions are revoked.
- Enabled actual Supabase Realtime publication. Shared useAvailability refreshes on database changes/reconnect/focus, ignores stale prior-date responses. Admin date inputs wait for stock loading to prevent first-load interaction loss.
- Customer menu, home scheduling, box builder and checkout share persisted per-tab schedule/cart state. Hydration readiness protects first-load choices. Stock-aware add/quantity controls, stale-cart errors, scheduled confirmation/tracking/admin displays.
- Removed placeholder product-ID add-to-cart paths. Popular category cards browse the real menu; box builder assembles real master-menu items.
- Admin cancellation control, working signout, mobile navigation; image fallback and test IDs. Manual cash/Zelle payment behaviour retained (no payment processor added).
- Dev/build outputs separated (`.next-dev` vs `.next`) to prevent verification builds corrupting the preview. Existing standalone Node20 Supabase SDK scripts need native WebSocket or HTTP fetch; app routes/browser were verified working.

## Verification
- Final backend run: **13/13 passing** (`test_reports/pytest/pytest_results_final.xml`). Coverage: defaults, overrides/zero, reset preserving reservations, per-date depletion, closed dates, concurrency, duplicate IDs/idempotency, transaction rollback, permissions, cancellation, cascade/history snapshots.
- Browser verification: real scheduled guest checkout, confirmation/tracking/admin schedule, cross-tab realtime stock and blocked-day changes, admin cancellation and signout. Responsive checks at 320/768/1024/1440 showed no page overflow.
- Final self-tests: five consecutive reloads preserve schedule; no empty image sources; admin date/closure feedback passes; cancelled order still shows schedule; logout works.
- TypeScript check passes after final changes. Build passed during iteration 2 with separate output.
- Reports: iteration_1.json (initial bugs), iteration_2.json (retest), final_verification.json (all fixes and final evidence). SQL alias ambiguity fixed via follow-up migration; no remaining inventory blockers.
- Real integrations, no mocked inventory endpoints. Temporary QA admin and 21 QA orders removed; original 15-item menu retained, no QA closures left. Credentials status in test_credentials.md.
- No valid external REACT_APP_BACKEND_URL was available in this fork; verified through localhost:3000. The root NEXT_PUBLIC_SITE_URL points to an obsolete Rocket site and must not be used as this preview URL.

## Rules / limitations
- Bakery timezone America/New_York matches existing Miami address; database setting and NEXT_PUBLIC_BAKERY_TIMEZONE must agree if changed.
- Scheduling horizon is 365 days; no business-hour/time-slot capacity configuration was requested.
- “Available” unblocks existing quota or replenishes a depleted date by a positive default quantity, retaining reservations. Zero default requires a positive quota/default first.
- Historical orders are not retroactively reserved because they lacked reliable item IDs and fulfillment dates.
- Detailed semantics/setup/API contracts: `docs/INVENTORY.md`.

## Prioritized backlog / next actions
- P0/P1 requested inventory/scheduling scope: complete and verified.
- 2026-06: Admin portal access control + admin management + nav consolidation (DONE):
  - Admin login/role guard added in `src/components/AdminLayout.tsx`: logged-out users → `/login?redirect=...`; non-admins see an "Administrator access required" screen. Login respects `?redirect=`.
  - Admin → Admins page (`/admin/admins`) lets any admin grant/revoke admin by email. Backed by SECURITY DEFINER RPCs `admin_list_users()` + `admin_set_user_role(email, role)` (migration `20260601000000_admin_user_management.sql`), guarded by `is_admin()`. RPCs verified via simulated JWT (admin allowed, customer blocked, bad email errors).
  - Availability merged into Menu as tabs (`src/app/admin/menu/components/MenuTabs.tsx`: Items + Stock & Availability); `/admin/availability` now redirects to `/admin/menu`; nav Availability removed, Admins added.
  - 2026-06 (refinement): fully consolidated into a SINGLE Menu page at item level — removed tabs. Each item card (`src/app/admin/menu/components/MenuItemCard.tsx`) now has a BIG Available/Out-of-Stock toggle switch, inline stock editor (daily default, date quota, max/order, low-stock threshold, reset), delete, and remaining/reserved/quota readout. Blocked Days panel (`BlockedDays`) is now a sidebar on the same Menu page. `MenuTabs.tsx` deleted. All reuses the proven `updateInventory`/`menu_availability` RPC path.
  - shyamkumar2411@live.com promoted to admin (fixes the original 42501 "Administrator access required" error — no admin existed).
  - NOTE: external preview URL was timing out at the proxy during this task; verified via localhost:3000 + DB-level RPC tests. A browser E2E of the guard/tabs is still pending a reachable preview.
- Next user action: configure each item's daily quantities and holiday dates in Admin → Menu → Stock & Availability.
- P2: AI image-generation upgrade remains deferred by user (provider/key choice pending); legacy image integration unchanged.
- Optional enhancement: configurable pickup/delivery time slots and per-slot capacity.

## 2026-06 Cake Studio redesign + quote→tracking→order lifecycle (functional; verified via SQL/REST, preview down for browser E2E)
- Global recolor: primary token → maroon #6b1a2e, secondary → rose #D63B5E (src/styles/tailwind.css) to match provided references. Applied site-wide.
- Cake Studio (`CakeStudioClient.tsx`): final step now collects name/phone/email, uploads inspiration images to Supabase Storage bucket `cake-inspiration`, calls `submit_cake_quote` RPC, and shows a **Cake Tracking Number** (CK-XXXXXX). AI concept step kept (user choice). Wizard already matches the reference palette.
- DB (`20260601060000_cake_quotes.sql`): `cake_quotes` table + RLS (admin all / own read) + storage bucket + RPCs: `submit_cake_quote` (guest-safe, issues code), `track_cake` (guest read by code), `admin_quote_cake` (set price+message→quoted), `accept_cake_quote` (guest-safe → creates real order, links order_id), `decline_cake_quote`.
- Admin **Cake Quotes** page (`/admin/quotes`): list + detail drawer with full brief/images; set price + message. Nav item added.
- Guest **cake tracking** (`/cake-tracking/[code]`): timeline Request Received → Quoted → Order Placed; shows quote price/message with **Place Order** (accept→order) and Decline. Track Order page routes `CK-` codes here, `LB-` to normal tracking.
- Accepted cake → normal order (pending) in both customer & admin order lists, with a "🎂 Custom Cake — …" line item; SMS status flow reused automatically.
- Cleanup: daily cron `.emergent/crons.yml` → `/api/cron/cleanup-cakes` (Bearer WEBHOOK_CRON_SECRET) → `cleanup_cake_quotes()`: expires quotes >10 days old and clears inspiration-image references for expired/declined/delivered. NOTE: Supabase blocks SQL deletes on storage.objects; physical blob removal needs a service-role Storage job (reference cleared only).
- Verified: full lifecycle via SQL role simulation + REST (track_cake 200). Browser E2E pending a reachable preview (external URL timing out; sandbox screenshot browser can't reach Supabase for client fetches).
- Item 2: `ScheduleAndPhilosophy.tsx` restyled — matching white rounded cards; philosophy now a 3-quote carousel with dots.
- Item 3: `PopularBites.tsx` — single horizontal sliding row (all breakpoints); each bite links to `/menu-browser?category=<cat>`. `MenuBrowserClient` reads `?category=` to preselect.
- Item 4: Special Offers — new `special_offers` table + RLS (migration `20260601010000_special_offers.sql`, seeded 2 offers, anon read verified). Admin page `/admin/offers` (add/delete/toggle active, title/description/image/category/badge). Homepage `PhilosophySection.tsx` now DB-driven ("Special Offers"), each card links to its category. Nav "Offers" added.
- Item 5: `CustomerNav.tsx` — mobile-only Track Order icon (`/track-order`) beside cart.
- Phase 2 SMS: Twilio via `src/app/api/notify-status/route.ts` (admin-gated, 401 verified, creds valid); wired into `OrderManagementClient.updateStatus`. Awaiting `TWILIO_PHONE_NUMBER`.

## Remaining — Phase 3 (DONE 2026-06, code + DB verified; preview down so no browser E2E)
- **Breakfast Box builder** at `/breakfast-box` (`BreakfastBoxBuilderClient.tsx`): size Small(1/1/1)/Medium(2/2/2)/Large(3/3/3) controls per-role quantities; sections for Mains/Sides/Drinks (filtered by `menu_items.box_role`); occasion dropdown + personal message. "Add Box to Cart" adds each component as a real cart line (inventory + order_items work unchanged) and records a box summary note via `cartStore.boxNotes` → merged into order `notes` at checkout. Verified: composed box → `place_inventory_order` creates 6 order_items + reserves stock + stores note (rolled back).
- Sweet Box removed: `/sweet-box-builder` now redirects to `/breakfast-box`; old client deleted; Hero/CTA/Nav labels → "Build Breakfast Box".
- Admin item-role assignment: `MenuItemCard` has a Box role selector (none/main/side/drink) writing `menu_items.box_role`. `menu_availability` RPC now returns `box_role` (migration `20260601020000_breakfast_box.sql`). Seeded 3 drink items + assigned roles (8 main / 5 side / 3 drink).
- **Offer image upload**: Supabase Storage bucket `offer-images` (public read, admin write) via migration `20260601030000_offer_images_storage.sql`; `AdminOffersClient` has an Upload control (or paste URL).