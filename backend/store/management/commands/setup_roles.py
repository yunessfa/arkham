from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission


class Command(BaseCommand):
    help = "Create least-privilege roles; never creates users or passwords."

    def handle(self, *args, **kw):
        roles = {
            "مدیر محصولات": {"product", "category", "variant", "productimage"},
            "مدیر محتوا": {"article", "sitecontent", "siteasset"},
            "مسئول سفارش‌ها": {"order"},
            "پشتیبانی": {"supportmessage", "review"},
            "مدیر فروشگاه": {
                "product",
                "category",
                "variant",
                "productimage",
                "article",
                "sitecontent",
                "siteasset",
                "order",
                "shippingmethod",
                "coupon",
                "review",
                "supportmessage",
                "auditlog",
            },
        }
        for name, models in roles.items():
            g, _ = Group.objects.get_or_create(name=name)
            perms = Permission.objects.filter(
                content_type__app_label="store", content_type__model__in=models
            ).exclude(codename__startswith="delete_")
            g.permissions.set(perms)
            if name == "مدیر فروشگاه":
                g.permissions.add(
                    Permission.objects.get(
                        content_type__app_label="auth", codename="view_user"
                    )
                )
        self.stdout.write(
            "Roles configured. Assign staff status and groups explicitly via the protected admin."
        )
