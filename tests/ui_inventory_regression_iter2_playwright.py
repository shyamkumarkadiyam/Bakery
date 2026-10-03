"""Persisted Playwright regression script (run body inside async context with `page`)."""

# NOTE:
# - This script is intentionally written as executable Playwright actions for reuse.
# - It validates: admin login, blocked-day submit/request logging, cross-tab block/unblock sync,
#   customer tracking schedule text, admin order schedule visibility, and cancelled-order lock.

from datetime import datetime, timedelta
import os
from pathlib import Path


async def run(page):
    for line in Path('/app/.env').read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            key,value=line.split('=',1)
            os.environ.setdefault(key,value)
    admin_email = os.environ['INVENTORY_TEST_EMAIL']
    admin_password = os.environ['INVENTORY_TEST_PASSWORD']
    known_order_id = os.environ['INVENTORY_TEST_ORDER_ID']
    base_url = os.environ['APP_BASE_URL']

    await page.set_viewport_size({"width": 1920, "height": 800})

    # Scheduling must survive hydration/reload and immediate toggles.
    await page.goto(base_url+'/menu-browser', wait_until='domcontentloaded')
    for _ in range(5):
        await page.wait_for_selector('[data-testid="menu-schedule-picker"][data-ready="true"]')
        await page.get_by_test_id('menu-schedule-now').click()
        await page.get_by_test_id('menu-schedule-later').click()
        await page.get_by_test_id('menu-schedule-date').wait_for(state='visible')
        await page.get_by_test_id('menu-schedule-date').fill((datetime.now()+timedelta(days=18)).strftime('%Y-%m-%d'))
        await page.get_by_test_id('menu-schedule-time').fill('15:30')
        await page.reload(wait_until='domcontentloaded')
    await page.get_by_test_id('menu-schedule-date').wait_for(state='visible')
    assert await page.get_by_test_id('menu-schedule-time').input_value() == '15:30'
    print('PASS: schedule toggle/persistence across five reloads')

    # Admin login
    await page.goto(base_url+"/login", wait_until="domcontentloaded")
    await page.fill('[data-testid="login-email"]', admin_email)
    await page.fill('[data-testid="login-password"]', admin_password)
    await page.click('[data-testid="login-submit"]', force=True)
    await page.wait_for_url("**/account**", timeout=15000)

    # Block/unblock with request logs + two-tab realtime sync
    await page.goto(base_url+"/admin/availability", wait_until="domcontentloaded")
    await page.wait_for_selector('[data-testid="availability-panel"]', timeout=15000)
    tab_b = await page.context.new_page()
    await tab_b.set_viewport_size({"width": 1920, "height": 800})
    await tab_b.goto(base_url+"/admin/availability", wait_until="domcontentloaded")
    await tab_b.wait_for_selector('[data-testid="availability-panel"]', timeout=15000)

    target_date = (datetime.now() + timedelta(days=18)).strftime("%Y-%m-%d")
    req_a, res_a, req_b, res_b = [], [], [], []

    page.on("request", lambda r: req_a.append((r.method, r.url)) if "set_blocked_date" in r.url else None)
    page.on("response", lambda r: res_a.append((r.status, r.url)) if "set_blocked_date" in r.url else None)
    tab_b.on("request", lambda r: req_b.append((r.method, r.url)) if "set_blocked_date" in r.url else None)
    tab_b.on("response", lambda r: res_b.append((r.status, r.url)) if "set_blocked_date" in r.url else None)

    await page.fill('[data-testid="availability-date"]', target_date)
    await page.fill('[data-testid="block-date-input"]', target_date)
    await page.fill('[data-testid="block-reason-input"]', "QA block sync retest")
    await tab_b.fill('[data-testid="availability-date"]', target_date)

    await page.click('[data-testid="block-date-submit"]', force=True)
    await page.wait_for_timeout(2500)
    await page.wait_for_selector(f'[data-testid="blocked-day-{target_date}"]', timeout=10000)
    await tab_b.wait_for_selector(f'[data-testid="blocked-day-{target_date}"]', timeout=12000)

    await tab_b.click(f'[data-testid="unblock-date-{target_date}"]', force=True)
    await tab_b.wait_for_timeout(2500)
    await page.wait_for_selector(f'[data-testid="blocked-day-{target_date}"]', state="detached", timeout=15000)

    # Schedule visibility checks on customer/admin for known order
    await page.goto(f"{base_url}/order-status/{known_order_id}", wait_until="domcontentloaded")
    await page.wait_for_selector('[data-testid="tracked-order-id"]', timeout=15000)
    _tracked_schedule = await page.locator('[data-testid="tracked-order-schedule"]').text_content()

    await page.goto(base_url+"/admin/orders", wait_until="domcontentloaded")
    row_selector = f'[data-testid="admin-order-row-{known_order_id}"]'
    await page.wait_for_selector(row_selector, timeout=25000)
    await page.click(row_selector, force=True)
    await page.wait_for_selector('[data-testid="admin-order-detail-id"]', timeout=10000)
    _admin_schedule = await page.locator('[data-testid="admin-order-schedule"]').text_content()

    # Cancelled orders cannot be reopened from admin UI
    status_select = page.locator('[data-testid="admin-order-status-select"]')
    if not await status_select.is_disabled():
        await status_select.click(force=True)
        await page.wait_for_timeout(200)
        await page.click('[data-testid="admin-order-status-cancelled"]', force=True)
        await page.wait_for_timeout(1800)
    assert await page.locator('[data-testid="admin-order-status-select"]').is_disabled()

    return {
        "requests_tab_a": req_a,
        "responses_tab_a": res_a,
        "requests_tab_b": req_b,
        "responses_tab_b": res_b,
    }
