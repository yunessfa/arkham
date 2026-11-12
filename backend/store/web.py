import json
from pathlib import Path
from html import escape
from django.http import HttpResponse
from django.conf import settings
from django.template.loader import render_to_string
from .models import Product, Article, SiteContent, Category


SYSTEM_KEYS = {"site-design", "catalog-version", "demo-notice", "contact", "benefits"}
HOME_TITLE = "ارکام | عسل طبیعی تک‌گل از کوهستان‌های ایران"
HOME_DESCRIPTION = (
    "فروشگاه عسل طبیعی ارکام: عسل آویشن، کنار، گون، بهارنارنج، زعفران و بیش از ۳۰ عسل تک‌گل "
    "با شناسنامهٔ گل، منطقه و طعم. با عسل‌یاب ارکام، عسل مناسب خودتان را پیدا کنید."
)


def _brand():
    contact = SiteContent.objects.filter(key="contact").first()
    cs = (contact.settings or {}) if contact else {}
    origin = settings.PUBLIC_ORIGIN
    org = {
        "@type": "Organization",
        "@id": origin + "/#organization",
        "name": "ارکام",
        "alternateName": ["آرکام", "ARKHAM", "Arkam Honey", "عسل ارکام"],
        "url": origin + "/",
        "logo": origin + "/brand/arkham-crest.png",
        "description": "برند عسل طبیعی تک‌گل از کوهستان‌های ایران.",
        "email": cs.get("email") or "info@arkham.ir",
        "contactPoint": [{"@type": "ContactPoint", "contactType": "customer support", "email": cs.get("email") or "info@arkham.ir", "availableLanguage": ["fa"]}],
    }
    if cs.get("instagram"):
        org["sameAs"] = ["https://www.instagram.com/" + cs["instagram"] + "/"]
    site = {
        "@type": "WebSite",
        "@id": origin + "/#website",
        "url": origin + "/",
        "name": "ارکام",
        "inLanguage": "fa-IR",
        "publisher": {"@id": origin + "/#organization"},
        "potentialAction": {
            "@type": "SearchAction",
            "target": origin + "/products?q={search_term_string}",
            "query-input": "required name=search_term_string",
        },
    }
    return org, site


def _crumbs(*items):
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": settings.PUBLIC_ORIGIN + path}
            for i, (name, path) in enumerate(items)
        ],
    }


def _honey_list(products, heading):
    """Readable catalogue for crawlers that do not run JavaScript."""
    rows = []
    for p in products:
        h = (p.specifications or {}).get("_honey") or {}
        bits = [b for b in [
            "گل " + h["flower"] if h.get("flower") else "",
            h.get("region", ""),
            "طعم " + "، ".join(h.get("taste", [])) if h.get("taste") else "",
        ] if b]
        prices = sorted(v.current_price for v in p.variants.all() if v.active)
        price = (" — از " + format(prices[0], ",") + " تومان") if prices else ""
        rows.append(
            '<li><a href="/products/' + escape(p.slug) + '">' + escape(p.name) + "</a>"
            + (" (" + escape("، ".join(bits)) + ")" if bits else "") + escape(price) + "</li>"
        )
    return "<section><h2>" + escape(heading) + "</h2><ul>" + "".join(rows) + "</ul></section>"


def _active_products(**filters):
    return (
        Product.objects.filter(active=True, category__active=True, **filters)
        .select_related("category").prefetch_related("variants").order_by("sort_order", "id")
    )


