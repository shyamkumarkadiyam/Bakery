# Date-based inventory

## Apply the schema
The existing Next.js/Supabase architecture is retained. The additive migration is
`supabase/migrations/20261002100000_date_inventory.sql`.
With `DATABASE_URL` set in the ignored root `.env`, run:

```
node scripts/apply-inventory-migration.cjs
```

The runner also applies the follow-up `20261002110000_fix_inventory_order_alias.sql` repair when needed. It applies migrations transactionally and records each version. Re-running does not
reset data. Do not rerun historical migrations: some old files drop enum types.
The migration enables Supabase Realtime publication for the affected tables.
The connection string is migration-only; browser code only receives the existing
public Supabase URL/key, never the database password.

## Stock semantics
- `menu_items` is the master catalogue, including defaults, per-order caps and
  low-stock thresholds. Availability rules cascade on deletion. Historical order
  lines retain names/prices and have their deleted `item_id` set to null.
- For each date: `quota = availability_rules.daily_limit ?? default_daily_quantity`;
  `remaining = max(0, quota - orders_taken)`. A closed date or item block forces
  remaining to **zero**. Zero never means unlimited.
- Defaults resolve automatically for every new date (no reset job). A future
  reservation or manual override is never erased at midnight. Blank date quota
  restores the default without deleting reservations. Changing a default affects
  dates without explicit quota overrides; reserved counts remain unchanged.
- “Out of Stock” applies only to the selected date. “Available” removes that block;
  when the quota was depleted it replenishes remaining stock to the positive
  daily default, retaining all existing reservations. A zero default requires
  a positive quota/default first. A whole closed day cannot be overridden per item.
- Unblocking a day restores its prior quotas minus reservations. Existing orders
  are **not cancelled** when an administrator closes their date.
- Legacy `menu_items.available` and `menu_stock` counters are no longer used to
  calculate stock. Inventory and Availability intentionally share an editor.
- Timezone: `bakery_settings.timezone`, initialized to America/New_York based on
  the existing Miami bakery address. Keep `NEXT_PUBLIC_BAKERY_TIMEZONE` in sync if
  changing location. Scheduling accepts future times up to 365 days; existing app
  has no opening-hour/time-slot-capacity configuration.

## APIs
These authenticated Supabase RPCs are the canonical HTTP APIs, called by both
portals using the existing Supabase session; public requests use the anonymous key.

| POST `/rest/v1/rpc/…` | Access | Arguments |
| --- | --- | --- |
| `menu_availability` | public | `p_date: YYYY-MM-DD` (null = bakery today) |
| `set_item_inventory` | admin | `p_item_id, p_date, p_changes` |
| `set_blocked_date` | admin | `p_date, p_blocked, p_reason` |
| `place_inventory_order` | guest/customer | `p_request_id` UUID, `p_payload` |

`p_changes`: default_daily_quantity, daily_limit (null = default), available,
reset, max_qty_per_order, low_stock_threshold, notes.

Equivalent Next.js cookie-session wrappers: `GET /api/availability?date=…`,
`PATCH /api/admin/inventory {itemId,date,changes}`,
`POST /api/admin/blocked-days {date,blocked,reason}`,
`POST /api/orders {requestId,order}`.

Order payload: `mode` (now/later), `date`, `time` (bakery-local), customer_name,
customer_phone, customer_address, delivery_type (pickup/delivery), payment_method
(cash/zelle), notes, items (`[{id,qty}]`). Prices/totals and user identity are taken
from the database/session, not from customer input. Existing tax/delivery prices
are retained. Cash/Zelle are manual payment methods; no payment processor is added.

Date locks serialize blocking, stock edits and reservations; sorted menu row locks
prevent conflicting multi-item checkouts. An entire failed order rolls back.
Idempotency receipts prevent retries/double-clicks consuming stock twice. Status
changes to cancelled release the reservation exactly once on its fulfillment date;
cancelled orders cannot be reopened without a new reservation.

Direct order inserts and inventory-counter writes by clients are revoked to
prevent bypass. Existing historical orders are not retroactively reserved because
their lines did not contain reliable menu IDs or fulfillment dates.

## UI synchronization
Shared `useAvailability` listens to menu/rule/calendar Realtime changes, reconnect,
focus and visibility changes. Request sequencing prevents slower previous-date
responses replacing newer choices. Cart and scheduling persist within the browser
tab. Changed dates retain the cart but revalidate all quantities before checkout.
The home schedule picker, menu, box builder and checkout share that selection.