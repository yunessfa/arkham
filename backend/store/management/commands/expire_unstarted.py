from django.core.management.base import BaseCommand
from django.utils import timezone
from store.models import Order
from store.services import cancel_unstarted


class Command(BaseCommand):
    help = "Release only expired orders that have never initiated gateway payment."

    def handle(self, *args, **kw):
        n = 0
        for o in Order.objects.filter(
            status="pending", expires_at__lt=timezone.now(), payment__state="new"
        ).select_related("user"):
            cancel_unstarted(o.pk, o.user)
            n += 1
        self.stdout.write(
            str(n)
            + " unstarted orders expired. Pending/unknown gateway payments require reconciliation."
        )
