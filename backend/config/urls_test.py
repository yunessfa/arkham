"""Test-only static serving. Production uses Nginx."""

from pathlib import Path
from django.conf import settings
from django.urls import re_path
from django.views.static import serve
from .urls import urlpatterns as base

root = Path(settings.BASE_DIR).parent / "frontend/dist"
urlpatterns = [
    re_path(r"^(?P<path>(?:assets|fonts|docs|brand)/.*)$", serve, {"document_root": root}),
    re_path(r"^(?P<path>brand-fallback\.webp)$", serve, {"document_root": root}),
] + base
