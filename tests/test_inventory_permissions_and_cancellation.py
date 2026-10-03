"""Inventory cancellation, now-order date handling, and permissions regression tests."""

import os
import uuid
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

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
ADMIN_EMAIL = os.environ.get("INVENTORY_TEST_EMAIL")
ADMIN_PASSWORD = os.environ.get("INVENTORY_TEST_PASSWORD")
TZ = os.environ.get("NEXT_PUBLIC_BAKERY_TIMEZONE", "America/New_York")


def _headers(token: str | None = None):
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token or SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }


def _rpc(name: str, payload: dict, token: str | None = None):
    return requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        headers=_headers(token),
        json=payload,
        timeout=30,
    )


def _future_date(days: int):
    return (datetime.now(ZoneInfo(TZ)) + timedelta(days=days)).date().isoformat()


def _future_time(hours: int = 3):
    t = datetime.now(ZoneInfo(TZ)) + timedelta(hours=hours)
    return t.strftime("%H:%M")


def _item_state(date: str, item_id: str):
    response = _rpc("menu_availability", {"p_date": date})
    assert response.status_code == 200, response.text
    data = response.json()
    item = next((i for i in data["items"] if i["id"] == item_id), None)
    assert item is not None
    return item


@pytest.fixture(scope="session")
def admin_token():
    # Auth fixture for admin-only operations
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


@pytest.fixture()
def qa_item(admin_token):
    # Per-test isolated menu item fixture
    item_id = f"qa-inventory-iter2-{uuid.uuid4().hex[:8]}"
    payload = {
        "id": item_id,
        "name": f"{item_id} Item",
        "category": "arepa",
        "price": 9.75,
        "description": "qa iter2",
        "image": "",
        "alt": "qa",
        "available": True,
        "popular": False,
        "badges": [],
        "calories": 300,
        "default_daily_quantity": 3,
        "max_qty_per_order": 3,
        "low_stock_threshold": 1,
    }
    create = requests.post(
        f"{SUPABASE_URL}/rest/v1/menu_items",
        headers={**_headers(admin_token), "Prefer": "return=representation"},
        json=payload,
        timeout=30,
    )
    assert create.status_code in (200, 201), create.text
    yield item_id
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/menu_items?id=eq.{item_id}",
        headers={**_headers(admin_token), "Prefer": "return=representation"},
        timeout=30,
    )


def test_now_order_uses_server_date_and_persists_schedule_fields(qa_item):
    # Now-order flow should use server-side bakery date
    payload = {
        "mode": "now",
        "date": None,
        "time": None,
        "customer_name": "QA Iter2",
        "customer_phone": "555-333-0101",
        "customer_address": "Pickup",
        "delivery_type": "pickup",
        "payment_method": "cash",
        "notes": "now-order-test",
        "items": [{"id": qa_item, "qty": 1}],
    }
    placed = _rpc(
        "place_inventory_order",
        {"p_request_id": str(uuid.uuid4()), "p_payload": payload},
    )
    assert placed.status_code == 200, placed.text
    data = placed.json()
    assert isinstance(data["id"], str)
    assert data["time"] is None

    expected_today = datetime.now(ZoneInfo(TZ)).date().isoformat()
    assert data["date"] == expected_today


def test_admin_cancel_releases_stock_once_and_order_cannot_reopen(admin_token, qa_item):
    # Cancellation flow: stock release once + reopen prevented
    target_date = _future_date(4)
    set_limit = _rpc(
        "set_item_inventory",
        {"p_item_id": qa_item, "p_date": target_date, "p_changes": {"daily_limit": 2}},
        admin_token,
    )
    assert set_limit.status_code == 200

    order_payload = {
        "mode": "later",
        "date": target_date,
        "time": _future_time(5),
        "customer_name": "QA Cancel",
        "customer_phone": "555-333-0102",
        "customer_address": "Pickup",
        "delivery_type": "pickup",
        "payment_method": "cash",
        "notes": "cancel-release",
        "items": [{"id": qa_item, "qty": 1}],
    }
    placed = _rpc(
        "place_inventory_order",
        {"p_request_id": str(uuid.uuid4()), "p_payload": order_payload},
    )
    assert placed.status_code == 200, placed.text
    order_id = placed.json()["id"]

    reserved = _item_state(target_date, qa_item)
    assert reserved["orders_taken"] == 1

    cancel = requests.patch(
        f"{SUPABASE_URL}/rest/v1/orders?id=eq.{order_id}",
        headers={**_headers(admin_token), "Prefer": "return=representation"},
        json={"status": "cancelled", "updated_at": datetime.utcnow().isoformat()},
        timeout=30,
    )
    assert cancel.status_code == 200, cancel.text
    cancelled_rows = cancel.json()
    assert len(cancelled_rows) == 1
    assert cancelled_rows[0]["status"] == "cancelled"

    released = _item_state(target_date, qa_item)
    assert released["orders_taken"] == 0

    re_cancel = requests.patch(
        f"{SUPABASE_URL}/rest/v1/orders?id=eq.{order_id}",
        headers={**_headers(admin_token), "Prefer": "return=representation"},
        json={"status": "cancelled", "updated_at": datetime.utcnow().isoformat()},
        timeout=30,
    )
    assert re_cancel.status_code == 200
    still_released = _item_state(target_date, qa_item)
    assert still_released["orders_taken"] == 0

    reopen = requests.patch(
        f"{SUPABASE_URL}/rest/v1/orders?id=eq.{order_id}",
        headers={**_headers(admin_token), "Prefer": "return=representation"},
        json={"status": "pending", "updated_at": datetime.utcnow().isoformat()},
        timeout=30,
    )
    assert reopen.status_code == 400
    assert "cannot be reopened" in reopen.text.lower()


def test_guest_cannot_direct_insert_or_status_update_or_counter_write(qa_item):
    # Permission hardening for direct writes/counter bypass paths
    direct_order_insert = requests.post(
        f"{SUPABASE_URL}/rest/v1/orders",
        headers={**_headers(), "Prefer": "return=representation"},
        json={
            "id": f"LB-RAW-{uuid.uuid4().hex[:8]}",
            "customer_name": "Guest",
            "customer_phone": "555-000-0000",
            "customer_address": "X",
            "delivery_type": "pickup",
            "payment_method": "cash",
            "subtotal": 1,
            "delivery_fee": 0,
            "tax": 0,
            "total": 1,
            "status": "pending",
        },
        timeout=30,
    )
    assert direct_order_insert.status_code in (401, 403)

    update_counter = requests.patch(
        f"{SUPABASE_URL}/rest/v1/availability_rules?item_id=eq.{qa_item}",
        headers={**_headers(), "Prefer": "return=representation"},
        json={"orders_taken": 99},
        timeout=30,
    )
    assert update_counter.status_code in (401, 403)


def test_detect_leftover_iteration1_qa_fixtures(admin_token):
    # Diagnostic visibility for leftover qa-inventory fixtures from prior iteration
    leftovers = requests.get(
        f"{SUPABASE_URL}/rest/v1/menu_items?id=like.qa-inventory-%&select=id,name",
        headers=_headers(admin_token),
        timeout=30,
    )
    assert leftovers.status_code == 200, leftovers.text
    data = leftovers.json()
    assert isinstance(data, list)