def shell(request):
    dist = Path(settings.BASE_DIR).parent / "frontend/dist"
    index = dist / "index.html"
    if not index.exists():
        return HttpResponse(
            "Frontend build missing. Run npm ci && npm run build.", status=503
        )
    origin = settings.PUBLIC_ORIGIN
    title = "ارکام | فروشگاه عسل طبیعی"
    description = HOME_DESCRIPTION
    seo = ""
    graph = []
    og_type = "website"
    code = 200
    canonical = request.path
    path = request.path.strip("/").split("/")
    if request.path == "/":
        title = HOME_TITLE
        seo = (
            "<h1>ارکام؛ عسل طبیعی تک‌گل از کوهستان‌های ایران</h1>"
            "<p>" + escape(HOME_DESCRIPTION) + "</p>"
            + _honey_list(_active_products(), "عسل‌های ارکام")
            + '<p><a href="/honey-finder">عسل‌یاب ارکام</a> · <a href="/pages/story">داستان ارکام</a> · <a href="/pages/faq">پرسش‌های متداول</a> · <a href="/contact">تماس با ما</a></p>'
        )
    elif request.path == "/products":
        title = "خرید عسل طبیعی | همهٔ عسل‌های ارکام"
        description = "فهرست کامل عسل‌های طبیعی تک‌گل، کمیاب و چندگیاه ارکام با گل منبع، منطقهٔ برداشت، طعم و قیمت."
        items = list(_active_products())
        seo = "<h1>همهٔ عسل‌های ارکام</h1>" + _honey_list(items, "عسل‌ها")
        graph.append(_crumbs(("خانه", "/"), ("فروشگاه", "/products")))
    elif len(path) == 2 and path[0] == "products":
        p = (
            Product.objects.filter(slug=path[1], active=True, category__active=True)
            .select_related("category").prefetch_related("variants", "images")
            .first()
        )
        if not p:
            code = 404
            title = "محصول یافت نشد | ارکام"
        else:
            og_type = "product"
            h = (p.specifications or {}).get("_honey") or {}
            title = p.seo_title or p.name + " | ارکام"
            description = p.meta_description or p.description[:200]
            variants = [v for v in p.variants.all() if v.active]
            seo = render_to_string(
                "product_seo.html",
                {"product": p, "variants": variants, "specs": [(k, v) for k, v in (p.specifications or {}).items() if not k.startswith("_")]},
            )
            # IRR is an ISO 4217 currency. Toman is converted only at this boundary.
            product = {
                "@type": "Product",
                "name": p.name,
                "description": p.description,
                "url": origin + request.path,
                "category": p.category.name,
                "brand": {"@type": "Brand", "name": "ارکام"},
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
                        "url": origin + request.path,
                        "itemCondition": "https://schema.org/NewCondition",
                        "seller": {"@id": origin + "/#organization"},
                    }
                    for v in variants
                ],
            }
            props = [("گیاه منبع", h.get("flower")), ("منطقهٔ برداشت", h.get("region")), ("فصل برداشت", h.get("season")), ("رنگ", h.get("color"))]
            product["additionalProperty"] = [{"@type": "PropertyValue", "name": k, "value": v} for k, v in props if v]
            if variants:
                product["weight"] = {"@type": "QuantitativeValue", "value": variants[0].weight_g, "unitCode": "GRM"}
            images = [origin + i.image.url for i in p.images.all()]
            if images:
                product["image"] = images
            graph += [product, _crumbs(("خانه", "/"), ("فروشگاه", "/products"), (p.category.name, "/category/" + p.category.slug), (p.name, request.path))]
    elif len(path) == 2 and path[0] == "journal":
        a = Article.objects.filter(slug=path[1], published=True).first()
        if not a:
            code = 404
        else:
            og_type = "article"
            title = a.title + " | مجلهٔ ارکام"
            description = a.excerpt
            seo = "<article><h1>" + escape(a.title) + "</h1>" + "".join("<p>" + escape(x) + "</p>" for x in a.body.split("\n\n") if x.strip()) + "</article>"
            graph.append({"@type": "Article", "headline": a.title, "description": a.excerpt, "inLanguage": "fa-IR", "dateModified": a.updated_at.isoformat(), "author": {"@id": origin + "/#organization"}, "publisher": {"@id": origin + "/#organization"}, "mainEntityOfPage": origin + request.path})
    elif len(path) == 2 and path[0] == "category":
        c = Category.objects.filter(slug=path[1], active=True).first()
        if not c:
            code = 404
        else:
            title = c.name + " | ارکام"
            description = c.description[:200]
            seo = "<h1>" + escape(c.name) + "</h1><p>" + escape(c.description) + "</p>" + _honey_list(_active_products(category=c), c.name)
            graph.append(_crumbs(("خانه", "/"), ("فروشگاه", "/products"), (c.name, request.path)))
    elif len(path) == 2 and path[0] == "pages":
        c = SiteContent.objects.filter(key=path[1], published=True).exclude(key__in=SYSTEM_KEYS - {"contact"}).first()
        if not c:
            code = 404
        else:
            title = c.title + " | ارکام"
            description = c.body[:200]
            sections = (c.settings or {}).get("sections") or []
            seo = (
                "<article><h1>" + escape(c.title) + "</h1>"
                + "".join("<p>" + escape(x) + "</p>" for x in c.body.split("\n\n") if x.strip())
                + "".join("<h2>" + escape(str(q.get("title", ""))) + "</h2><p>" + escape(str(q.get("body", ""))) + "</p>" for q in sections if isinstance(q, dict))
                + "</article>"
            )
            if c.key == "faq" and sections:
                graph.append({
                    "@type": "FAQPage",
                    "mainEntity": [
                        {"@type": "Question", "name": str(q.get("title", "")), "acceptedAnswer": {"@type": "Answer", "text": str(q.get("body", ""))}}
                        for q in sections if isinstance(q, dict) and q.get("title")
                    ],
                })
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
        "/honey-finder",
        "/welcome",
    ] and path[0] not in ["category", "orders", "pages"]:
        code = 404
        title = "صفحه یافت نشد | ارکام"
    if request.path == "/honey-finder":
        title = "عسل‌یاب ارکام | عسل مناسب خودتان را پیدا کنید"
        description = "با شش سؤال کوتاه دربارهٔ کاربرد، طعم، رنگ، وزن و بودجه، عسل طبیعی مناسب خودتان را از میان عسل‌های تک‌گل ارکام پیدا کنید."
        seo = "<h1>عسل‌یاب ارکام</h1><p>" + escape(description) + "</p>" + _honey_list(_active_products(), "عسل‌هایی که عسل‌یاب از میانشان پیشنهاد می‌دهد")
    elif request.path == "/contact":
        title = "تماس با ارکام"
        description = "برای سؤال دربارهٔ عسل‌ها، سفارش عمده یا همکاری به info@arkham.ir ایمیل بزنید یا در اینستاگرام arkam.honey پیام دهید."
        seo = "<h1>تماس با ارکام</h1><p>" + escape(description) + "</p>"
    elif request.path == "/journal":
        title = "مجلهٔ ارکام | دانستنی‌های عسل"
        description = "مقاله‌های ارکام دربارهٔ عسل طبیعی، شکرک‌زدن، نگهداری و انتخاب عسل."
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
                "/welcome",
            ]
        )
        or bool(request.GET)
        or code == 404
    )
    org, site = _brand()
    head = (
        '<meta property="og:site_name" content="ارکام"/><meta property="og:locale" content="fa_IR"/>'
        '<meta property="og:image" content="' + escape(origin + "/brand/arkham-crest.png", quote=True) + '"/>'
        '<meta name="twitter:card" content="summary"/>'
        '<script type="application/ld+json">'
        + json.dumps({"@context": "https://schema.org", "@graph": [org, site] + graph}, ensure_ascii=False).replace("<", "\\u003c")
        + "</script>"
    )
    html = (
        index.read_text()
        .replace("<!--SEO_TITLE-->", escape(title))
        .replace("<!--SEO_DESCRIPTION-->", escape(description, quote=True))
        .replace(
            "<!--CANONICAL-->", escape(origin + canonical, quote=True)
        )
        .replace('content="website"/>', 'content="' + og_type + '"/>', 1)
        .replace('<div id="root"></div>', '<div id="root">' + ('<main class="ssr">' + seo + "</main>" if seo else "") + "</div>", 1)
        .replace("<!--SSR_CONTENT-->", "")
        .replace("<!--ROBOTS-->", "noindex,nofollow" if noindex else "index,follow")
        .replace("<!--SCHEMA-->", head)
    )
    return HttpResponse(html, status=code)


