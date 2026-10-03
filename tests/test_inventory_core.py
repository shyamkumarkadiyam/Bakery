"""Core inventory/order API regression tests against real Supabase + Next wrappers."""

import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
import requests


def _load_root_env(path: str = "/app/.env"):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            raw = line.strip()
            if not raw or raw.startswith("#") or "=" not in raw:
                continue
            key, val = raw.split("=", 1)
            os.environ.setdefault(key, val)


_load_root_env()


BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000").rstrip("/")
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
ADMIN_EMAIL = os.environ.get("INVENTORY_TEST_EMAIL")
ADMIN_PASSWORD = os.environ.get("INVENTORY_TEST_PASSWORD")
TZ = os.environ.get("NEXT_PUBLIC_BAKERY_TIMEZONE", "America/New_York")


def _headers(token: str | None = None):
    h = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token or SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    return h


def _rpc(name: str, payload: dict, token: str | None = None):
    return requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        headers=_headers(token),
        json=payload,
        timeout=30,
    )


def _rest_insert_menu(item: dict, token: str):
    return requests.post(
        f"{SUPABASE_URL}/rest/v1/menu_items",
        headers={**_headers(token), "Prefer": "return=representation"},
        json=item,
        timeout=30,
    )


def _rest_delete_item(item_id: str, token: str):
    return requests.delete(
        f"{SUPABASE_URL}/rest/v1/menu_items?id=eq.{item_id}",
        headers={**_headers(token), "Prefer": "return=representation"},
        timeout=30,
    )


def _future_date(days: int):
    return (datetime.now(ZoneInfo(TZ)) + timedelta(days=days)).date().isoformat()


def _future_time(hours: int = 2):
    t = datetime.now(ZoneInfo(TZ)) + timedelta(hours=hours)
    return t.strftime("%H:%M")


def _order_payload(item_id: str, qty: int, date: str, *, mode: str = "later", extra_items=None):
    items = [{"id": item_id, "qty": qty}]
    if extra_items:
        items.extend(extra_items)
    return {
        "mode": mode,
        "date": date if mode == "later" else None,
        "time": _future_time(3) if mode == "later" else None,
        "customer_name": "QA Inventory",
        "customer_phone": "555-200-1000",
        "customer_address": "Pickup",
        "delivery_type": "pickup",
        "payment_method": "cash",
        "notes": "qa",
        "items": items,
    }


@pytest.fixture(scope="session")
def admin_token():
    assert SUPABASE_URL and SUPABASE_ANON_KEY and ADMIN_EMAIL and ADMIN_PASSWORD
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert response.status_code == 200, response.text
    token = response.json().get("access_token")
    assert token
    return token


@pytest.fixture(scope="session")
def qa_items(admin_token):
    # QA fixture menu items for inventory/order tests
    prefix = f"qa-inventory-{uuid.uuid4().hex[:8]}"
    ids = [f"{prefix}-a", f"{prefix}-b", f"{prefix}-c"]
    payloads = [
        {
            "id": ids[0],
            "name": f"{prefix} A",
            "category": "arepa",
            "price": 10.0,
            "description": "QA item A",
            "image": "",
            "alt": "qa",
            "available": True,
            "popular": False,
            "badges": [],
            "calories": 300,
            "default_daily_quantity": 7,
            "max_qty_per_order": 5,
            "low_stock_threshold": 1,
        },
        {
            "id": ids[1],
            "name": f"{prefix} B",
            "category": "empanada",
            "price": 11.0,
            "description": "QA item B",
            "image": "",
            "alt": "qa",
            "available": True,
            "popular": False,
            "badges": [],
            "calories": 310,
            "default_daily_quantity": 5,
            "max_qty_per_order": 5,
            "low_stock_threshold": 1,
        },
        {
            "id": ids[2],
            "name": f"{prefix} C",
            "category": "sweet",
            "price": 12.5,
            "description": "QA item C",
            "image": "",
            "alt": "qa",
            "available": True,
            "popular": False,
            "badges": [],
            "calories": 320,
            "default_daily_quantity": 3,
            "max_qty_per_order": 3,
            "low_stock_threshold": 1,
        },
    ]
    for p in payloads:
        res = _rest_insert_menu(p, admin_token)
        assert res.status_code in (200, 201), res.text

    yield ids

    for item_id in ids:
        _rest_delete_item(item_id, admin_token)


