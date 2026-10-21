from django.core.management.base import BaseCommand, CommandError
from store.models import Order
from store.services import settle_payment
from store.payments import GatewayUnavailable, GatewayRejected


class Command(BaseCommand):
    help = "Retry server-to-server verification of a known gateway authority. Never fakes settlement."

    def add_arguments(self, p):
        p.add_argument("order_id")

    def handle(self, *a, **kw):
        try:
            o = Order.objects.select_related("payment").get(pk=kw["order_id"])
        except (Order.DoesNotExist, ValueError):
            raise CommandError("Order not found")
        if not o.payment.authority:
            raise CommandError(
                "No authority is recorded; contact the gateway and reconcile manually. Stock has NOT been released."
            )
        if o.payment.provider == "mock":
            raise CommandError(
                "Use mock payment only through authenticated development checkout."
            )
        try:
            result = settle_payment(o.payment.authority)
        except (GatewayUnavailable, GatewayRejected) as e:
            raise CommandError(str(e))
        self.stdout.write("Verified status: " + result.status)
