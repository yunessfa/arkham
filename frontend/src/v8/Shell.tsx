import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { fa } from "../api";
import { useDesign } from "../design/Design";
import { Icon, type IconName } from "./icons";

/** Hide-on-scroll-down / reveal-on-scroll-up, with a small dead zone. */
function useScrollDirection() {
  const [state, setState] = useState({ hidden: false, scrolled: false });
  useEffect(() => {
    let last = scrollY, frame = 0;
    const read = () => {
      frame = 0;
      const y = Math.max(0, scrollY), delta = y - last;
      if (Math.abs(delta) < 6) return;
      setState({ hidden: delta > 0 && y > 140, scrolled: y > 8 });
      last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
    addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);
  return state;
}

export function cartCount(cart: any) {
  return (cart?.items || []).reduce((s: number, i: any) => s + i.quantity, 0);
}

/** Count changes pulse the badge; the pulse restarts on every change. */
function useBump(value: number) {
  const [bump, setBump] = useState(false), first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setBump(false);
    const a = requestAnimationFrame(() => setBump(true));
    const t = setTimeout(() => setBump(false), 700);
    return () => { cancelAnimationFrame(a); clearTimeout(t); };
  }, [value]);
  return bump;
}

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { active, chooseTheme } = useDesign();
  const dark = active === "noir_hive";
  return (
    <button
      type="button"
      className={"theme-switch" + (compact ? " is-compact" : "")}
      aria-pressed={dark}
      aria-label={dark ? "تم روشن (گالری طلایی)" : "تم تیره (کندوی شب)"}
      title={dark ? "گالری طلایی" : "کندوی شب"}
      onClick={() => {
        const root = document.documentElement;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) { root.classList.add("theme-changing"); setTimeout(() => root.classList.remove("theme-changing"), 650); }
        chooseTheme(dark ? "golden_gallery" : "noir_hive");
      }}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-thumb"><Icon name={dark ? "moon" : "sun"} size={15} /></span>
      </span>
      {!compact && <span className="theme-switch-label">{dark ? "کندوی شب" : "گالری طلایی"}</span>}
    </button>
  );
}

const links: [string, string][] = [
  ["/products", "فروشگاه"],
  ["/pages/story", "داستان ارکام"],
  ["/journal", "مجله"],
  ["/contact", "تماس با ما"],
];

