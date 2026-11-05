"""SMS delivery for login codes.

console   -> development only; the code is logged and returned to the browser.
kavenegar -> Kavenegar "verify/lookup" template API (needs KAVENEGAR_API_KEY and
             KAVENEGAR_TEMPLATE). Not exercised against the live service here.
disabled  -> phone login is hidden in the UI and the endpoints refuse requests.
"""

import json
import logging
from urllib.parse import quote, urlencode
from urllib.request import urlopen
from urllib.error import URLError
from django.conf import settings

log = logging.getLogger("store.sms")


class SmsUnavailable(Exception):
    pass


def provider():
    return getattr(settings, "SMS_PROVIDER", "disabled")


def enabled():
    return provider() in ("console", "kavenegar")


def send_login_code(phone, code):
    name = provider()
    if name == "console":
        if not settings.DEBUG:
            raise SmsUnavailable("Console SMS is development-only")
        log.warning("ARKHAM login code for %s: %s", phone, code)
        return
    if name == "kavenegar":
        key, template = settings.KAVENEGAR_API_KEY, settings.KAVENEGAR_TEMPLATE
        if not key or not template:
            raise SmsUnavailable("Kavenegar is not configured")
        url = (
            "https://api.kavenegar.com/v1/"
            + quote(key, safe="")
            + "/verify/lookup.json?"
            + urlencode({"receptor": phone, "token": code, "template": template})
        )
        try:
            with urlopen(url, timeout=10) as r:
                data = json.load(r)
        except (URLError, TimeoutError, ValueError):
            raise SmsUnavailable("SMS gateway unavailable")
        status = (data.get("return") or {}).get("status") if isinstance(data, dict) else None
        if status != 200:
            raise SmsUnavailable("SMS gateway rejected the request")
        return
    raise SmsUnavailable("Phone login is disabled")
