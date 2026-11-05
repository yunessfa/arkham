import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, fa, money, rows } from "../api";
import { useApp, useData } from "../appContext";
import { BrandedFallback, HexMark } from "../components/Atelier";
import { ImageZoom } from "../motion/Motion";
import { Icon } from "./icons";

const DEMO_PREFIX = "نمونه نمایشی؛ تصویر تولیدشده با هوش مصنوعی و قیمت غیرواقعی. ";
export const cleanText = (t: string) => String(t || "").replace(DEMO_PREFIX, "");
export const bestVariant = (p: any) => p?.variants?.find((x: any) => x.available > 0) || p?.variants?.[0];
export const weightLabel = (g: number) => (g >= 1000 && g % 1000 === 0 ? fa(g / 1000) + " کیلو" : fa(g) + " گرم");

/* ------------------------------------------------------------- primitives */
export function HoneyLoader({ label = "در حال آماده‌سازی…", inline = false }: { label?: string; inline?: boolean }) {
  return (
    <div className={"honey-loader" + (inline ? " is-inline" : "")} role="status" aria-live="polite">
      <svg viewBox="0 0 48 54" aria-hidden="true"><path className="hl-track" d="M24 3 45 15v24L24 51 3 39V15z" /><path className="hl-run" d="M24 3 45 15v24L24 51 3 39V15z" /></svg>
      <span>{label}</span>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="shop-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="shop-card is-skeleton" key={i} style={{ "--i": i } as any}>
          <span className="sk sk-image" /><span className="sk sk-line" /><span className="sk sk-line short" /><span className="sk sk-price" />
        </div>
      ))}
    </div>
  );
}

export function Stars({ rating, compact = false }: { rating?: { average: number | null; count: number }; compact?: boolean }) {
  if (!rating?.count || !rating.average) return null;
  const pct = (rating.average / 5) * 100;
  return (
    <span className={"stars" + (compact ? " is-compact" : "")} aria-label={"امتیاز " + fa(rating.average) + " از ۵ بر اساس " + fa(rating.count) + " نظر"}>
      <span className="stars-row" aria-hidden="true" style={{ "--fill": pct + "%" } as any}>★★★★★</span>
      <b>{fa(rating.average)}</b>{!compact && <small>({fa(rating.count)} نظر)</small>}
    </span>
  );
}

export function QtyStepper({ value, max, onChange, disabled = false, label = "تعداد" }: { value: number; max: number; onChange: (n: number) => void; disabled?: boolean; label?: string }) {
  const top = Math.max(1, Math.min(99, max || 1));
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" aria-label="افزایش" disabled={disabled || value >= top} onClick={() => onChange(Math.min(top, value + 1))}><Icon name="plus" size={18} /></button>
      <output aria-live="polite">{fa(value)}</output>
      <button type="button" aria-label="کاهش" disabled={disabled || value <= 1} onClick={() => onChange(Math.max(1, value - 1))}><Icon name="minus" size={18} /></button>
    </div>
  );
}

/** Image that fades in from a soft blur once decoded; keeps layout stable. */
export function SoftImage({ src, alt, className = "", eager = false, sizes }: { src: string; alt: string; className?: string; eager?: boolean; sizes?: string }) {
  const [loaded, setLoaded] = useState(false);
  return <img className={"soft-img " + (loaded ? "is-loaded " : "") + className} src={src} alt={alt} sizes={sizes} loading={eager ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} ref={(el) => { if (el?.complete && el.naturalWidth && !loaded) setLoaded(true); }} />;
}

function AddButton({ variant, name, compact = true }: { variant: any; name: string; compact?: boolean }) {
  const { add } = useApp();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const out = !variant || variant.available < 1;
  return (
    <button
      className={"add-button" + (compact ? " is-round" : "") + " is-" + state}
      disabled={out || state === "busy"}
      aria-label={out ? name + " ناموجود است" : "افزودن " + name + " به سبد"}
      onClick={async (e) => {
        e.preventDefault();
        setState("busy");
        const ok = await add(variant.id);
        setState(ok === true ? "done" : "idle");
        if (ok === true) setTimeout(() => setState("idle"), 1400);
      }}
    >
      {state === "done" ? <Icon name="check" size={18} /> : state === "busy" ? <span className="spin" aria-hidden="true" /> : <Icon name="plus" size={18} />}
      {!compact && <span>{out ? "ناموجود" : state === "done" ? "در سبد" : "افزودن به سبد"}</span>}
    </button>
  );
}