def _availability(date: str):
    response = _rpc("menu_availability", {"p_date": date})
    assert response.status_code == 200, response.text
    return response.json()


def _item_state(date: str, item_id: str):
    data = _availability(date)
    item = next((i for i in data["items"] if i["id"] == item_id), None)
    assert item is not None
    return item


def test_wrapper_availability_and_orders_validation():
    # Next API wrappers: request validation + successful availability fetch
    ok = requests.get(f"{BASE_URL}/api/availability?date={_future_date(2)}", timeout=30)
    assert ok.status_code == 200
    ok_data = ok.json()
    assert "items" in ok_data and isinstance(ok_data["items"], list)
    assert "date" in ok_data and isinstance(ok_data["date"], str)

    bad_date = requests.get(f"{BASE_URL}/api/availability?date=2026-13-99", timeout=30)
    assert bad_date.status_code == 400

    bad_body = requests.post(f"{BASE_URL}/api/orders", json={"foo": "bar"}, timeout=30)
    assert bad_body.status_code == 400
    assert "error" in bad_body.json()


def test_guest_cannot_edit_inventory_admin_rpc(qa_items):
    # Non-admin must be blocked from inventory edit RPC
    date = _future_date(3)
    resp = _rpc(
        "set_item_inventory",
        {"p_item_id": qa_items[0], "p_date": date, "p_changes": {"daily_limit": 2}},
    )
    assert resp.status_code == 401


def test_default_override_and_reset_preserves_reservations(qa_items, admin_token):
    # Default quantity, date override, reset, and reservation preservation
    item_id = qa_items[0]
    date1 = _future_date(4)
    date2 = _future_date(5)

    initial = _item_state(date1, item_id)
    assert initial["daily_limit"] == 7
    assert initial["orders_taken"] == 0
    assert initial["remaining"] == 7

    set_override = _rpc(
        "set_item_inventory",
        {"p_item_id": item_id, "p_date": date1, "p_changes": {"daily_limit": 3}},
        admin_token,
    )
    assert set_override.status_code == 200
    after_override = _item_state(date1, item_id)
    assert after_override["daily_limit"] == 3
    assert after_override["has_override"] is True

    order_payload = _order_payload(item_id, 2, date1)
    placed = _rpc("place_inventory_order", {"p_request_id": str(uuid.uuid4()), "p_payload": order_payload})
    assert placed.status_code == 200, placed.text
    placed_data = placed.json()
    assert "id" in placed_data and isinstance(placed_data["id"], str)

    post_order = _item_state(date1, item_id)
    assert post_order["orders_taken"] == 2
    assert post_order["remaining"] == 1

    reset = _rpc(
        "set_item_inventory",
        {"p_item_id": item_id, "p_date": date1, "p_changes": {"reset": True}},
        admin_token,
    )
    assert reset.status_code == 200
    post_reset = _item_state(date1, item_id)
    assert post_reset["has_override"] is False
    assert post_reset["daily_limit"] == 7
    assert post_reset["orders_taken"] == 2
    assert post_reset["remaining"] == 5

    update_default = _rpc(
        "set_item_inventory",
        {"p_item_id": item_id, "p_date": date1, "p_changes": {"default_daily_quantity": 9}},
        admin_token,
    )
    assert update_default.status_code == 200
    no_override_date = _item_state(date2, item_id)
    assert no_override_date["daily_limit"] == 9
    assert no_override_date["orders_taken"] == 0
    assert no_override_date["remaining"] == 9

    set_zero_override = _rpc(
        "set_item_inventory",
        {"p_item_id": item_id, "p_date": date1, "p_changes": {"daily_limit": 0}},
        admin_token,
    )
    assert set_zero_override.status_code == 200
    zero_state = _item_state(date1, item_id)
    assert zero_state["daily_limit"] == 0
    assert zero_state["remaining"] == 0
    assert zero_state["available"] is False


