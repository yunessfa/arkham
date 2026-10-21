"""Amounts persisted in toman. The gateway boundary converts to integer rial."""

import json, uuid, re
from urllib.request import Request, urlopen
from urllib.error import URLError
from django.conf import settings


class GatewayUnavailable(Exception):
    pass


class GatewayRejected(Exception):
    pass


class MockGateway:
    def __init__(self):
        if not settings.DEBUG:
            raise GatewayUnavailable("Mock forbidden")

    def request(self, payment):
        a = "dev-" + uuid.uuid4().hex
        return a, "/checkout?order=" + str(payment.order_id)

    def verify(self, payment):
        return "mock-" + payment.authority


class ZarinpalGateway:
    base = "https://payment.zarinpal.com/pg/v4/payment/"

    def rpc(self, action, payload):
        if not settings.ZARINPAL_MERCHANT_ID:
            raise GatewayUnavailable("Gateway is not configured")
        try:
            req = Request(
                self.base + action + ".json",
                data=json.dumps(
                    {"merchant_id": settings.ZARINPAL_MERCHANT_ID, **payload}
                ).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urlopen(req, timeout=15) as r:
                data = json.load(r)
            if not isinstance(data, dict):
                raise GatewayUnavailable("Invalid gateway response")
            payload = data.get("data") or {}
            if not isinstance(payload, dict):
                raise GatewayUnavailable("Invalid gateway response")
            return payload
        except (URLError, TimeoutError, ValueError):
            raise GatewayUnavailable("Gateway temporarily unavailable")

    def request(self, p):
        d = self.rpc(
            "request",
            {
                "amount": int(p.amount_toman) * 10,
                "description": "ARKHAM " + str(p.order_id),
                "callback_url": settings.PUBLIC_ORIGIN + "/api/v1/payments/callback/",
            },
        )
        if d.get("code") != 100:
            raise GatewayRejected("Payment request rejected")
        a = d.get("authority", "")
        if not isinstance(a, str) or not re.fullmatch(r"[A-Za-z0-9-]{10,100}", a):
            raise GatewayUnavailable("Invalid authority")
        return a, "https://payment.zarinpal.com/pg/StartPay/" + a

    def verify(self, p):
        d = self.rpc(
            "verify", {"amount": int(p.amount_toman) * 10, "authority": p.authority}
        )
        if d.get("code") in (100, 101):
            ref = d.get("ref_id")
            if (
                isinstance(ref, (int, str))
                and re.fullmatch(r"[0-9]{1,100}", str(ref))
                and int(ref) > 0
            ):
                return str(ref)
            raise GatewayUnavailable("Invalid verification reference")
        # A non-success response does not release stock automatically: reconcile uncertain outcomes.
        raise GatewayRejected("Payment was not verified")


def gateway(name):
    if name == "mock":
        return MockGateway()
    if name == "zarinpal":
        return ZarinpalGateway()
    raise GatewayUnavailable("پرداخت آنلاین هنوز توسط مدیر فعال نشده است.")