/* ------------------------------------------------------------ product card */
export function ProductCard({ product: p, index = 0 }: { product: any; index?: number }) {
  const v = bestVariant(p);
  const weights = [...new Set((p.variants || []).map((x: any) => x.weight_g))] as number[];
  const off = Math.max(0, ...(p.variants || []).map((x: any) => x.discount_percent || 0));
  const out = !(p.variants || []).some((x: any) => x.available > 0);
  return (
    <article className={"shop-card" + (out ? " is-out" : "")} style={{ "--i": index % 6 } as any} data-reveal="card">
      <Link className="shop-card-media" to={"/products/" + p.slug} aria-label={p.name}>
        {p.images?.[0] ? <SoftImage src={p.images[0].image} alt={p.images[0].alt || p.name} /> : <BrandedFallback label="" />}
        <span className="shop-card-badges">
          {off > 0 && <b className="badge-sale">٪{fa(off)} تخفیف</b>}
          {p.featured && !off && <b className="badge-feature">ویژه</b>}
          {out && <b className="badge-out">ناموجود</b>}
        </span>
      </Link>
      <div className="shop-card-body">
        <span className="shop-card-kicker">{p.category?.name}</span>
        <h3><Link to={"/products/" + p.slug}>{p.name}</Link></h3>
        <div className="shop-card-meta">
          <Stars rating={p.rating} compact />
          {weights.length > 0 && <span className="shop-card-weights">{weights.map(weightLabel).join("، ")}</span>}
        </div>
        <div className="shop-card-foot">
          <div className="shop-card-price">
            {v && v.price !== v.current_price && <del>{fa(v.price)}</del>}
            <strong>{v ? fa(v.current_price) : "—"}</strong>
            <small>تومان</small>
          </div>
          <AddButton variant={v} name={p.name} />
        </div>
      </div>
    </article>
  );
}

/* --------------------------------------------------------- collection page */
const SORTS: [string, string][] = [["newest", "جدیدترین"], ["bestselling", "پرفروش‌ترین"], ["price", "ارزان‌ترین"], ["-price", "گران‌ترین"]];
const FILTER_KEYS = ["min_price", "max_price", "weight", "available", "sale"];