def sitemap(r):
    from xml.sax.saxutils import escape as xml_escape

    paths = (
        ["/", "/products", "/honey-finder", "/journal", "/contact"]
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
            for s in SiteContent.objects.filter(published=True)
            .exclude(key__in=SYSTEM_KEYS)
            .values_list("key", flat=True)
        ]
        + ["/category/" + s for s in Category.objects.filter(active=True).values_list("slug", flat=True)]
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
        "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /django-admin/\nDisallow: /manage\nDisallow: /account\nDisallow: /orders/\nDisallow: /cart\nDisallow: /checkout\nDisallow: /login\nDisallow: /favorites\nDisallow: /track\nDisallow: /welcome\nSitemap: "
        + settings.PUBLIC_ORIGIN
        + "/sitemap.xml",
        content_type="text/plain",
    )


def docs(request):
    return HttpResponse(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARKHAM API</title><link rel="stylesheet" href="/docs/swagger-ui.css"><div id="swagger-ui"></div><script src="/docs/swagger-ui-bundle.js"></script><script src="/docs/init.js"></script></html>'
    )


def llms(r):
    """Plain-language site summary for AI assistants (llms.txt convention)."""
    origin = settings.PUBLIC_ORIGIN
    lines = [
        "# ارکام (ARKHAM)",
        "",
        "> ارکام برند عسل طبیعی تک‌گل از کوهستان‌های ایران است. برای هر عسل، گل منبع، منطقه و فصل برداشت، رنگ و طعم آن ثبت شده است.",
        "",
        "- وب‌سایت: " + origin + "/",
        "- ایمیل: info@arkham.ir",
        "- اینستاگرام: https://www.instagram.com/arkam.honey/",
        "- عسل‌یاب (پیشنهاد عسل بر اساس کاربرد، طعم، رنگ، وزن و بودجه): " + origin + "/honey-finder",
        "",
        "## عسل‌ها",
    ]
    for p in _active_products():
        h = (p.specifications or {}).get("_honey") or {}
        extra = "، ".join(x for x in [("گل " + h["flower"]) if h.get("flower") else "", h.get("region", ""), "، ".join(h.get("taste", []))] if x)
        lines.append("- [" + p.name + "](" + origin + "/products/" + p.slug + ")" + (": " + extra if extra else ""))
    lines += ["", "## صفحه‌ها", "- [داستان ارکام](" + origin + "/pages/story)", "- [پرسش‌های متداول](" + origin + "/pages/faq)", "- [تماس](" + origin + "/contact)"]
    return HttpResponse("\n".join(lines) + "\n", content_type="text/plain; charset=utf-8")
