import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  createContext,
  Component,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { api, rows, fa, money, date, statuses } from "./api";
import "./style.css";
import ScrollExperience from "./ScrollExperience";
import StoryHome from "./story/StoryHome";
import BrandStory from "./story/BrandStory";
import NoirHome from './hive/NoirHome';
import noirFooter from './hive/assets/footerpic.webp';
import {DesignProvider,DesignEditor,useDesign} from "./design/Design";
import crest from "./assets/arkham-crest.webp";
import {
  HexMark,
  HoneyPattern,
  BotanicalDecoration,
  CinematicDivider,
  BrandedFallback,
  PageHeader,
} from "./components/Atelier";
import {
  ImageReveal,
  Spotlight,
  PageTransition,
  ImageZoom,
} from "./motion/Motion";
import "./motion/motion.css";
import "./design/design.css";
import "./design/refinement.css";
const Context = createContext<any>({});
function useApp() {
  return useContext(Context);
}
function useData(path: string) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  const previous = useRef(path);
  useEffect(() => {
    let alive = true;
    if (previous.current !== path) {
      setData(null);
      previous.current = path;
    }
    setError("");
    api(path)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, tick]);
  return { data, error, reload: () => setTick((t) => t + 1) };
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <p className="error" role="alert">
      {message}
    </p>
  ) : null;
}
function Empty({
  title = "هنوز چیزی اینجا نیست",
  text = "اطلاعات پس از انتشار توسط فروشگاه در این بخش نمایش داده می‌شود.",
}) {
  return (
    <div className="empty">
      <HoneyPattern />
      <BotanicalDecoration />
      <span className="empty-mark" aria-hidden="true">
        <HexMark />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Loading() {
  return (
    <div className="loading" role="status" aria-label="در حال بارگذاری">
      {[0, 1, 2].map((i) => (
        <div className="skeleton-card" key={i}>
          <span className="skeleton-image" />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
function DataState({
  source,
  children,
}: {
  source: any;
  children: (d: any) => React.ReactNode;
}) {
  if (source.error) return <ErrorBox message={source.error} />;
  if (source.data === null) return <Loading />;
  return <>{children(source.data)}</>;
}
function Page({
  title,
  kicker = "ARKHAM / HONEY ATELIER",
  description,
  children,
  className = "",
}: {
  title: string;
  kicker?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { pathname } = useLocation();
  const kind = /^\/(manage)(\/|$)/.test(pathname)
    ? "page-management"
    : /^\/(cart|checkout|account|orders|login|favorites|track)(\/|$)/.test(
          pathname,
        )
      ? "page-service"
      : "page-editorial";
  return (
    <main className={`page wrap atelier-page ${kind} ${className}`}>
      <PageHeader title={title} kicker={kicker} description={description} />
      {children}
    </main>
  );
}
class Boundary extends Component<any, any> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function BrandIdentity({ compact = false }: { compact?: boolean }) {
  const { assets } = useApp();
  const logo = assets?.find((a: any) => a.key === "logo-dark");
  return (
    <span
      className={`brand-identity${compact ? " brand-identity-stacked" : ""}`}
    >
      <img
        className="brand-crest"
        src={logo?.image || crest}
        alt={logo?.alt || "نشان رسمی ارکام"}
      />
      <span className="brand-type" aria-hidden="true">
        ARKHAM<span className="brand-tagline">HONEY ATELIER</span>
        <span className="brand-persian">ارکام</span>
      </span>
    </span>
  );
}
function Header() {
  const { session, cart, assets } = useApp(),
    [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);
  return (
    <header>
      <div className="wrap topnav">
        <Link className="wordmark" to="/" aria-label="خانه ارکام">
          <BrandIdentity />
        </Link>
        <button
          className="menu-toggle ghost"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          فهرست ☰
        </button>
        <nav className={open ? "open" : ""} aria-label="ناوبری اصلی">
          <Link to="/products">فروشگاه</Link>
          <Link to="/pages/story">داستان ارکام</Link>
          <Link to="/journal">مجله</Link>
          <Link to="/contact">تماس با ما</Link>
        </nav>
        <div className="nav-actions">
          {session?.user?.is_staff && (
            <Link to="/manage" className="manage-shortcut">
              مدیریت
            </Link>
          )}
          <Link to={session?.authenticated ? "/account" : "/login"}>
            {session?.authenticated ? "حساب من" : "ورود"}
          </Link>
          <Link className="bag" to="/cart">
            سبد{" "}
            <b>
              {fa(cart?.items?.reduce((s: any, i: any) => s + i.quantity, 0))}
            </b>
          </Link>
        </div>
      </div>
    </header>
  );
}
function Footer() {
  const { active } = useDesign();
  const { assets } = useApp();
  const { data } = useData("content/");
  const contact = rows(data).find((c: any) => c.key === "contact");
  return (
    <footer className={"atelier-footer"+(active==='noir_hive'?' noir-footer':'')}>
      {active==='noir_hive'&&<img className="noir-footer-art" src={noirFooter} alt="" aria-hidden="true" loading="lazy"/>}
      <HoneyPattern />
      <BotanicalDecoration />
      <div className="wrap footer-finale" data-reveal="heading">
        <span className="eyebrow" dir="ltr">
          THE ART OF SLOW LIVING
        </span>
        <h2>طبیعت، در ناب‌ترین شکل خود.</h2>
        <CinematicDivider />
      </div>
      <div className="wrap footer-grid">
        <div>
          <Link to="/" className="wordmark">
            <BrandIdentity compact />
          </Link>
          <p dir="ltr">HONEY ATELIER / ARKHAM</p>
          <p className="muted">
            {contact?.settings?.footer_text ||
              (contact?.settings?.demo
                ? "نسخه نمایشی ارکام؛ برای آزمایش سایت از اطلاعات غیرواقعی استفاده کنید."
                : contact?.body) ||
              "اطلاعات تماس پس از تأیید فروشگاه منتشر می‌شود."}
          </p>
          {Array.isArray(contact?.settings?.socials) &&
            contact.settings.socials
              .filter(
                (s: any) =>
                  typeof s.url === "string" && s.url.startsWith("https://"),
              )
              .map((s: any) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              ))}
        </div>
        <div>
          <h3>همراه شما</h3>
          <Link to="/pages/faq">پرسش‌های متداول</Link>
          <Link to="/pages/shipping">ارسال و مرجوعی</Link>
          <Link to="/track">پیگیری سفارش</Link>
        </div>
        <div>
          <h3>ارکام</h3>
          <Link to="/pages/terms">شرایط استفاده</Link>
          <Link to="/pages/privacy">حریم خصوصی</Link>
          <Link to="/contact">تماس و پشتیبانی</Link>
        </div>
        <Newsletter />
      </div>
      <div className="wrap footer-bottom">
        <span>© {fa(new Date().getFullYear())} ARKHAM</span>
        <span>طراحی‌شده برای لحظه‌های ناب</span>
      </div>
    </footer>
  );
}
function Newsletter() {
  const [msg, setMsg] = useState(""),
    [err, setErr] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        try {
          let d = new FormData(e.currentTarget);
          await api("newsletter/", "POST", {
            email: d.get("email"),
            consent: d.get("consent") === "on",
          });
          setMsg("عضویت با موفقیت ثبت شد.");
        } catch (e: any) {
          setErr(e.message);
        }
      }}
    >
      <h3>از تازه‌ها باخبر شوید</h3>
      <label>
        ایمیل
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          dir="ltr"
        />
      </label>
      <label className="check">
        <input type="checkbox" name="consent" required />
        با دریافت خبرنامه و سیاست حریم خصوصی موافقم.
      </label>
      <button className="text-button">عضویت در خبرنامه ←</button>
      <p role="status">{msg}</p>
      <ErrorBox message={err} />
    </form>
  );
}
function Home() {
  const { active } = useDesign();
  const { assets, add } = useApp();
  const products = useData("products/"),
    categories = useData("categories/"),
    content = useData("content/"),
    articles = useData("articles/");
  const blocks = rows(content.data),
    faq = blocks.find((x: any) => x.key === "faq");
  if(active==='noir_hive') return <NoirHome products={rows(products.data)} categories={rows(categories.data)} blocks={blocks} add={add} loading={products.data===null&&!products.error} error={products.error} categoryError={categories.error}/>;
  return (
    <main className="home-v4">
      <StoryHome products={rows(products.data)} blocks={blocks} add={add} loading={products.data===null} error={products.error}/>
      <section className="section hive-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">INSIDE THE HIVE</span>
              <h2>از کدام مسیر شروع می‌کنید؟</h2>
            </div>
            <p className="muted">دسته‌بندی‌های منتشرشده فروشگاه</p>
          </div>
          <DataState source={categories}>
            {(d) =>
              rows(d).length ? (
                <div className="categories">
                  {rows(d).map((c: any, i: number) => (
                    <Link key={c.id} to={"/category/" + c.slug}>
                      <BotanicalDecoration />
                      <span className="category-index" dir="ltr">
                        0{i + 1} / COLLECTION
                      </span>
                      <span className="hex">
                        <HexMark />
                      </span>
                      <h3>{c.name}</h3>
                      <p>{c.description}</p>
                      <span>کشف مجموعه ←</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty title="دسته‌بندی‌ها هنوز منتشر نشده‌اند" />
              )
            }
          </DataState>
        </div>
      </section>
      <section className="journal-v4">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">THE JOURNAL</span>
              <h2>کمی درنگ، کمی کشف.</h2>
            </div>
            <Link className="text-button" to="/journal">
              مجله ارکام ←
            </Link>
          </div>
          <DataState source={articles}>
            {(d) =>
              rows(d).length ? (
                <div className="article-grid editorial-grid">
                  {rows(d)
                    .slice(0, 3)
                    .map((a: any) => (
                      <ArticleCard key={a.slug} a={a} />
                    ))}
                </div>
              ) : (
                <Empty
                  title="روایت‌های تازه در راه‌اند"
                  text="مطالب مجله پس از انتشار در این بخش قرار می‌گیرند."
                />
              )
            }
          </DataState>
        </div>
      </section>
      <section className="home-faq">
        <div className="wrap faq-columns">
          <div>
            <span className="eyebrow">A LITTLE MORE CLARITY</span>
            <h2>
              پیش از انتخاب،
              <br />
              بیشتر بدانید.
            </h2>
            <Link className="text-button" to="/pages/faq">
              تمام پرسش‌ها ←
            </Link>
          </div>
          <div>
            {Array.isArray(faq?.settings?.sections) ? (
              faq.settings.sections.slice(0, 4).map((q: any) => (
                <details key={q.title}>
                  <summary>{q.title}</summary>
                  <p>{q.body}</p>
                </details>
              ))
            ) : (
              <p>
                پاسخ پرسش‌های متداول پس از انتشار فروشگاه در دسترس قرار می‌گیرد.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
function ProductCard({ product: p }: { product: any }) {
  const v = p.variants?.find((x: any) => x.available > 0) || p.variants?.[0];
  const { add } = useApp();
  const [busy, setBusy] = useState(false);
  return (
    <article className="product-card atelier-product" data-reveal="card">
      <Link
        to={"/products/" + p.slug}
        className="product-image atelier-product-image"
      >
        {p.images?.[0] ? (
          <img
            loading="lazy"
            decoding="async"
            src={p.images[0].image}
            alt={p.images[0].alt || p.name}
          />
        ) : (
          <BrandedFallback />
        )}
        <span className="image-ornament" aria-hidden="true">
          <BotanicalDecoration />
        </span>
        <span className="image-caption" dir="ltr">
          EXPLORE THE HONEY ↗
        </span>
      </Link>
      <div className="product-copy">
        <span className="product-label">
          {p.category?.name}
          {v && " / " + fa(v.weight_g) + " گرم"}
        </span>
        <h3>
          <Link to={"/products/" + p.slug}>{p.name}</Link>
        </h3>
        <p>
          {(p.description || "")
            .replace(
              "نمونه نمایشی؛ تصویر تولیدشده با هوش مصنوعی و قیمت غیرواقعی. ",
              "",
            )
            .slice(0, 90)}
        </p>
        <div className="card-bottom">
          <div>
            {v && v.price !== v.current_price && <del>{money(v.price)}</del>}
            <strong>
              {v ? money(v.current_price) : "قیمت هنوز تعیین نشده"}
            </strong>
            <small className="stock-label">
              {v?.available > 0 ? "موجود برای سفارش" : "فعلاً ناموجود"}
            </small>
          </div>
          <button
            className="square"
            disabled={!v || v.available < 1 || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await add(v.id);
              } finally {
                setBusy(false);
              }
            }}
            aria-label={"افزودن " + p.name + " به سبد"}
          >
            {busy ? "…" : "+"}
          </button>
        </div>
      </div>
    </article>
  );
}
function Products() {
  const { slug } = useParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const query = new URLSearchParams(params);
  if (slug) query.set("category", slug);
  const source = useData("products/?" + query.toString()),
    categories = useData("categories/");
  function filter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      q: any = {};
    for (const [k, v] of d.entries()) if (v) q[k] = v;
    setParams(q);
  }
  return (
    <Page
      title={
        slug
          ? rows(categories.data).find((c: any) => c.slug === slug)?.name ||
            "محصولات دسته‌بندی"
          : "مجموعه محصولات"
      }
      kicker={
        slug ? "THE COLLECTION / SELECTED BY NATURE" : "THE ARKHAM COLLECTION"
      }
      className={slug ? "category-page" : "collection-page"}
      description={
        slug
          ? rows(categories.data).find((c: any) => c.slug === slug)?.description
          : "هر شیشه، روایتی از یک فصل. مجموعه را با حوصله کشف کنید."
      }
    >
      <div className="collection-toolbar">
        <span dir="ltr">THE HONEY EDIT</span>
        <button
          className="filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls="collection-filters"
          onClick={() => setFiltersOpen((x) => !x)}
        >
          فیلتر و ترتیب نمایش{" "}
          <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span>
        </button>
      </div>
      <div
        id="collection-filters"
        className={`filter-disclosure ${filtersOpen ? "is-open" : ""}`}
        inert={!filtersOpen ? true : undefined}
        aria-hidden={!filtersOpen}
      >
        <div>
          <form
            className="filters panel"
            onSubmit={filter}
            key={params.toString()}
          >
            <label>
              جست‌وجو
              <input
                name="q"
                defaultValue={params.get("q") || ""}
                placeholder="نام محصول"
              />
            </label>
            {!slug && (
              <label>
                دسته‌بندی
                <select
                  name="category"
                  defaultValue={params.get("category") || ""}
                >
                  <option value="">همه</option>
                  {rows(categories.data).map((c: any) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              حداقل قیمت / تومان
              <input
                type="number"
                min="0"
                name="min_price"
                defaultValue={params.get("min_price") || ""}
              />
            </label>
            <label>
              حداکثر قیمت / تومان
              <input
                type="number"
                min="0"
                name="max_price"
                defaultValue={params.get("max_price") || ""}
              />
            </label>
            <label>
              وزن / گرم
              <input
                type="number"
                min="1"
                name="weight"
                defaultValue={params.get("weight") || ""}
              />
            </label>
            <label>
              مرتب‌سازی
              <select name="sort" defaultValue={params.get("sort") || "newest"}>
                <option value="newest">جدیدترین</option>
                <option value="price">ارزان‌ترین</option>
                <option value="-price">گران‌ترین</option>
                <option value="bestselling">پرفروش‌ترین</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="available"
                value="1"
                defaultChecked={params.get("available") === "1"}
              />
              فقط موجود
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="sale"
                value="1"
                defaultChecked={params.get("sale") === "1"}
              />
              تخفیف‌دار
            </label>
            <button className="gold">اعمال فیلتر</button>
            <Link
              className="text-button"
              to={slug ? "/category/" + slug : "/products"}
            >
              پاک کردن
            </Link>
          </form>
        </div>
      </div>
      <DataState source={source}>
        {(d) =>
          rows(d).length ? (
            <>
              <p className="muted">{fa(d.count)} محصول</p>
              <div className="product-grid">
                {rows(d).map((p: any) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination data={d} params={params} setParams={setParams} />
            </>
          ) : (
            <Empty
              title="محصولی پیدا نشد"
              text="فیلترها را تغییر دهید یا پس از انتشار محصولات دوباره سر بزنید."
            />
          )
        }
      </DataState>
    </Page>
  );
}
function Pagination({
  data,
  params,
  setParams,
}: {
  data: any;
  params: any;
  setParams: any;
}) {
  return (
    <div className="actions">
      {data.previous && (
        <button
          onClick={() => {
            const q = new URLSearchParams(params);
            q.set("page", String(Number(q.get("page") || 1) - 1));
            setParams(q);
          }}
        >
          قبلی
        </button>
      )}
      {data.next && (
        <button
          onClick={() => {
            const q = new URLSearchParams(params);
            q.set("page", String(Number(q.get("page") || 1) + 1));
            setParams(q);
          }}
        >
          بعدی
        </button>
      )}
    </div>
  );
}
function ProductDetail() {
  const { slug } = useParams(),
    src = useData("products/" + slug + "/");
  return (
    <DataState source={src}>
      {(p) => <ProductBody key={p.id} p={p} />}
    </DataState>
  );
}
function ProductBody({ p }: { p: any }) {
  const { add, run, session } = useApp(),
    [variant, setVariant] = useState(p.variants?.[0]?.id),
    [qty, setQty] = useState(1),
    [image, setImage] = useState(p.images?.[0]),
    [zoom, setZoom] = useState(false);
  const v = p.variants.find((x: any) => x.id == variant),
    reviews = useData("reviews/?product=" + p.id),
    related = useData("products/?category=" + p.category.slug);
  return (
    <Page
      title={p.name}
      kicker="THE COLLECTION / A CLOSER LOOK"
      className="product-detail-page"
      description={p.category?.name}
    >
      <div className="breadcrumbs">
        <Link to="/products">فروشگاه</Link> /{" "}
        <Link to={"/category/" + p.category.slug}>{p.category.name}</Link> /{" "}
        {p.name}
      </div>
      <div className="detail-grid">
        <div className="product-gallery" data-reveal="image">
          <Spotlight className="detail-image">
            {image ? (
              <button
                onClick={() => setZoom(true)}
                aria-label="بزرگ‌نمایی تصویر"
              >
                <img
                  src={image.image}
                  alt={image.alt || p.name}
                  decoding="async"
                />
              </button>
            ) : (
              <BrandedFallback label="تصویر محصول هنوز منتشر نشده است" />
            )}
          </Spotlight>
          <div className="thumbs">
            {p.images.map((i: any) => (
              <button
                key={i.id}
                onClick={() => setImage(i)}
                aria-pressed={image?.id === i.id}
                aria-label={
                  i.alt || "نمای محصول " + fa(p.images.indexOf(i) + 1)
                }
              >
                <img src={i.image} alt={i.alt} />
              </button>
            ))}
          </div>
        </div>
        <div className="product-information" data-reveal-group>
          <span className="eyebrow" dir="ltr" data-reveal="label">
            ARKHAM / THE HONEY ATELIER
          </span>
          <h2 data-reveal="heading">{p.name}</h2>
          <CinematicDivider />
          <p className="prose" data-reveal="heading">
            {p.description}
          </p>
          <label>
            وزن / گونه
            <select
              value={variant || ""}
              onChange={(e) => setVariant(Number(e.target.value))}
            >
              {p.variants.map((x: any) => (
                <option key={x.id} value={x.id}>
                  {fa(x.weight_g)} گرم
                </option>
              ))}
            </select>
          </label>
          {v && (
            <>
              <p className="price">
                {v.price !== v.current_price && <del>{money(v.price)}</del>}{" "}
                {money(v.current_price)}
              </p>
              <p>
                {v.available > 0 ? "موجودی: " + fa(v.available) : "ناموجود"}
              </p>
              <label>
                تعداد
                <input
                  type="number"
                  min="1"
                  max={Math.min(v.available, 99)}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                />
              </label>
              <button
                className="gold wide"
                disabled={
                  !v.available || qty < 1 || qty > v.available || qty > 99
                }
                onClick={() => add(v.id, qty)}
              >
                افزودن به سبد خرید
              </button>
            </>
          )}
          <button
            className="text-button"
            onClick={() =>
              session?.authenticated
                ? run(
                    () => api("favorites/", "POST", { product: p.id }),
                    "به علاقه‌مندی‌ها افزوده شد",
                  )
                : run(() => Promise.reject(Error("ابتدا وارد حساب خود شوید.")))
            }
          >
            ♡ افزودن به علاقه‌مندی‌ها
          </button>
          {Object.keys(p.specifications || {}).length > 0 && (
            <h2>مشخصات محصول</h2>
          )}
          <dl>
            {Object.entries(p.specifications || {}).map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k}</dt>
                <dd>{String(v)}</dd>
              </React.Fragment>
            ))}
          </dl>
          {p.storage && (
            <>
              <h3>شرایط نگهداری</h3>
              <p className="prose">{p.storage}</p>
            </>
          )}
        </div>
      </div>
      <section className="section">
        <h2>نظر خریداران</h2>
        <DataState source={reviews}>
          {(d) =>
            rows(d).length ? (
              rows(d).map((r: any) => (
                <blockquote key={r.id}>
                  <strong>
                    {r.author} · {fa(r.rating)} از ۵
                  </strong>
                  <p>{r.text}</p>
                </blockquote>
              ))
            ) : (
              <p>هنوز نظر تأییدشده‌ای ثبت نشده است.</p>
            )
          }
        </DataState>
        {session?.authenticated && (
          <AsyncForm
            submit={async (d) => {
              await api("reviews/", "POST", {
                product: p.id,
                text: d.text,
                rating: Number(d.rating),
              });
              reviews.reload();
            }}
            success="نظر شما پس از بررسی منتشر خواهد شد."
          >
            <label>
              امتیاز
              <select name="rating">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {fa(n)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              نظر شما
              <textarea name="text" required maxLength={2000} />
            </label>
            <small>ثبت نظر فقط برای خریداران محصول امکان‌پذیر است.</small>
            <button>ثبت نظر</button>
          </AsyncForm>
        )}
      </section>
      <CinematicDivider />
      <div className="section-head">
        <div>
          <span className="eyebrow" dir="ltr">
            DISCOVER MORE
          </span>
          <h2>روایت‌های دیگر مجموعه</h2>
        </div>
        <Link to="/products" className="text-button">
          کشف مجموعه ←
        </Link>
      </div>
      <div className="product-grid">
        {rows(related.data)
          .filter((x: any) => x.id !== p.id)
          .slice(0, 4)
          .map((x: any) => (
            <ProductCard key={x.id} product={x} />
          ))}
      </div>
      {zoom && image && (
        <ImageZoom
          src={image.image}
          alt={image.alt || p.name}
          onClose={() => setZoom(false)}
        />
      )}
    </Page>
  );
}
function AsyncForm({
  submit,
  children,
  success = "با موفقیت ذخیره شد.",
  className = "panel form",
}: {
  submit: (d: any) => Promise<any>;
  children: React.ReactNode;
  success?: string;
  className?: string;
}) {
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState("");
  return (
    <form
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setErr("");
        setMsg("");
        try {
          const d = Object.fromEntries(new FormData(e.currentTarget));
          await submit(d);
          setMsg(success);
        } catch (e: any) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {busy && <p role="status">در حال ارسال…</p>}
      <ErrorBox message={err} />
      <p role="status" className="success">
        {msg}
      </p>
    </form>
  );
}
function Login() {
  const [register, setRegister] = useState(false);
  const { refresh } = useApp(),
    nav = useNavigate();
  return (
    <Page title={register ? "ساخت حساب کاربری" : "خوش آمدید"}>
      <div className="narrow">
        <div className="auth-brand">
          <BrandIdentity compact />
        </div>
        <AsyncForm
          key={String(register)}
          submit={async (d) => {
            await api(
              "accounts/" + (register ? "register" : "login") + "/",
              "POST",
              d,
            );
            await refresh();
            nav("/account");
          }}
        >
          <label>
            نام کاربری
            <input
              name="username"
              autoComplete="username"
              required
              pattern="[a-zA-Z0-9_.@+\-]{3,150}"
              dir="ltr"
            />
          </label>
          {register && (
            <>
              <label>
                نام
                <input
                  name="first_name"
                  autoComplete="given-name"
                  required
                  maxLength={100}
                />
              </label>
              <label>
                ایمیل
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  dir="ltr"
                />
              </label>
            </>
          )}
          <label>
            رمز عبور
            <input
              name="password"
              type="password"
              required
              minLength={register ? 12 : 1}
              maxLength={128}
              autoComplete={register ? "new-password" : "current-password"}
              dir="ltr"
            />
          </label>
          {register && (
            <p className="muted">
              حداقل ۱۲ نویسه؛ رمز متداول یا کاملاً عددی پذیرفته نمی‌شود.
            </p>
          )}
          <button className="gold wide">{register ? "ثبت‌نام" : "ورود"}</button>
        </AsyncForm>
        <button className="text-button" onClick={() => setRegister(!register)}>
          {register ? "حساب دارید؟ ورود" : "حساب ندارید؟ ثبت‌نام"}
        </button>
        <p className="muted">
          بازیابی رمز در این نسخه از طریق پشتیبانی فروشگاه انجام می‌شود.
        </p>
      </div>
    </Page>
  );
}
function Require({
  children,
  staff = false,
}: {
  children: React.ReactNode;
  staff?: boolean;
}) {
  const { session } = useApp();
  if (!session) return <Loading />;
  if (!session.authenticated)
    return (
      <Page title="ورود به حساب">
        <p>برای ادامه وارد حساب خود شوید.</p>
        <Link to="/login" className="button gold">
          ورود / ثبت‌نام
        </Link>
      </Page>
    );
  if (staff && !session.user.is_staff)
    return (
      <Page title="دسترسی مجاز نیست">
        <p>این بخش ویژه مدیران مجاز است.</p>
      </Page>
    );
  return <>{children}</>;
}
function Cart() {
  const { cart, refreshCart, run } = useApp();
  return (
    <Page title="سبد خرید">
      <p className="muted">
        قیمت و موجودی در لحظه ایجاد سفارش مجدداً در سرور بررسی می‌شود.
      </p>
      {!cart ? (
        <Loading />
      ) : !cart.items.length ? (
        <>
          <Empty
            title="سبد شما خالی است"
            text="برای شروع، مجموعه محصولات را ببینید."
          />
          <Link className="button gold" to="/products">
            رفتن به فروشگاه ←
          </Link>
        </>
      ) : (
        <div className="checkout-grid">
          <div>
            {cart.items.map((i: any) => (
              <div className="cart-row panel" key={i.variant}>
                <div>
                  <h3>
                    <Link to={"/products/" + i.slug}>{i.product}</Link>
                  </h3>
                  <span>
                    {fa(i.weight_g)} گرم · {money(i.price)}
                  </span>
                </div>
                <label>
                  تعداد
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={i.quantity}
                    onChange={(e) =>
                      run(async () => {
                        await api("cart/", "POST", {
                          variant: i.variant,
                          quantity: Number(e.target.value),
                        });
                        refreshCart();
                      })
                    }
                  />
                </label>
                <strong>{money(i.line_total)}</strong>
                <button
                  className="text-button"
                  onClick={() =>
                    run(async () => {
                      await api("cart/", "POST", {
                        variant: i.variant,
                        quantity: 0,
                      });
                      refreshCart();
                    })
                  }
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
          <aside className="panel summary">
            <h2>خلاصه سبد</h2>
            <p>
              جمع محصولات <strong>{money(cart.subtotal)}</strong>
            </p>
            <small>هزینه ارسال و تخفیف هنگام تسویه محاسبه می‌شود.</small>
            <Link className="button gold wide" to="/checkout">
              ادامه خرید ←
            </Link>
          </aside>
        </div>
      )}
    </Page>
  );
}
function AddressForm({ reload }: { reload: () => void }) {
  return (
    <AsyncForm
      submit={async (d) => {
        await api("addresses/", "POST", d);
        reload();
      }}
    >
      <h3>افزودن آدرس</h3>
      <div className="form-grid">
        <label>
          نام گیرنده
          <input
            name="recipient"
            required
            maxLength={120}
            autoComplete="name"
          />
        </label>
        <label>
          موبایل
          <input
            name="phone"
            required
            pattern="09[0-9]{9}"
            placeholder="09123456789"
            dir="ltr"
            autoComplete="tel"
          />
        </label>
        <label>
          استان
          <input
            name="province"
            required
            maxLength={80}
            autoComplete="address-level1"
          />
        </label>
        <label>
          شهر
          <input
            name="city"
            required
            maxLength={80}
            autoComplete="address-level2"
          />
        </label>
        <label>
          کد پستی
          <input
            name="postal_code"
            required
            pattern="[0-9]{10}"
            dir="ltr"
            autoComplete="postal-code"
          />
        </label>
      </div>
      <label>
        نشانی کامل
        <textarea
          name="street"
          required
          maxLength={600}
          autoComplete="street-address"
        />
      </label>
      <button>ذخیره آدرس</button>
    </AsyncForm>
  );
}
function Checkout() {
  return (
    <Require>
      <CheckoutBody />
    </Require>
  );
}
function CheckoutBody() {
  const { cart, refreshCart, session } = useApp(),
    addresses = useData("addresses/"),
    shipping = useData("shipping/"),
    [params] = useSearchParams(),
    nav = useNavigate();
  const [key] = useState(() => crypto.randomUUID());
  const existing = params.get("order");
  return (
    <Page title="تسویه‌حساب">
      <p className="muted">
        واحد همه مبالغ تومان است. مبلغ نهایی فقط توسط سرور محاسبه می‌شود.
      </p>
      {existing ? (
        <OrderBody id={existing} />
      ) : (
        <div className="checkout-grid">
          <div>
            <DataState source={addresses}>
              {(d) => (
                <>
                  {rows(d).length === 0 && <p>ابتدا یک آدرس ثبت کنید.</p>}
                  <AddressForm reload={addresses.reload} />
                </>
              )}
            </DataState>
          </div>
          <aside>
            <AsyncForm
              submit={async (d) => {
                const o = await api("orders/", "POST", {
                  address: Number(d.address),
                  shipping: Number(d.shipping),
                  coupon: d.coupon,
                  idempotency_key: key,
                });
                refreshCart();
                nav("/orders/" + o.id);
              }}
            >
              <h2>ثبت سفارش</h2>
              <label>
                آدرس
                <select name="address" required defaultValue="">
                  <option value="" disabled>
                    انتخاب آدرس
                  </option>
                  {rows(addresses.data).map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.recipient} — {a.city} — {a.street}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                روش ارسال
                <select name="shipping" required defaultValue="">
                  <option value="" disabled>
                    انتخاب روش ارسال
                  </option>
                  {rows(shipping.data).map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {money(s.cost)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                کد تخفیف
                <input name="coupon" maxLength={40} dir="ltr" />
              </label>
              <p>جمع فعلی سبد: {money(cart?.subtotal)}</p>
              {session?.payment_provider === "mock" && (
                <p className="notice">
                  محیط توسعه: پرداخت فقط آزمایشی است و وجهی دریافت نمی‌شود.
                </p>
              )}
              {session?.payment_provider === "disabled" && (
                <p className="notice">
                  پرداخت توسط فروشگاه هنوز فعال نشده است.
                </p>
              )}
              <p>
                با ثبت سفارش، <Link to="/pages/terms">شرایط فروشگاه</Link> را
                می‌پذیرید.
              </p>
              <label className="check">
                <input type="checkbox" required />
                شرایط را خوانده‌ام و می‌پذیرم.
              </label>
              <button
                className="gold wide"
                disabled={
                  !cart?.items?.length ||
                  session?.payment_provider === "disabled"
                }
              >
                ثبت سفارش و مشاهده مبلغ نهایی
              </button>
            </AsyncForm>
            <ErrorBox message={addresses.error || shipping.error} />
          </aside>
        </div>
      )}
    </Page>
  );
}
function OrderDetail() {
  const { id } = useParams();
  return (
    <Require>
      <Page title="جزئیات سفارش">
        <OrderBody id={id!} />
      </Page>
    </Require>
  );
}
function OrderBody({ id }: { id: string }) {
  const src = useData("orders/" + id + "/"),
    { run } = useApp();
  return (
    <DataState source={src}>
      {(o) => (
        <div className="panel order">
          <div className="section-head">
            <span className="badge">{statuses[o.status]}</span>
            <small dir="ltr">{o.id}</small>
          </div>
          <p>{date(o.created_at)}</p>
          {o.payment_provider === "mock" && (
            <p className="notice">
              این سفارش آزمایشی است؛ پرداخت بانکی و دریافت وجه واقعی انجام نشده
              است.
            </p>
          )}
          {o.items.map((i: any) => (
            <div key={i.sku} className="order-line">
              <span>
                {i.name} / {fa(i.weight_g)} گرم × {fa(i.quantity)}
              </span>
              <strong>{money(i.line_total)}</strong>
            </div>
          ))}
          <p>جمع محصولات: {money(o.subtotal)}</p>
          <p>
            تخفیف: {money(o.discount)} · ارسال: {money(o.shipping)}
          </p>
          <h2>مبلغ نهایی: {money(o.total)}</h2>
          <p>
            گیرنده: {o.address.recipient} — {o.address.city} —{" "}
            {o.address.street}
          </p>
          <p>
            وضعیت تراکنش:{" "}
            <b>
              {{
                new: "شروع‌نشده",
                pending: "در انتظار تأیید",
                requesting: "در حال درخواست",
                unknown: "نامشخص",
                succeeded: "موفق",
              }[o.payment_state] || o.payment_state}
            </b>
          </p>
          {o.tracking_code && <p>کد رهگیری: {o.tracking_code}</p>}
          {o.status === "pending" && (
            <div className="actions">
              <button
                className="gold"
                onClick={() =>
                  run(async () => {
                    const d = await api("orders/" + o.id + "/pay/", "POST", {});
                    if (
                      d.url.startsWith(
                        "https://payment.zarinpal.com/pg/StartPay/",
                      )
                    )
                      window.location.assign(d.url);
                    else src.reload();
                  })
                }
              >
                آغاز / ادامه پرداخت
                {o.payment_provider === "mock" ? " آزمایشی" : ""}
              </button>
              {o.payment_provider === "mock" &&
                o.payment_state === "pending" && (
                  <button
                    onClick={() =>
                      run(async () => {
                        await api("orders/" + o.id + "/simulate/", "POST", {});
                        src.reload();
                      }, "پرداخت آزمایشی تأیید شد.")
                    }
                  >
                    تأیید پرداخت آزمایشی (بدون دریافت وجه)
                  </button>
                )}
              {o.payment_state === "new" && (
                <button
                  onClick={() =>
                    run(async () => {
                      await api("orders/" + o.id + "/cancel/", "POST", {});
                      src.reload();
                    })
                  }
                >
                  لغو سفارش
                </button>
              )}
            </div>
          )}
          {["unknown", "requesting"].includes(o.payment_state) && (
            <p className="notice">
              پاسخ درگاه نامشخص است. برای جلوگیری از پرداخت تکراری، با پشتیبانی
              تماس بگیرید.
            </p>
          )}
          <a
            className="text-button"
            href={"/api/v1/orders/" + o.id + "/invoice/"}
            target="_blank"
            rel="noreferrer"
          >
            مشاهده صورتحساب / چاپ از مرورگر ←
          </a>
        </div>
      )}
    </DataState>
  );
}
function Account() {
  return (
    <Require>
      <AccountBody />
    </Require>
  );
}
function AccountBody() {
  const { session, refresh, run } = useApp(),
    orders = useData("orders/"),
    addresses = useData("addresses/"),
    notifications = useData("notifications/");
  return (
    <Page title={"سلام، " + (session.user.first_name || session.user.username)}>
      <div className="actions">
        <Link className="button" to="/favorites">
          علاقه‌مندی‌ها
        </Link>
        {session.user.is_staff && (
          <Link className="button gold" to="/manage">
            پنل مدیریت
          </Link>
        )}
        <button
          onClick={() =>
            run(async () => {
              await api("accounts/logout/", "POST", {});
              refresh();
            })
          }
        >
          خروج
        </button>
        <button
          onClick={() =>
            run(
              () => api("newsletter/", "DELETE"),
              "اشتراک خبرنامه غیرفعال شد.",
            )
          }
        >
          لغو خبرنامه
        </button>
      </div>
      <h2>سفارش‌های من</h2>
      <DataState source={orders}>
        {(d) =>
          rows(d).length ? (
            <div className="list">
              {rows(d).map((o: any) => (
                <Link
                  className="panel order-line"
                  key={o.id}
                  to={"/orders/" + o.id}
                >
                  <span>
                    {date(o.created_at)} · {statuses[o.status]}
                  </span>
                  <strong>{money(o.total)} ←</strong>
                </Link>
              ))}
              {d.next && (
                <Link to="/track">جست‌وجوی سفارش قدیمی‌تر با شناسه ←</Link>
              )}
            </div>
          ) : (
            <Empty title="هنوز سفارشی ندارید" />
          )
        }
      </DataState>
      <h2>پیام‌های حساب</h2>
      <DataState source={notifications}>
        {(d) =>
          d.length ? (
            d.map((n: any) => (
              <div key={n.id} className="panel order-line">
                <p>{n.text}</p>
                {!n.read && (
                  <button
                    onClick={() =>
                      run(async () => {
                        await api("notifications/", "POST", { id: n.id });
                        notifications.reload();
                      })
                    }
                  >
                    خواندم
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="muted">پیامی ندارید.</p>
          )
        }
      </DataState>
      <h2>آدرس‌ها</h2>
      {rows(addresses.data).map((a: any) => (
        <div className="panel order-line" key={a.id}>
          <p>
            {a.recipient} — {a.city} — {a.street}
          </p>
          <button
            onClick={() =>
              run(async () => {
                await api("addresses/" + a.id + "/", "DELETE");
                addresses.reload();
              })
            }
          >
            حذف
          </button>
        </div>
      ))}
      <AddressForm reload={addresses.reload} />
    </Page>
  );
}
function Favorites() {
  return (
    <Require>
      <FavoriteBody />
    </Require>
  );
}
function FavoriteBody() {
  const src = useData("favorites/"),
    { run } = useApp();
  return (
    <Page title="علاقه‌مندی‌ها">
      <DataState source={src}>
        {(d) =>
          d.length ? (
            <div className="product-grid">
              {d.map((p: any) => (
                <div key={p.id}>
                  <ProductCard product={p} />
                  <button
                    className="text-button"
                    onClick={() =>
                      run(async () => {
                        await api("favorites/", "DELETE", { product: p.id });
                        src.reload();
                      })
                    }
                  >
                    حذف از علاقه‌مندی‌ها
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="هنوز محصولی ذخیره نکرده‌اید" />
          )
        }
      </DataState>
    </Page>
  );
}
function ArticleCard({ a }: { a: any }) {
  const { assets } = useApp();
  const image = assets?.find((x: any) => x.key === "article-" + a.slug);
  return (
    <article className="article-card atelier-article" data-reveal="card">
      <Link
        className="article-image atelier-article-image"
        to={"/journal/" + a.slug}
      >
        {image ? (
          <img
            src={image.image}
            alt={image.alt || a.title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <BrandedFallback />
        )}
        <span className="article-image-shade" aria-hidden="true" />
        <span className="article-image-label" dir="ltr">
          THE ARKHAM JOURNAL ↗
        </span>
      </Link>
      <div className="article-copy">
        <div className="article-meta">
          <span className="eyebrow" dir="ltr">
            NATURE / HONEY / CRAFT
          </span>
          {a.updated_at && (
            <time dateTime={a.updated_at}>{date(a.updated_at)}</time>
          )}
        </div>
        <h3>
          <Link to={"/journal/" + a.slug}>{a.title}</Link>
        </h3>
        <p>{a.excerpt}</p>
        <Link className="text-button" to={"/journal/" + a.slug}>
          مطالعه روایت ←
        </Link>
      </div>
    </article>
  );
}
function Journal() {
  const [p, setP] = useSearchParams(),
    src = useData("articles/?" + p.toString());
  return (
    <Page
      title="کمی درنگ، کمی کشف."
      kicker="THE ARKHAM JOURNAL"
      description="روایت‌هایی از طبیعت، عسل و هنرِ ساختن."
      className="journal-page"
    >
      <DataState source={src}>
        {(d) =>
          rows(d).length ? (
            <>
              <div className="article-grid editorial-grid">
                {rows(d).map((a: any) => (
                  <ArticleCard a={a} key={a.slug} />
                ))}
              </div>
              <Pagination data={d} params={p} setParams={setP} />
            </>
          ) : (
            <Empty title="مجله در حال آماده‌سازی است" />
          )
        }
      </DataState>
    </Page>
  );
}
function ArticlePage() {
  const { assets } = useApp();
  const { slug } = useParams(),
    src = useData("articles/" + slug + "/");
  return (
    <DataState source={src}>
      {(a) => {
        const image = assets?.find((x: any) => x.key === "article-" + a.slug);
        return (
          <Page
            title={a.title}
            kicker="THE JOURNAL / FIELD NOTES"
            className="article-detail-page"
          >
            <nav className="breadcrumbs" aria-label="مسیر صفحه">
              <Link to="/">خانه</Link> / <Link to="/journal">مجله ارکام</Link> /{" "}
              <span>{a.title}</span>
            </nav>
            <div className="article-intro">
              <p>{a.excerpt}</p>
              <time dateTime={a.updated_at}>
                به‌روزرسانی: {date(a.updated_at)}
              </time>
            </div>
            {image ? (
              <ImageReveal
                src={image.image}
                alt={image.alt || a.title}
                className="article-cover"
                eager
              />
            ) : (
              <BrandedFallback />
            )}
            <CinematicDivider />
            <article className="prose narrow atelier-prose">
              {a.body.split(/\n\n+/).map((text: string, i: number) => (
                <React.Fragment key={i}>
                  {i > 0 && i % 3 === 0 && <CinematicDivider />}
                  <p data-reveal="heading">{text}</p>
                </React.Fragment>
              ))}
            </article>
            <div className="article-end" data-reveal="heading">
              <span dir="ltr">THE NEXT STORY</span>
              <Link to="/journal" className="text-button">
                بازگشت به مجله ←
              </Link>
            </div>
          </Page>
        );
      }}
    </DataState>
  );
}
function ContentPage() {
  const { assets } = useApp();
  const { key } = useParams(),
    src = useData("content/" + key + "/");
  return (
    <Page
      className={key === "story" ? "story-page" : "content-page"}
      kicker={
        key === "story" ? "ARKHAM / ROOTED IN NATURE" : "ARKHAM / GOOD TO KNOW"
      }
      title={
        {
          story: "داستان ارکام",
          faq: "پرسش‌های متداول",
          shipping: "ارسال و مرجوعی",
          terms: "شرایط استفاده",
          privacy: "حریم خصوصی",
        }[key!] || "اطلاعات فروشگاه"
      }
    >
      {src.error ? (
        <Empty
          title="این محتوا هنوز منتشر نشده است"
          text="اطلاعات رسمی پس از تأیید مدیر فروشگاه در دسترس قرار می‌گیرد."
        />
      ) : (
        <DataState source={src}>
          {(d) => (
            <div
              className={
                key === "story"
                  ? "brand-story-wrapper"
                  : "narrow prose atelier-prose"
              }
            >
              {key === "story" ? (
                <BrandStory content={d} asset={assets?.find((x:any)=>x.key==='story-image')}/>
              ) : (
                <>
                  <h2 data-reveal="heading">{d.title}</h2>
                  {d.body.split(/\n\n+/).map((text: string, i: number) => (
                    <p data-reveal="heading" key={i}>
                      {text}
                    </p>
                  ))}
                </>
              )}
              {Array.isArray(d.settings?.sections) && (
                <div className="faq-list">
                  {d.settings.sections.map((item: any) => (
                    <details key={item.title}>
                      <summary>{item.title}</summary>
                      <p>{item.body}</p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </DataState>
      )}
    </Page>
  );
}
function Contact() {
  const src = useData("content/contact/");
  return (
    <Page title="گفت‌وگو با ارکام">
      <div className="checkout-grid">
        <div className="prose">
          <h2>در کنار شما هستیم</h2>
          <p>
            {src.data?.body ||
              "اطلاعات رسمی تماس هنوز منتشر نشده است. پیام شما از طریق فرم در سامانه پشتیبانی ثبت می‌شود."}
          </p>
        </div>
        <AsyncForm
          submit={(d) => api("support/", "POST", d)}
          success="پیام شما برای پشتیبانی ثبت شد."
        >
          <label>
            نام
            <input name="name" required maxLength={120} />
          </label>
          <label>
            ایمیل
            <input type="email" name="email" required dir="ltr" />
          </label>
          <label>
            پیام
            <textarea name="message" required maxLength={5000} />
          </label>
          <button className="gold">ارسال پیام ←</button>
        </AsyncForm>
      </div>
    </Page>
  );
}
function Track() {
  const nav = useNavigate();
  return (
    <Require>
      <Page title="پیگیری سفارش">
        <AsyncForm
          submit={async (d) => {
            if (!/^[0-9a-f-]{36}$/i.test(d.id))
              throw Error("شناسه سفارش معتبر نیست.");
            await api("orders/" + d.id + "/");
            nav("/orders/" + d.id);
          }}
        >
          <label>
            شناسه سفارش
            <input name="id" required dir="ltr" />
          </label>
          <button className="gold">مشاهده وضعیت</button>
        </AsyncForm>
        <Link to="/account">مشاهده سفارش‌های من ←</Link>
      </Page>
    </Require>
  );
}
function NotFound() {
  return (
    <Page title="این مسیر به کندو نمی‌رسد" kicker="404">
      <p>صفحه موردنظر پیدا نشد.</p>
      <Link className="button gold" to="/">
        بازگشت به خانه ←
      </Link>
    </Page>
  );
}
const resourceNames: any = {
  dashboard: "نمای کلی",
  orders: "سفارش‌ها",
  products: "محصولات",
  categories: "دسته‌بندی‌ها",
  variants: "گونه‌ها و موجودی",
  images: "تصاویر محصول",
  assets: "لوگو و تصاویر برند",
  shipping: "روش‌های ارسال",
  coupons: "کدهای تخفیف",
  articles: "مقالات",
  content: "محتوای سایت",
  reviews: "تأیید نظرات",
  support: "پیام‌های پشتیبانی",
  customers: "مشتریان",
  audit: "رویدادهای مدیریتی",
};
const fieldNames: any = {
  name: "نام",
  slug: "نامک انگلیسی",
  category: "شناسه دسته‌بندی",
  product: "شناسه محصول",
  description: "توضیحات",
  storage: "شرایط نگهداری",
  specifications: "مشخصات (JSON)",
  active: "فعال",
  featured: "ویژه",
  sort_order: "ترتیب نمایش",
  seo_title: "عنوان سئو",
  meta_description: "توضیحات سئو",
  sku: "شناسه SKU",
  weight_g: "وزن / گرم",
  price: "قیمت / تومان",
  sale_price: "قیمت تخفیف / تومان",
  sale_start: "شروع تخفیف",
  sale_end: "پایان تخفیف",
  stock: "موجودی کل",
  reserved: "رزروشده",
  image: "تصویر",
  alt: "متن جایگزین تصویر",
  position: "ترتیب",
  cost: "هزینه / تومان",
  provinces: "استان‌ها (آرایه JSON؛ خالی یعنی همه)",
  code: "کد",
  kind: "نوع",
  value: "مقدار",
  minimum: "حداقل سفارش / تومان",
  starts_at: "زمان شروع",
  ends_at: "زمان پایان",
  usage_limit: "سقف کل استفاده",
  per_user_limit: "سقف استفاده هر مشتری",
  title: "عنوان",
  excerpt: "خلاصه",
  body: "متن",
  published: "منتشرشده",
  key: "کلید محتوا",
  settings: "تنظیمات (JSON)",
  approved: "تأییدشده",
  resolved: "رسیدگی‌شده",
  status: "وضعیت",
  total: "مبلغ / تومان",
  created_at: "تاریخ ثبت",
  tracking_code: "کد رهگیری",
  recipient: "گیرنده",
  text: "متن",
  rating: "امتیاز",
  email: "ایمیل",
  message: "پیام",
  username: "نام کاربری",
  first_name: "نام",
  is_active: "حساب فعال",
  action: "عملیات",
  object_type: "نوع رکورد",
  object_id: "شناسه رکورد",
  detail: "جزئیات",
  actor: "مدیر",
  user: "کاربر",
  id: "شناسه",
  day: "تاریخ",
  revenue: "فروش / تومان",
  payment_state: "وضعیت تراکنش",
};
function Manage() {
  return (
    <Require staff>
      <ManageBody />
    </Require>
  );
}
function ManageBody() {
  const {session}=useApp();
  const [params, setParams] = useSearchParams(),
    tab = params.get("tab") || "dashboard";
  return (
    <Page title="مدیریت فروشگاه" kicker="ARKHAM / MANAGEMENT">
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="مدیریت">
          <button className={tab==="design"?"selected":""} onClick={()=>setParams({tab:"design"})}>ظاهر و تم سایت</button>
          {Object.entries(resourceNames).map(([k, v]) => (
            <button
              key={k}
              className={tab === k ? "selected" : ""}
              onClick={() => setParams({ tab: k })}
            >
              {String(v)}
            </button>
          ))}
          <a href="/django-admin/" target="_blank" rel="noreferrer">
            مدیریت داخلی / نقش‌ها ↗
          </a>
        </nav>
        <section className="admin-main" key={tab}>
          {tab === "design" ? (<DesignEditor permissions={session?.user?.permissions||session?.permissions||[]}/>) : tab === "dashboard" ? (
            <AdminDashboard />
          ) : tab === "orders" ? (
            <AdminOrders />
          ) : tab === "customers" || tab === "audit" ? (
            <AdminRead name={tab} />
          ) : (
            <AdminResource name={tab} />
          )}
        </section>
      </div>
    </Page>
  );
}
function AdminDashboard() {
  const s = useData("admin/dashboard/");
  return (
    <DataState source={s}>
      {(d) => (
        <>
          <p className="notice">
            گزارش مالی فقط سفارش‌های تأییدشده با پرداخت موفق را محاسبه می‌کند.
          </p>
          <div className="stats">
            {[
              ["فروش تأییدشده", money(d.paid_revenue)],
              ["فروش امروز", money(d.today_revenue)],
              ["سفارش‌ها", fa(d.orders)],
              ["منتظر پرداخت", fa(d.pending)],
              ["ارسال‌شده", fa(d.shipped)],
              ["مشتریان", fa(d.customers)],
            ].map(([k, v]) => (
              <div className="panel" key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <h2>فروش روزانه / تومان</h2>
          <Table data={d.daily_sales} />
          <h2>موجودی رو به اتمام</h2>
          <Table data={d.low_stock} />
          <h2>آخرین سفارش‌ها</h2>
          <Table
            data={d.recent_orders.map((o: any) => ({
              id: o.id,
              status: statuses[o.status],
              total: money(o.total),
              created_at: date(o.created_at),
            }))}
          />
        </>
      )}
    </DataState>
  );
}
function Table({
  data,
  action,
}: {
  data: any[];
  action?: (r: any) => React.ReactNode;
}) {
  if (!data?.length) return <Empty title="رکوردی ثبت نشده است" />;
  const cols = Object.keys(data[0]).filter(
    (k) => !["password", "items"].includes(k),
  );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {cols.map((k) => (
              <th key={k}>{fieldNames[k] || k}</th>
            ))}
            {action && <th>عملیات</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={r.id || i}>
              {cols.map((k) => (
                <td key={k}>
                  {[
                    "revenue",
                    "price",
                    "cost",
                    "sale_price",
                    "stock",
                    "reserved",
                    "weight_g",
                    "quantity",
                    "unit_price",
                    "line_total",
                    "value",
                    "minimum",
                  ].includes(k) && r[k] !== null
                    ? fa(r[k])
                    : k === "day"
                      ? new Date(r[k]).toLocaleDateString("fa-IR")
                      : typeof r[k] === "number" && k !== "id"
                        ? fa(r[k])
                        : typeof r[k] === "boolean"
                          ? r[k]
                            ? "بله"
                            : "خیر"
                          : typeof r[k] === "object"
                            ? JSON.stringify(r[k])
                            : String(r[k] ?? "—")}
                </td>
              ))}
              {action && <td>{action(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function AdminRead({ name }: { name: string }) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    s = useData(
      "admin/" + name + "/?page=" + page + "&q=" + encodeURIComponent(query),
    );
  return (
    <>
      <h2>{resourceNames[name]}</h2>
      {name === "customers" && (
        <label>
          جست‌وجوی نام کاربری
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
      )}
      <DataState source={s}>
        {(d) => (
          <>
            <Table data={rows(d)} />
            <div className="actions">
              {d.previous && (
                <button onClick={() => setPage((p) => p - 1)}>قبلی</button>
              )}
              {d.next && (
                <button onClick={() => setPage((p) => p + 1)}>بعدی</button>
              )}
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
function AdminResource({ name }: { name: string }) {
  const [page, setPage] = useState(1),
    src = useData("admin/" + name + "/?page=" + page),
    [meta, setMeta] = useState<any>(null),
    [metaErr, setMetaErr] = useState(""),
    [edit, setEdit] = useState<any>(null),
    [stock, setStock] = useState<any>(null);
  useEffect(() => {
    api("admin/" + name + "/", "OPTIONS")
      .then((d) => setMeta(d.actions?.POST || {}))
      .catch((e) => setMetaErr(e.message));
  }, [name]);
  return (
    <>
      <div className="section-head">
        <h2>{resourceNames[name]}</h2>
        {meta && !["reviews", "support"].includes(name) && (
          <button className="gold" onClick={() => setEdit({})}>
            ایجاد رکورد +
          </button>
        )}
      </div>
      <p className="muted">
        شناسه‌های مرتبط را از فهرست بخش مربوط بردارید. حذف محصولات با
        غیرفعال‌سازی انجام می‌شود.
      </p>
      <ErrorBox message={metaErr} />
      <DataState source={src}>
        {(d) => (
          <>
            <Table
              data={rows(d)}
              action={(r) => (
                <div className="actions">
                  <button onClick={() => setEdit(r)}>ویرایش</button>
                  {name === "variants" && (
                    <button onClick={() => setStock(r)}>تغییر موجودی</button>
                  )}
                </div>
              )}
            />
            <div className="actions">
              {d.previous && (
                <button onClick={() => setPage((p) => p - 1)}>قبلی</button>
              )}
              {d.next && (
                <button onClick={() => setPage((p) => p + 1)}>بعدی</button>
              )}
            </div>
          </>
        )}
      </DataState>
      {edit && meta && (
        <div className="editor panel">
          <div className="section-head">
            <h3>{edit.id ? "ویرایش رکورد " + fa(edit.id) : "رکورد جدید"}</h3>
            <button onClick={() => setEdit(null)}>بستن ×</button>
          </div>
          <AdminEditor
            name={name}
            initial={edit}
            meta={meta}
            done={() => {
              setEdit(null);
              src.reload();
            }}
          />
        </div>
      )}
      {stock && (
        <div className="editor panel">
          <h3>اصلاح موجودی {stock.sku}</h3>
          <AsyncForm
            submit={async (d) => {
              await api("admin/stock/" + stock.id + "/", "POST", {
                delta: Number(d.delta),
                reason: d.reason,
              });
              setStock(null);
              src.reload();
            }}
          >
            <label>
              تغییر موجودی (مثبت یا منفی)
              <input
                type="number"
                name="delta"
                required
                min="-100000"
                max="100000"
              />
            </label>
            <label>
              دلیل تغییر
              <input name="reason" required minLength={3} maxLength={200} />
            </label>
            <button className="gold">ثبت با سابقه حسابرسی</button>
            <button type="button" onClick={() => setStock(null)}>
              انصراف
            </button>
          </AsyncForm>
        </div>
      )}
    </>
  );
}
function AdminEditor({
  name,
  initial,
  meta,
  done,
}: {
  name: string;
  initial: any;
  meta: any;
  done: () => void;
}) {
  const [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  const fields = Object.entries(meta).filter(([k, v]: any) => !v.read_only);
  const jsonFields = ["specifications", "settings", "provinces"];
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
          const raw = new FormData(e.currentTarget),
            data: any = {};
          let upload = false;
          for (const [k, v] of fields as any) {
            const x = raw.get(k);
            if (v.type === "boolean") {
              data[k] = x === "on";
              continue;
            }
            if (x instanceof File) {
              if (x.size) {
                data[k] = x;
                upload = true;
              }
              continue;
            }
            if (x === "" && !v.required) {
              if (initial.id)
                data[k] =
                  v.type === "integer" ||
                  v.type === "decimal" ||
                  v.type === "datetime" ||
                  v.type === "field"
                    ? null
                    : "";
              continue;
            }
            if (jsonFields.includes(k))
              data[k] = JSON.parse(
                String(x) || (k === "provinces" ? "[]" : "{}"),
              );
            else if (
              v.type === "integer" ||
              v.type === "decimal" ||
              ["product", "category"].includes(k)
            )
              data[k] = x === "" ? null : Number(x);
            else data[k] = v.type === "datetime" && x ? String(x) + "Z" : x;
          }
          let body: any = data;
          if (upload) {
            body = new FormData();
            Object.entries(data).forEach(([k, v]: any) =>
              body.append(
                k,
                v instanceof File
                  ? v
                  : typeof v === "object"
                    ? JSON.stringify(v)
                    : String(v),
              ),
            );
          }
          await api(
            "admin/" + name + "/" + (initial.id ? initial.id + "/" : ""),
            initial.id ? "PATCH" : "POST",
            body,
          );
          done();
        } catch (e: any) {
          setErr(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <div className="form-grid">
          {fields.map(([k, v]: any) => {
            let val = initial[k];
            const label = fieldNames[k] || v.label || k;
            const req = v.required && !initial.id;
            if (jsonFields.includes(k))
              return (
                <label key={k}>
                  {label}
                  <textarea
                    name={k}
                    dir="ltr"
                    defaultValue={JSON.stringify(
                      val ?? (k === "provinces" ? [] : {}),
                      null,
                      2,
                    )}
                  />
                </label>
              );
            if (v.type === "boolean")
              return (
                <label className="check" key={k}>
                  <input
                    name={k}
                    type="checkbox"
                    defaultChecked={val ?? false}
                  />
                  {label}
                </label>
              );
            if (v.choices)
              return (
                <label key={k}>
                  {label}
                  <select name={k} defaultValue={val || v.choices[0]?.value}>
                    {v.choices.map((c: any) => (
                      <option value={c.value} key={c.value}>
                        {c.display_name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            if (k === "image")
              return (
                <label key={k}>
                  {label}
                  <input
                    name={k}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    required={!initial.id}
                  />
                  <small>حداکثر ۵ مگابایت، JPEG / PNG / WebP</small>
                </label>
              );
            const multi = [
              "body",
              "description",
              "storage",
              "message",
              "text",
            ].includes(k);
            return (
              <label key={k}>
                {label}
                {multi ? (
                  <textarea name={k} defaultValue={val || ""} required={req} />
                ) : (
                  <input
                    name={k}
                    defaultValue={
                      v.type === "datetime" && val
                        ? new Date(val).toISOString().slice(0, 16)
                        : (val ?? "")
                    }
                    required={req}
                    maxLength={v.max_length}
                    type={
                      v.type === "datetime"
                        ? "datetime-local"
                        : ["integer", "decimal"].includes(v.type) ||
                            ["product", "category"].includes(k)
                          ? "number"
                          : "text"
                    }
                    step="1"
                  />
                )}
                {v.type === "datetime" && (
                  <small>زمان UTC (ساعت جهانی) وارد کنید.</small>
                )}
              </label>
            );
          })}
        </div>
        <div className="actions">
          <button className="gold">
            {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </button>
        </div>
      </fieldset>
      <ErrorBox message={err} />
    </form>
  );
}
function AdminOrders() {
  const [st, setSt] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    src = useData(
      "admin/orders/?status=" +
        st +
        "&q=" +
        encodeURIComponent(q) +
        "&page=" +
        page,
    ),
    [edit, setEdit] = useState<any>(null);
  return (
    <>
      <h2>سفارش‌ها</h2>
      <div className="filters">
        <label>
          وضعیت
          <select
            value={st}
            onChange={(e) => {
              setSt(e.target.value);
              setPage(1);
            }}
          >
            <option value="">همه</option>
            {Object.entries(statuses).map(([k, v]) => (
              <option value={k} key={k}>
                {String(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          شناسه سفارش / نام کاربری
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <DataState source={src}>
        {(d) => (
          <>
            <Table
              data={rows(d).map((o: any) => ({
                id: o.id,
                status: statuses[o.status],
                total: money(o.total),
                payment_state: o.payment_state,
                created_at: date(o.created_at),
              }))}
              action={(r) => (
                <button
                  onClick={() =>
                    setEdit(rows(d).find((o: any) => o.id === r.id))
                  }
                >
                  جزئیات
                </button>
              )}
            />
            <div className="actions">
              {d.previous && (
                <button onClick={() => setPage((p) => p - 1)}>قبلی</button>
              )}
              {d.next && (
                <button onClick={() => setPage((p) => p + 1)}>بعدی</button>
              )}
            </div>
          </>
        )}
      </DataState>
      {edit && (
        <div className="panel editor">
          <h3>
            سفارش <span dir="ltr">{edit.id}</span>
          </h3>
          <p>{JSON.stringify(edit.address)}</p>
          <Table data={edit.items} />
          <p>مبلغ نهایی: {money(edit.total)}</p>
          <AsyncForm
            submit={async (d) => {
              await api("admin/orders/" + edit.id + "/transition/", "POST", d);
              setEdit(null);
              src.reload();
            }}
          >
            <label>
              وضعیت بعدی
              <select name="status">
                {[
                  ["processing", "آماده‌سازی"],
                  ["shipped", "ارسال‌شده"],
                  ["delivered", "تحویل‌شده"],
                ].map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              کد رهگیری
              <input
                name="tracking_code"
                defaultValue={edit.tracking_code}
                maxLength={120}
              />
            </label>
            <label>
              یادداشت داخلی
              <textarea name="note" maxLength={5000} />
            </label>
            <button className="gold">ثبت تغییر وضعیت مجاز</button>
            <button type="button" onClick={() => setEdit(null)}>
              بستن
            </button>
            <a
              href={"/api/v1/admin/orders/" + edit.id + "/invoice/"}
              target="_blank"
              rel="noreferrer"
            >
              صورتحساب ↗
            </a>
          </AsyncForm>
        </div>
      )}
    </>
  );
}
function App() {
  const assetSource = useData("assets/");
  const assets = rows(assetSource.data);
  const [session, setSession] = useState<any>(null),
    [cart, setCart] = useState<any>(null),
    [toast, setToast] = useState(""),
    [bootError, setBootError] = useState("");
  const refreshCart = () => api("cart/").then(setCart);
  const refresh = async () => {
    await api("session/").then(setSession);
    await refreshCart();
  };
  useEffect(() => {
    refresh().catch((e) => setBootError(e.message));
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const run = async (fn: any, msg?: string) => {
    try {
      const result = await fn();
      if (msg) setToast(msg);
      return result;
    } catch (e: any) {
      setToast(e.message);
    }
  };
  const add = (variant: number, quantity = 1) =>
    run(async () => {
      const old =
        cart?.items?.find((i: any) => i.variant === variant)?.quantity || 0;
      await api("cart/", "POST", {
        variant,
        quantity: Math.min(99, old + quantity),
      });
      await refreshCart();
      return true;
    }, "به سبد خرید افزوده شد.");
  return (
    <Context.Provider
      value={{ session, cart, assets, refresh, refreshCart, run, add }}
    >
      <a className="skip" href="#content">
        رفتن به محتوای اصلی
      </a>
      <ScrollExperience />
      <Header />
      {session?.demo_mode && (
        <aside className="demo-notice">
          <span>DEMO</span> نسخه نمایشی — تصاویر و قیمت‌ها نمونه‌اند؛ پرداخت
          واقعی نیست.
        </aside>
      )}
      {bootError && (
        <div className="wrap">
          <ErrorBox message={bootError} />
          <button
            onClick={() =>
              refresh()
                .then(() => setBootError(""))
                .catch((e) => setBootError(e.message))
            }
          >
            تلاش دوباره
          </button>
        </div>
      )}
      <div id="content">
        <Boundary
          fallback={
            <Page title="خطایی رخ داد">
              <p>
                صفحه را دوباره بارگذاری کنید. سبد و سفارش‌ها در سرور محفوظ‌اند.
              </p>
              <a className="button" href="/">
                بازگشت به خانه
              </a>
            </Page>
          }
        >
          <PageTransition>
            {(displayLocation) => (
              <Routes location={displayLocation}>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/category/:slug" element={<Products />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/account" element={<Account />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/journal/:slug" element={<ArticlePage />} />
                <Route path="/pages/:key" element={<ContentPage />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/track" element={<Track />} />
                <Route path="/manage" element={<Manage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            )}
          </PageTransition>
        </Boundary>
      </div>
      <Footer />
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button aria-label="بستن پیام" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <DesignProvider><App /></DesignProvider>
  </BrowserRouter>,
);