export function CollectionPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const categories = useData("categories/");
  const cats = rows(categories.data);
  const current = slug || params.get("category") || "";
  const query = useMemo(() => { const q = new URLSearchParams(params); q.delete("page"); if (slug) q.set("category", slug); return q.toString(); }, [params, slug]);
  const [items, setItems] = useState<any[] | null>(null), [count, setCount] = useState(0), [next, setNext] = useState<string | null>(null), [error, setError] = useState(""), [more, setMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [search, setSearch] = useState(params.get("q") || "");
  const nav = useNavigate();
  useEffect(() => {
    let alive = true;
    setItems(null); setError("");
    api("products/?" + query).then((d) => { if (!alive) return; setItems(rows(d)); setCount(d.count ?? rows(d).length); setNext(d.next || null); }).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [query]);
  useEffect(() => setSearch(params.get("q") || ""), [params]);
  // Debounced live search keeps the keyboard open on phones.
  useEffect(() => {
    const value = search.trim();
    if (value === (params.get("q") || "")) return;
    const t = setTimeout(() => update({ q: value || null }), 450);
    return () => clearTimeout(t);
  }, [search]);
  function update(changes: Record<string, string | null>) {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) v ? q.set(k, v) : q.delete(k);
    q.delete("page");
    setParams(q, { replace: true });
  }
  async function loadMore() {
    if (!next) return;
    setMore(true);
    try { const d = await api(next.replace(/^.*?\/api\/v1\//, "")); setItems((x) => [...(x || []), ...rows(d)]); setNext(d.next || null); } catch (e: any) { setError(e.message); } finally { setMore(false); }
  }
  const category = cats.find((c: any) => c.slug === current);
  const activeFilters = FILTER_KEYS.filter((k) => params.get(k)).length;
  const sort = params.get("sort") || "newest";
  return (
    <main className="page wrap shop-page">
      <header className="shop-hero">
        <span className="shop-hero-kicker" dir="ltr">{category ? "THE COLLECTION" : "THE ARKHAM COLLECTION"}</span>
        <h1 tabIndex={-1}>{category ? category.name : "مجموعهٔ عسل ارکام"}</h1>
        <p>{category?.description ? cleanText(category.description) : "هر شیشه، یک فصل از کوهستان. بر اساس طعم، وزن یا مناسبت انتخاب کنید."}</p>
        <span className="shop-hero-hex" aria-hidden="true"><HexMark /></span>
      </header>
      <div className="shop-toolbar">
        <div className="shop-search">
          <Icon name="search" size={20} />
          <input type="search" inputMode="search" enterKeyHint="search" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && update({ q: search.trim() || null })} placeholder="جست‌وجوی عسل…" aria-label="جست‌وجوی محصول" />
          {search && <button className="icon-button" aria-label="پاک کردن جست‌وجو" onClick={() => { setSearch(""); update({ q: null }); }}><Icon name="close" size={18} /></button>}
        </div>
        <button className="filter-button" aria-haspopup="dialog" onClick={() => setSheet(true)}>
          <Icon name="filter" size={20} /><span>فیلتر</span>{activeFilters > 0 && <b>{fa(activeFilters)}</b>}
        </button>
      </div>
      <div className="chip-row" role="tablist" aria-label="دسته‌بندی‌ها">
        <button role="tab" aria-selected={!current} className="chip" onClick={() => (slug ? nav("/products?" + new URLSearchParams([...params].filter(([k]) => k !== "category")).toString()) : update({ category: null }))}>همه</button>
        {cats.map((c: any) => (
          <button role="tab" key={c.id} aria-selected={current === c.slug} className="chip" onClick={() => (slug ? nav("/category/" + c.slug) : update({ category: c.slug }))}>{c.name}</button>
        ))}
      </div>
      <div className="shop-status">
        <span aria-live="polite">{items === null ? "در حال جست‌وجو…" : fa(count) + " محصول"}</span>
        <label className="sort-select">
          <span className="visually-hidden">مرتب‌سازی</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value === "newest" ? null : e.target.value })}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : items === null ? <SkeletonGrid /> : items.length ? (
        <>
          <div className="shop-grid">{items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
          {next && <div className="load-more"><button onClick={loadMore} disabled={more}>{more ? <HoneyLoader inline label="در حال دریافت…" /> : "نمایش محصولات بیشتر"}</button></div>}
        </>
      ) : (
        <div className="shop-empty">
          <span aria-hidden="true"><HexMark /></span>
          <h2>عسلی با این مشخصات پیدا نشد</h2>
          <p>فیلترها را کمتر کنید یا عبارت دیگری جست‌وجو کنید.</p>
          <button className="gold" onClick={() => { setSearch(""); setParams(new URLSearchParams(), { replace: true }); }}>نمایش همهٔ محصولات</button>
        </div>
      )}
      <FilterSheet open={sheet} onClose={() => setSheet(false)} params={params} apply={(changes) => { update(changes); setSheet(false); }} />
    </main>
  );
}