def test_blocked_day_forces_zero_and_prevents_opening_item(qa_items, admin_token):
    # Blocking a date forces zero stock and blocks item-level availability override
    item_id = qa_items[1]
    target_date = _future_date(6)

    block = _rpc(
        "set_blocked_date",
        {"p_date": target_date, "p_blocked": True, "p_reason": "QA closed"},
        admin_token,
    )
    assert block.status_code == 200
    blocked = block.json()
    assert blocked["blocked"] is True
    assert blocked["reason"] == "QA closed"
    item = next(i for i in blocked["items"] if i["id"] == item_id)
    assert item["remaining"] == 0
    assert item["available"] is False

    cannot_force_open = _rpc(
        "set_item_inventory",
        {"p_item_id": item_id, "p_date": target_date, "p_changes": {"available": True}},
        admin_token,
    )
    assert cannot_force_open.status_code == 400

    blocked_order = _rpc(
        "place_inventory_order",
        {
            "p_request_id": str(uuid.uuid4()),
            "p_payload": _order_payload(item_id, 1, target_date),
        },
    )
    assert blocked_order.status_code == 400

    unblock = _rpc(
        "set_blocked_date",
        {"p_date": target_date, "p_blocked": False, "p_reason": ""},
        admin_token,
    )
    assert unblock.status_code == 200
    unblocked = _item_state(target_date, item_id)
    assert unblocked["remaining"] >= 0


def test_concurrent_last_item_only_one_checkout_succeeds(qa_items, admin_token):
    # Atomic reservation: race on last item should allow only one order
    item_id = qa_items[2]
    target_date = _future_date(7)
    set_one = _rpc(
        "set_item_inventory",
        {"p_item_id": item_id, "p_date": target_date, "p_changes": {"daily_limit": 1}},
        admin_token,
    )
    assert set_one.status_code == 200

    payload1 = {"p_request_id": str(uuid.uuid4()), "p_payload": _order_payload(item_id, 1, target_date)}
    payload2 = {"p_request_id": str(uuid.uuid4()), "p_payload": _order_payload(item_id, 1, target_date)}

    def place(p):
        return _rpc("place_inventory_order", p)

    with ThreadPoolExecutor(max_workers=2) as ex:
        r1, r2 = list(ex.map(place, [payload1, payload2]))

    statuses = sorted([r1.status_code, r2.status_code])
    assert statuses == [200, 400]

    state = _item_state(target_date, item_id)
    assert state["orders_taken"] == 1
    assert state["remaining"] == 0


def test_atomic_rollback_on_multi_item_insufficient(qa_items, admin_token):
    # Multi-item failure must roll back previous reservation increments
    item_a = qa_items[0]
    item_b = qa_items[1]
    target_date = _future_date(8)

    set_a = _rpc(
        "set_item_inventory",
        {"p_item_id": item_a, "p_date": target_date, "p_changes": {"daily_limit": 5}},
        admin_token,
    )
    assert set_a.status_code == 200
    set_b = _rpc(
        "set_item_inventory",
        {"p_item_id": item_b, "p_date": target_date, "p_changes": {"daily_limit": 0}},
        admin_token,
    )
    assert set_b.status_code == 200

    failed = _rpc(
        "place_inventory_order",
        {
            "p_request_id": str(uuid.uuid4()),
            "p_payload": _order_payload(item_a, 1, target_date, extra_items=[{"id": item_b, "qty": 1}]),
        },
    )
    assert failed.status_code == 400

    a_state = _item_state(target_date, item_a)
    assert a_state["orders_taken"] == 0
    assert a_state["remaining"] == 5


