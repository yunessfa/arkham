from django.contrib import admin
from .models import *


# Internal admin is read-only for money, identity, stock and audit records.
class Audited(admin.ModelAdmin):
    def save_model(self, r, obj, form, change):
        super().save_model(r, obj, form, change)
        from .services import audit

        audit(
            r.user,
            "internal_admin.updated" if change else "internal_admin.created",
            obj,
        )

    def has_delete_permission(self, r, obj=None):
        return False


class ReadOnly(admin.ModelAdmin):
    def has_add_permission(self, r):
        return False

    def has_change_permission(self, r, obj=None):
        return False

    def has_delete_permission(self, r, obj=None):
        return False


for model in [
    Order,
    OrderItem,
    Payment,
    InventoryMovement,
    AuditLog,
    Variant,
    Cart,
    CartItem,
    Newsletter,
    Address,
    Notification,
    ProductImage,
    SiteAsset,
]:
    admin.site.register(model, ReadOnly)
for model in [
    Category,
    Product,
    Coupon,
    ShippingMethod,
    Review,
    Article,
    SiteContent,
    SupportMessage,
]:
    admin.site.register(model, Audited)
admin.site.site_header = "مدیریت داخلی ARKHAM"