function FilterSheet({ open, onClose, params, apply }: { open: boolean; onClose: () => void; params: URLSearchParams; apply: (c: Record<string, string | null>) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { setDraft(Object.fromEntries(FILTER_KEYS.concat("sort").map((k) => [k, params.get(k) || ""]))); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);
  const set = (k: string, v: string) => setDraft((x) => ({ ...x, [k]: v }));
  return (
    <dialog ref={ref} className="sheet" aria-label="فیلتر و مرتب‌سازی" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-body">
        <span className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head"><h2>فیلتر و مرتب‌سازی</h2><button className="icon-button" aria-label="بستن" onClick={onClose}><Icon name="close" /></button></div>
        <fieldset className="sheet-group"><legend>ترتیب نمایش</legend>
          <div className="chip-wrap">{SORTS.map(([v, l]) => <button type="button" key={v} className="chip" aria-pressed={(draft.sort || "newest") === v} onClick={() => set("sort", v === "newest" ? "" : v)}>{l}</button>)}</div>
        </fieldset>
        <fieldset className="sheet-group"><legend>وزن</legend>
          <div className="chip-wrap">{[["", "همه"], ["250", "۲۵۰ گرم"], ["500", "۵۰۰ گرم"], ["1000", "۱ کیلو"]].map(([v, l]) => <button type="button" key={v} className="chip" aria-pressed={(draft.weight || "") === v} onClick={() => set("weight", v)}>{l}</button>)}</div>
        </fieldset>
        <fieldset className="sheet-group"><legend>بازهٔ قیمت (تومان)</legend>
          <div className="range-pair">
            <label>از<input inputMode="numeric" type="number" min="0" value={draft.min_price || ""} onChange={(e) => set("min_price", e.target.value)} placeholder="۰" dir="ltr" /></label>
            <label>تا<input inputMode="numeric" type="number" min="0" value={draft.max_price || ""} onChange={(e) => set("max_price", e.target.value)} placeholder="بدون سقف" dir="ltr" /></label>
          </div>
        </fieldset>
        <div className="sheet-group toggles">
          <label className="switch-row"><span>فقط کالاهای موجود</span><input type="checkbox" role="switch" checked={draft.available === "1"} onChange={(e) => set("available", e.target.checked ? "1" : "")} /></label>
          <label className="switch-row"><span>فقط تخفیف‌دارها</span><input type="checkbox" role="switch" checked={draft.sale === "1"} onChange={(e) => set("sale", e.target.checked ? "1" : "")} /></label>
        </div>
        <div className="sheet-actions">
          <button className="gold" onClick={() => apply(Object.fromEntries(FILTER_KEYS.concat("sort").map((k) => [k, draft[k] || null])))}>نمایش نتایج</button>
          <button className="text-button" onClick={() => apply(Object.fromEntries(FILTER_KEYS.concat("sort").map((k) => [k, null])))}>پاک کردن همه</button>
        </div>
      </div>
    </dialog>
  );
}

/* ------------------------------------------------------------ product page */
export function ProductPage() {
  const { slug } = useParams();
  const src = useData("products/" + slug + "/");
  if (src.error) return <main className="page wrap pdp"><div className="shop-empty"><h2>این محصول پیدا نشد</h2><p>{src.error}</p><Link className="button gold" to="/products">بازگشت به فروشگاه</Link></div></main>;
  if (!src.data) return <main className="page wrap pdp"><div className="pdp-skeleton"><span className="sk sk-image" /><div><span className="sk sk-line" /><span className="sk sk-line short" /><span className="sk sk-price" /></div></div></main>;
  return <ProductBody key={src.data.id} p={src.data} />;
}

function Gallery({ p }: { p: any }) {
  const images = p.images || [];
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0), [zoom, setZoom] = useState<any>(null);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setIndex(Number((e.target as HTMLElement).dataset.index))), { root: el, threshold: 0.6 });
    el.querySelectorAll("figure").forEach((f) => io.observe(f));
    return () => io.disconnect();
  }, [images.length]);
  const go = (i: number) => track.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  if (!images.length) return <div className="pdp-gallery"><div className="pdp-track"><figure><BrandedFallback label="تصویر محصول هنوز منتشر نشده است" /></figure></div></div>;
  return (
    <div className="pdp-gallery">
      <div className="pdp-track" ref={track} tabIndex={0} aria-label="تصاویر محصول؛ برای دیدن بقیه بکشید">
        {images.map((img: any, i: number) => (
          <figure key={img.id} data-index={i}>
            <button onClick={() => setZoom(img)} aria-label="بزرگ‌نمایی تصویر"><SoftImage src={img.image} alt={img.alt || p.name} eager={i === 0} /></button>
          </figure>
        ))}
      </div>
      {images.length > 1 && (
        <div className="pdp-dots" role="group" aria-label="انتخاب تصویر">
          {images.map((img: any, i: number) => <button key={img.id} aria-label={"تصویر " + fa(i + 1)} aria-pressed={i === index} onClick={() => go(i)}><img src={img.image} alt="" /></button>)}
        </div>
      )}
      {zoom && <ImageZoom src={zoom.image} alt={zoom.alt || p.name} onClose={() => setZoom(null)} />}
    </div>
  );
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return <details className="pdp-acc" open={open}><summary><span>{title}</span><Icon name="plus" size={18} /></summary><div className="pdp-acc-body">{children}</div></details>;
}