export function SiteHeader({ brand, session, cart, socials = [] }: { brand: ReactNode; session: any; cart: any; socials?: any[] }) {
  const [open, setOpen] = useState(false);
  const { hidden, scrolled } = useScrollDirection();
  const { pathname } = useLocation();
  const count = cartCount(cart), bump = useBump(count);
  const drawer = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => { document.documentElement.dataset.header = hidden && !open ? "hidden" : "shown"; }, [hidden, open]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add("drawer-open");
    drawer.current?.querySelector<HTMLElement>("a,button")?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", key);
    return () => { document.documentElement.classList.remove("drawer-open"); removeEventListener("keydown", key); previous?.focus?.({ preventScroll: true }); };
  }, [open]);
  const account = session?.authenticated ? "/account" : "/login";
  return (
    <header className={"site-header" + (hidden && !open ? " is-hidden" : "") + (scrolled ? " is-scrolled" : "")}>
      <div className="wrap site-header-bar">
        <button className="icon-button header-menu" aria-expanded={open} aria-controls="site-drawer" aria-label="باز کردن فهرست" onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
        <Link className="wordmark site-logo" to="/" aria-label="خانه ارکام">{brand}</Link>
        <nav className="site-nav" aria-label="ناوبری اصلی">
          {links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
        <div className="site-actions">
          <ThemeSwitch compact />
          {session?.user?.is_staff && <Link to="/manage" className="manage-shortcut desktop-only">مدیریت</Link>}
          <Link className="icon-button desktop-only" to={account} aria-label={session?.authenticated ? "حساب من" : "ورود"}><Icon name="user" /></Link>
          <Link className={"icon-button cart-button" + (bump ? " is-bumping" : "")} to="/cart" aria-label={"سبد خرید، " + fa(count) + " کالا"} data-cart-target>
            <Icon name="bag" />
            {count > 0 && <b className="cart-badge">{fa(count)}</b>}
          </Link>
        </div>
      </div>
      {createPortal(
      <div className={"drawer-layer" + (open ? " is-open" : "")} aria-hidden={!open} inert={!open ? true : undefined}>
        <button className="drawer-backdrop" tabIndex={-1} aria-label="بستن فهرست" onClick={() => setOpen(false)} />
        <div className="drawer" id="site-drawer" ref={drawer} role="dialog" aria-modal="true" aria-label="فهرست سایت">
          <div className="drawer-top">
            <span className="drawer-kicker" dir="ltr">ARKHAM · HONEY ATELIER</span>
            <button className="icon-button" aria-label="بستن فهرست" onClick={() => setOpen(false)}><Icon name="close" /></button>
          </div>
          <nav className="drawer-links" aria-label="فهرست اصلی">
            <NavLink to="/" end style={{ "--i": 0 } as any}><small dir="ltr">01</small>خانه</NavLink>
            {links.map(([to, label], i) => <NavLink key={to} to={to} style={{ "--i": i + 1 } as any}><small dir="ltr">0{i + 2}</small>{label}</NavLink>)}
          </nav>
          <div className="drawer-meta">
            <Link className="drawer-account" to={account}><Icon name="user" size={20} />{session?.authenticated ? "حساب من" + (session.user?.first_name ? " — " + session.user.first_name : "") : "ورود / ثبت‌نام با موبایل"}</Link>
            {session?.user?.is_staff && <Link to="/manage">پنل مدیریت</Link>}
            <Link to="/track">پیگیری سفارش</Link>
            <Link to="/pages/faq">پرسش‌های متداول</Link>
            <div className="drawer-theme"><span>حال‌وهوای سایت</span><ThemeSwitch /></div>
            {socials.filter((s: any) => typeof s?.url === "string" && s.url.startsWith("https://")).map((s: any) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a>)}
          </div>
        </div>
      </div>,
        document.body,
      )}
    </header>
  );
}

const tabs: [string, string, IconName][] = [
  ["/", "خانه", "home"],
  ["/products", "فروشگاه", "shop"],
  ["/pages/story", "داستان", "story"],
  ["/cart", "سبد", "bag"],
];

