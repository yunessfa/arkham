import json
from pathlib import Path
from html import escape
from django.http import HttpResponse
from django.conf import settings
from django.template.loader import render_to_string
from .models import Product, Article, SiteContent, Category


def shell(request):
    dist = Path(settings.BASE_DIR).parent / "frontend/dist"
    index = dist / "index.html"
    if not index.exists():
        return HttpResponse(
            "Frontend build missing. Run npm ci && npm run build.", status=503
        )
    title = "ارکام | فروشگاه عسل"
    description = "فروشگاه اینترنتی ارکام"
    seo = ""
    schema = None
    code = 200
    canonical = request.path
    path = request.path.strip("/").split("/")
    if len(path) == 2 and path[0] == "products":
        p = (
            Product.objects.filter(slug=path[1], active=True, category__active=True)
            .prefetch_related("variants", "images")
            .first()
        )
        if not p:
            code = 404
            title = "محصول یافت نشد | ARKHAM"
        else:
            title = p.seo_title or p.name + " | ARKHAM"
            description = p.meta_description or p.description[:200]
            seo = render_to_string(
                "product_seo.html",
                {"product": p, "variants": [v for v in p.variants.all() if v.active]},
            )
            # IRR is an ISO 4217 currency. Toman is converted only at this boundary.
            variants = [v for v in p.variants.all() if v.active]
            schema = {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": p.name,
                "description": p.description,
                "url": settings.PUBLIC_ORIGIN + request.path,
                "offers": [
                    {
                        "@type": "Offer",
                        "sku": v.sku,
                        "price": str(v.current_price * 10),
                        "priceCurrency": "IRR",
                        "availability": (
                            "https://schema.org/InStock"
                            if v.available > 0
                            else "https://schema.org/OutOfStock"
                        ),
                        "url": settings.PUBLIC_ORIGIN + request.path,
                    }
                    for v in variants
                ],
            }
            images = [settings.PUBLIC_ORIGIN + i.image.url for i in p.images.all()]
            if images:
                schema["image"] = images
    elif len(path) == 2 and path[0] == "journal":
        a = Article.objects.filter(slug=path[1], published=True).first()
        if not a:
            code = 404
        else:
            title = a.title + " | ARKHAM"
            description = a.excerpt
            seo = (
                "<article><h1>"
                + escape(a.title)
                + "</h1><p>"
                + escape(a.body)
                + "</p></article>"
            )
    elif len(path) == 2 and path[0] == "category":
        c = Category.objects.filter(slug=path[1], active=True).first()
        if not c:
            code = 404
        else:
            title = c.name + " | ARKHAM"
            description = c.description[:200]
    elif len(path) == 2 and path[0] == "pages":
        c = SiteContent.objects.filter(key=path[1], published=True).first()
        if not c:
            code = 404
        else:
            title = c.title + " | ARKHAM"
            description = c.body[:200]
            seo = (
                "<article><h1>"
                + escape(c.title)
                + "</h1><p>"
                + escape(c.body)
                + "</p></article>"
            )
    elif request.path not in [
        "/",
        "/products",
        "/cart",
        "/checkout",
        "/login",
        "/account",
        "/favorites",
        "/journal",
        "/contact",
        "/track",
        "/manage",
    ] and path[0] not in ["category", "orders", "pages"]:
        code = 404
        title = "صفحه یافت نشد | ARKHAM"
    html = (
        index.read_text()
        .replace("<!--SEO_TITLE-->", escape(title))
        .replace("<!--SEO_DESCRIPTION-->", escape(description, quote=True))
        .replace(
            "<!--CANONICAL-->", escape(settings.PUBLIC_ORIGIN + canonical, quote=True)
        )
        .replace("<!--SSR_CONTENT-->", seo)
    )
    noindex = (
        any(
            request.path.startswith(p)
            for p in [
                "/cart",
                "/checkout",
                "/account",
                "/orders",
                "/login",
                "/favorites",
                "/manage",
                "/track",
            ]
        )
        or bool(request.GET)
        or code == 404
    )
    html = html.replace(
        "<!--ROBOTS-->", "noindex,nofollow" if noindex else "index,follow"
    )
    if schema:
        html = html.replace(
            "<!--SCHEMA-->",
            '<script type="application/ld+json">'
            + json.dumps(schema, ensure_ascii=False).replace("<", "\u003c")
            + "</script>",
        )
    return HttpResponse(html, status=code)


def sitemap(r):
    from xml.sax.saxutils import escape as xml_escape

    paths = (
        ["/", "/products", "/journal", "/contact"]
        + [
            "/products/" + p
            for p in Product.objects.filter(
                active=True, category__active=True
            ).values_list("slug", flat=True)
        ]
        + [
            "/journal/" + s
            for s in Article.objects.filter(published=True).values_list(
                "slug", flat=True
            )
        ]
        + [
            "/pages/" + s
            for s in SiteContent.objects.filter(published=True).values_list(
                "key", flat=True
            )
        ]
    )
    return HttpResponse(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(
            "<url><loc>" + xml_escape(settings.PUBLIC_ORIGIN + p) + "</loc></url>"
            for p in paths
        )
        + "</urlset>",
        content_type="application/xml",
    )


def robots(r):
    return HttpResponse(
        "User-agent: *\nDisallow: /api/\nDisallow: /django-admin/\nDisallow: /manage\nDisallow: /account\nDisallow: /orders/\nDisallow: /cart\nDisallow: /checkout\nDisallow: /login\nDisallow: /favorites\nDisallow: /track\nSitemap: "
        + settings.PUBLIC_ORIGIN
        + "/sitemap.xml",
        content_type="text/plain",
    )


def docs(request):
    return HttpResponse(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARKHAM API</title><link rel="stylesheet" href="/docs/swagger-ui.css"><div id="swagger-ui"></div><script src="/docs/swagger-ui-bundle.js"></script><script src="/docs/init.js"></script></html>'
    )