function ProductBody({ p }: { p: any }) {
  const { add, run, session } = useApp();
  const [variantId, setVariantId] = useState(bestVariant(p)?.id);
  const [qty, setQty] = useState(1), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [more, setMore] = useState(false);
  const v = p.variants.find((x: any) => x.id === variantId);
  const reviews = useData("reviews/?product=" + p.id);
  const related = useData("products/?category=" + p.category.slug);
  const fallback = useData("products/?sort=bestselling");
  const benefits = useData("content/");
  const items = rows(benefits.data).find((b: any) => b.key === "benefits")?.settings?.items;
  const description = cleanText(p.description);
  const others = [...rows(related.data), ...rows(fallback.data)].filter((x: any, i, a) => x.id !== p.id && a.findIndex((y: any) => y.id === x.id) === i).slice(0, 4);
  const buyRef = useRef<HTMLDivElement>(null), [docked, setDocked] = useState(false);
  useEffect(() => { setQty(1); }, [variantId]);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setDocked(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  async function buy() {
    if (!v) return;
    setBusy(true);
    const ok = await add(v.id, qty);
    setBusy(false);
    if (ok === true) { setDone(true); setTimeout(() => setDone(false), 1600); }
  }
  const out = !v || v.available < 1;
  const low = v && v.available > 0 && v.available <= 5;
  const buyLabel = out ? "فعلاً ناموجود" : busy ? "در حال افزودن…" : done ? "به سبد اضافه شد ✓" : "افزودن به سبد";
  return (
    <main className="page wrap pdp">
      <nav className="crumbs" aria-label="مسیر صفحه"><Link to="/">خانه</Link><span>/</span><Link to="/products">فروشگاه</Link><span>/</span><Link to={"/category/" + p.category.slug}>{p.category.name}</Link></nav>
      <div className="pdp-grid">
        <Gallery p={p} />
        <div className="pdp-info">
          <span className="pdp-kicker">{p.category.name}</span>
          <h1 tabIndex={-1}>{p.name}</h1>
          <Stars rating={p.rating} />
          {description && <div className={"pdp-desc" + (more ? " is-open" : "")}><p>{description}</p>{description.length > 160 && <button className="text-button" onClick={() => setMore(!more)}>{more ? "بستن" : "ادامهٔ توضیحات"}</button>}</div>}
          {p.variants.length > 0 && (
            <fieldset className="weights">
              <legend>انتخاب وزن</legend>
              <div className="weight-options">
                {p.variants.map((x: any) => (
                  <label key={x.id} className={"weight-option" + (x.available < 1 ? " is-out" : "")}>
                    <input type="radio" name="variant" value={x.id} checked={variantId === x.id} onChange={() => setVariantId(x.id)} />
                    <strong>{weightLabel(x.weight_g)}</strong>
                    <span>{x.available < 1 ? "ناموجود" : fa(x.current_price) + " ت"}</span>
                    {x.discount_percent > 0 && <b>٪{fa(x.discount_percent)}</b>}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="pdp-buy" ref={buyRef}>
            <div className="pdp-price">
              {v && v.discount_percent > 0 && <span className="badge-sale">٪{fa(v.discount_percent)}</span>}
              {v && v.price !== v.current_price && <del>{money(v.price)}</del>}
              <strong>{v ? fa(v.current_price) : "—"}<small> تومان</small></strong>
              <span className={"stock" + (out ? " is-out" : low ? " is-low" : "")}>{out ? "این وزن فعلاً موجود نیست" : low ? "فقط " + fa(v.available) + " عدد باقی مانده" : "موجود و آمادهٔ ارسال"}</span>
            </div>
            <div className="pdp-actions">
              <QtyStepper value={qty} max={v?.available || 1} onChange={setQty} disabled={out} />
              <button className={"gold buy-button" + (done ? " is-done" : "")} disabled={out || busy} onClick={buy}>{buyLabel}</button>
            </div>
            <button className="text-button fav-button" onClick={() => session?.authenticated ? run(() => api("favorites/", "POST", { product: p.id }), "به علاقه‌مندی‌ها افزوده شد") : run(() => Promise.reject(Error("برای ذخیرهٔ علاقه‌مندی‌ها وارد حساب شوید.")))}>
              <Icon name="heart" size={18} /> ذخیره در علاقه‌مندی‌ها
            </button>
          </div>
          <ul className="pdp-trust">
            {(Array.isArray(items) && items.length ? items.slice(0, 3) : [{ title: "انتخاب وزن دلخواه", body: "" }, { title: "پرداخت از درگاه بانکی", body: "" }, { title: "پیگیری آنلاین سفارش", body: "" }]).map((b: any, i: number) => (
              <li key={b.title}><Icon name={(["jar", "shield", "truck"] as const)[i % 3]} size={20} /><span>{b.title}</span></li>
            ))}
          </ul>
          <div className="pdp-accordions">
            {Object.keys(p.specifications || {}).length > 0 && (
              <Accordion title="مشخصات" open>
                <dl className="spec-list">{Object.entries(p.specifications).map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{String(val)}</dd></div>)}</dl>
              </Accordion>
            )}
            {p.storage && <Accordion title="نگهداری و مصرف"><p>{cleanText(p.storage)}</p><p className="muted">بلوری‌شدن (شکرک) عسل طبیعی است؛ برای روان‌شدن، ظرف را در آب ولرم (نه داغ) بگذارید.</p></Accordion>}
            <Accordion title={"نظر خریداران" + (rows(reviews.data).length ? " (" + fa(rows(reviews.data).length) + ")" : "")}>
              {rows(reviews.data).length ? rows(reviews.data).map((r: any) => (
                <blockquote key={r.id} className="review"><div><strong>{r.author}</strong><span className="stars-row" style={{ "--fill": (r.rating / 5) * 100 + "%" } as any} aria-label={fa(r.rating) + " از ۵"}>★★★★★</span></div><p>{r.text}</p></blockquote>
              )) : <p className="muted">هنوز نظری ثبت نشده. اولین خریدار باشید که تجربه‌اش را می‌نویسد.</p>}
              {session?.authenticated && <ReviewForm product={p.id} reload={reviews.reload} />}
            </Accordion>
          </div>
        </div>
      </div>
      {others.length > 0 && (
        <section className="pdp-related">
          <div className="pdp-related-head"><h2>شاید این‌ها را هم دوست داشته باشید</h2><Link className="text-button" to="/products">همهٔ محصولات</Link></div>
          <div className="shop-grid is-rail">{others.map((x: any, i: number) => <ProductCard key={x.id} product={x} index={i} />)}</div>
        </section>
      )}
      <div className={"buy-dock" + (docked ? " is-visible" : "")} aria-hidden={!docked} inert={!docked ? true : undefined}>
        <div className="buy-dock-price"><small>{v ? weightLabel(v.weight_g) : ""}</small><strong>{v ? fa(v.current_price) : "—"} <small>تومان</small></strong></div>
        <button className={"gold buy-button" + (done ? " is-done" : "")} disabled={out || busy} onClick={buy}>{buyLabel}</button>
      </div>
    </main>
  );
}

function ReviewForm({ product, reload }: { product: number; reload: () => void }) {
  const [msg, setMsg] = useState(""), [err, setErr] = useState(""), [rating, setRating] = useState(5), [busy, setBusy] = useState(false);
  return (
    <form className="review-form" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(""); setMsg("");
      const d = new FormData(e.currentTarget);
      try { await api("reviews/", "POST", { product, rating, text: d.get("text") }); setMsg("نظر شما پس از بررسی منتشر می‌شود. ممنون!"); reload(); } catch (x: any) { setErr(x.message); } finally { setBusy(false); }
    }}>
      <div className="rate-input" role="radiogroup" aria-label="امتیاز">{[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={fa(n) + " ستاره"} className={n <= rating ? "on" : ""} onClick={() => setRating(n)}>★</button>)}</div>
      <textarea name="text" required maxLength={2000} placeholder="طعم، بافت و تجربهٔ شما…" />
      <small className="muted">ثبت نظر فقط برای خریداران این محصول ممکن است.</small>
      <button disabled={busy}>{busy ? "در حال ارسال…" : "ثبت نظر"}</button>
      {msg && <p className="success" role="status">{msg}</p>}
      {err && <p className="error" role="alert">{err}</p>}
    </form>
  );
}