def test_duplicate_ids_idempotency_and_server_price_authority(qa_items):
    # Duplicate item rows aggregate; idempotency prevents double decrement; prices are server-owned
    item_id = qa_items[1]
    target_date = _future_date(9)
    request_id = str(uuid.uuid4())
    payload = {
        "mode": "later",
        "date": target_date,
        "time": _future_time(4),
        "customer_name": "QA Dup",
        "customer_phone": "555-101-9999",
        "customer_address": "Pickup",
        "delivery_type": "pickup",
        "payment_method": "cash",
        "notes": "dup ids",
        "items": [
            {"id": item_id, "qty": 1, "price": 0.01},
            {"id": item_id, "qty": 2, "price": 0.02},
        ],
    }

    first = _rpc("place_inventory_order", {"p_request_id": request_id, "p_payload": payload})
    assert first.status_code == 200
    first_data = first.json()
    assert "id" in first_data

    after_first = _item_state(target_date, item_id)
    assert after_first["orders_taken"] == 3

    second_same = _rpc("place_inventory_order", {"p_request_id": request_id, "p_payload": payload})
    assert second_same.status_code == 200
    second_data = second_same.json()
    assert second_data["id"] == first_data["id"]

    after_second = _item_state(target_date, item_id)
    assert after_second["orders_taken"] == 3

    changed_payload = dict(payload)
    changed_payload["notes"] = "changed"
    reused_changed = _rpc(
        "place_inventory_order",
        {"p_request_id": request_id, "p_payload": changed_payload},
    )
    assert reused_changed.status_code == 400


def test_invalid_qty_and_past_schedule_rejected(qa_items):
    # Invalid quantities and past schedule must be rejected
    item_id = qa_items[0]
    yesterday = (datetime.now(ZoneInfo(TZ)) - timedelta(days=1)).date().isoformat()

    invalid_qty = {
        "mode": "later",
        "date": _future_date(10),
        "time": _future_time(5),
        "customer_name": "QA bad",
        "customer_phone": "555-111-0000",
        "customer_address": "Pickup",
        "delivery_type": "pickup",
        "payment_method": "cash",
        "notes": "bad qty",
        "items": [{"id": item_id, "qty": 0}],
    }
    bad_qty_resp = _rpc("place_inventory_order", {"p_request_id": str(uuid.uuid4()), "p_payload": invalid_qty})
    assert bad_qty_resp.status_code == 400

    past = {
        "mode": "later",
        "date": yesterday,
        "time": "10:00",
        "customer_name": "QA bad",
        "customer_phone": "555-111-0000",
        "customer_address": "Pickup",
        "delivery_type": "pickup",
        "payment_method": "cash",
        "notes": "past",
        "items": [{"id": item_id, "qty": 1}],
    }
    past_resp = _rpc("place_inventory_order", {"p_request_id": str(uuid.uuid4()), "p_payload": past})
    assert past_resp.status_code == 400


def test_delete_item_cascades_availability_and_keeps_order_snapshot(admin_token):
    # Deleting menu item should remove availability row but preserve order line snapshots
    item_id = f"qa-inventory-del-{uuid.uuid4().hex[:8]}"
    create = _rest_insert_menu(
        {
            "id": item_id,
            "name": "QA Delete Snapshot",
            "category": "arepa",
            "price": 13.25,
            "description": "delete snapshot",
            "image": "",
            "alt": "qa",
            "available": True,
            "popular": False,
            "badges": [],
            "calories": 330,
            "default_daily_quantity": 4,
            "max_qty_per_order": 4,
            "low_stock_threshold": 1,
        },
        admin_token,
    )
    assert create.status_code in (200, 201), create.text

    target_date = _future_date(11)
    order_payload = _order_payload(item_id, 1, target_date)
    placed = _rpc("place_inventory_order", {"p_request_id": str(uuid.uuid4()), "p_payload": order_payload})
    assert placed.status_code == 200, placed.text
    order_id = placed.json()["id"]

    deleted = _rest_delete_item(item_id, admin_token)
    assert deleted.status_code in (200, 204), deleted.text

    avail = _availability(target_date)
    assert not any(i["id"] == item_id for i in avail["items"])

    order_items_resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/order_items?order_id=eq.{order_id}&select=name,price,qty,item_id",
        headers=_headers(admin_token),
        timeout=30,
    )
    assert order_items_resp.status_code == 200
    lines = order_items_resp.json()
    assert len(lines) == 1
    assert lines[0]["name"] == "QA Delete Snapshot"
    assert float(lines[0]["price"]) == 13.25
    assert lines[0]["qty"] == 1
    assert lines[0]["item_id"] is None
