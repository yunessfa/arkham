from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from store import api, web

router = DefaultRouter()
for name, view, base in [
    ("assets", api.AssetView, "asset"),
    ("products", api.ProductView, "product"),
    ("categories", api.CategoryView, "category"),
    ("content", api.ContentView, "content"),
    ("articles", api.ArticleView, "article"),
    ("shipping", api.ShippingView, "shipping"),
    ("addresses", api.AddressView, "address"),
    ("orders", api.OrderView, "order"),
    ("reviews", api.ReviewView, "review"),
]:
    router.register(name, view, basename=base)
for name, (model, ro) in api.ADMIN_MODELS.items():
    view = type(
        "Admin" + model.__name__,
        (api.AdminModelView,),
        {
            "queryset": model.objects.all().order_by("-pk"),
            "serializer_class": api.admin_serializer(model, ro),
            "__module__": "store.api",
        },
    )
    router.register("admin/" + name, view, basename="admin-" + name)
router.register("admin/orders", api.AdminOrderView, basename="admin-order")
router.register("admin/audit", api.AdminAudit, basename="admin-audit")
urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/v1/session/", api.SessionView.as_view()),
    path("api/v1/accounts/<str:kind>/", api.AuthView.as_view()),
    path("api/v1/cart/", api.CartView.as_view()),
    path("api/v1/favorites/", api.FavoriteView.as_view()),
    path("api/v1/newsletter/", api.NewsletterView.as_view()),
    path("api/v1/support/", api.SupportView.as_view()),
    path("api/v1/notifications/", api.NotificationView.as_view()),
    path("api/v1/payments/callback/", api.Callback.as_view()),
    path("api/v1/admin/stock/<int:pk>/", api.StockAdjust.as_view()),
    path("api/v1/admin/dashboard/", api.Dashboard.as_view()),
    path("api/v1/admin/customers/", api.AdminCustomers.as_view()),
    path("api/v1/health/", api.health),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs/", web.docs),
    path("api/v1/", include(router.urls)),
    path("sitemap.xml", web.sitemap),
    path("robots.txt", web.robots),
]
if settings.DEBUG:
    from django.views.static import serve
    from pathlib import Path

    urlpatterns += [
        re_path(r"^brand/(?P<path>.*)$", serve, {"document_root": Path(settings.BASE_DIR).parent / "frontend/dist/brand"}),
        re_path(
            r"^docs/(?P<path>.*)$",
            serve,
            {"document_root": Path(settings.BASE_DIR).parent / "frontend/dist/docs"},
        ),
        re_path(
            r"^assets/(?P<path>.*)$",
            serve,
            {"document_root": Path(settings.BASE_DIR).parent / "frontend/dist/assets"},
        ),
        re_path(
            r"^fonts/(?P<path>.*)$",
            serve,
            {"document_root": Path(settings.BASE_DIR).parent / "frontend/dist/fonts"},
        ),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += [re_path(r"^(?!api/|static/|media/|assets/|fonts/|brand/).*$", web.shell)]