/** Thumb-reach navigation for phones. Hidden where a page owns the bottom edge. */
export function TabBar({ session, cart }: { session: any; cart: any }) {
  const { pathname } = useLocation();
  const count = cartCount(cart), bump = useBump(count);
  if (/^\/(manage|checkout)(\/|$)/.test(pathname) || /^\/products\/[^/]+/.test(pathname)) return null;
  const active = (to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/") || (to === "/products" && pathname.startsWith("/category/")));
  return (
    <nav className="tab-bar" aria-label="ناوبری سریع">
      {tabs.map(([to, label, icon]) => (
        <Link key={to} to={to} className={active(to) ? "is-active" : ""} aria-current={active(to) ? "page" : undefined} {...(to === "/cart" ? { "data-cart-target": "" } : {})}>
          <span className={"tab-icon" + (to === "/cart" && bump ? " is-bumping" : "")}>
            <Icon name={icon} />
            {to === "/cart" && count > 0 && <b className="cart-badge">{fa(count)}</b>}
          </span>
          {label}
        </Link>
      ))}
      <Link to={session?.authenticated ? "/account" : "/login"} className={active("/account") || active("/login") ? "is-active" : ""}>
        <span className="tab-icon"><Icon name="user" /></span>
        {session?.authenticated ? "حساب" : "ورود"}
      </Link>
    </nav>
  );
}

let lastPress: HTMLElement | null = null;
if (typeof document !== "undefined")
  document.addEventListener("pointerdown", (e) => { lastPress = (e.target as HTMLElement)?.closest("button"); }, { capture: true, passive: true });

/** A honey drop arcs from the pressed button into the visible cart icon. */
export function flyToCart() {
  const from = lastPress;
  if (!from || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; });
  if (!target) return;
  const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
  const drop = document.createElement("span");
  drop.className = "fly-drop";
  drop.setAttribute("aria-hidden", "true");
  document.body.appendChild(drop);
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const lift = Math.min(160, Math.abs(y1 - y0) * 0.5 + 60);
  const anim = drop.animate(
    [
      { transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - lift}px) scale(1.15)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x1}px,${y1}px) scale(.35)`, opacity: 0.2 },
    ],
    { duration: 720, easing: "cubic-bezier(.45,.05,.25,1)" },
  );
  anim.onfinish = () => drop.remove();
}

export function Snackbar({ text, onClose }: { text: string; onClose: () => void }) {
  const added = /سبد/.test(text) && /افزوده|اضافه/.test(text);
  return (
    <div className={"snackbar" + (added ? " is-success" : "")} role="status">
      {added && <span className="snackbar-mark" aria-hidden="true"><Icon name="check" size={16} /></span>}
      <span className="snackbar-text">{text}</span>
      {added && <Link to="/cart" className="snackbar-action" onClick={onClose}>مشاهده سبد</Link>}
      <button className="snackbar-close" aria-label="بستن پیام" onClick={onClose}><Icon name="close" size={16} /></button>
    </div>
  );
}

/** Removes the HTML preloader once React has painted the first route. */
export function useBootHandoff(ready: boolean) {
  useEffect(() => {
    const boot = document.getElementById("boot");
    if (!boot) return;
    const finish = () => { boot.classList.add("is-done"); setTimeout(() => boot.remove(), 650); };
    if (ready) { const started = Number(boot.dataset.start || 0), wait = Math.max(0, 700 - (performance.now() - started)); const t = setTimeout(finish, wait); return () => clearTimeout(t); }
    const fallback = setTimeout(finish, 4000);
    return () => clearTimeout(fallback);
  }, [ready]);
}

/** Day / night theme cards for the home page. */
export function ThemeChooser() {
  const { active, chooseTheme } = useDesign();
  const pick = (id: string) => { const root = document.documentElement; root.classList.add("theme-changing"); setTimeout(() => root.classList.remove("theme-changing"), 650); chooseTheme(id); };
  return (
    <div className="theme-chooser" role="group" aria-label="انتخاب حال‌وهوای سایت">
      <button className="theme-card" aria-pressed={active !== "noir_hive"} onClick={() => pick("golden_gallery")}><span className="theme-card-preview is-day" aria-hidden="true"><b /><i /></span><strong>گالری طلایی</strong><small>روشن، عاجی و آفتابی</small></button>
      <button className="theme-card" aria-pressed={active === "noir_hive"} onClick={() => pick("noir_hive")}><span className="theme-card-preview is-night" aria-hidden="true"><b /><i /></span><strong>کندوی شب</strong><small>مشکی و طلاییِ عسلی</small></button>
    </div>
  );
}

const facts = ["حدود ۲ میلیون گل برای نیم کیلو عسل", "هر زنبور در تمام عمرش حدود ۱/۱۲ قاشق چای‌خوری عسل می‌سازد", "شکرک‌زدن عسل طبیعی است، نه نشانهٔ تقلب", "شش‌ضلعی؛ بیشترین فضا با کمترین موم", "عسل را در آب ولرم روان کنید، نه داغ"];
/** Endless facts ticker that leads into the story page. */
export function HoneyTicker({ mark }: { mark: ReactNode }) {
  const list = [...facts, ...facts];
  return (
    <div className="honey-ticker" aria-label="دانستنی‌های عسل">
      <div className="honey-ticker-track">
        {list.map((f, i) => <Link key={i} to="/pages/story" aria-hidden={i >= facts.length ? true : undefined} tabIndex={i >= facts.length ? -1 : undefined}><i>{mark}</i>{f}</Link>)}
      </div>
    </div>
  );
}
