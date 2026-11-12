import { useState } from "react";
import { Link } from "react-router-dom";
import { api, rows } from "../api";
import { useApp, useData } from "../appContext";
import { HexMark } from "../components/Atelier";
import { BeeMark } from "../story/Bee";
import { Icon } from "../v8/icons";
import crest from "../assets/arkham-crest.webp";
import spoon from "../hive/assets/footerpic.webp";

const EMAIL = "info@arkham.ir";
const year = () => { try { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date()); } catch { return ""; } };

function useContact() {
  const { data } = useData("content/");
  const c = rows(data).find((x: any) => x.key === "contact");
  const s = c?.settings || {};
  const instagram = typeof s.instagram === "string" && /^[a-z0-9._]{2,30}$/i.test(s.instagram) ? s.instagram : "arkam.honey";
  return { email: typeof s.email === "string" && s.email.includes("@") ? s.email : EMAIL, instagram, footer: s.footer_text as string | undefined, body: c?.body as string | undefined };
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none" /></svg>;
}
function MailIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
}

function FooterNewsletter() {
  const [state, setState] = useState<"idle" | "busy" | "ok">("idle"), [err, setErr] = useState("");
  return (
    <form className="ft-news" onSubmit={async (e) => {
      e.preventDefault(); setErr(""); setState("busy");
      const d = new FormData(e.currentTarget);
      try { await api("newsletter/", "POST", { email: d.get("email"), consent: true }); setState("ok"); }
      catch (x: any) { setErr(x.message); setState("idle"); }
    }}>
      <label htmlFor="ft-email">خبر برداشت‌های تازه</label>
      <div className="ft-news-row">
        <input id="ft-email" type="email" name="email" required placeholder="ایمیل شما" dir="ltr" disabled={state === "ok"} />
        <button className="gold" disabled={state !== "idle"} aria-label="عضویت در خبرنامه">{state === "ok" ? <Icon name="check" size={18} /> : <Icon name="arrow" size={18} />}</button>
      </div>
      <small>{state === "ok" ? "عضو شدید؛ فقط وقتی خبر تازه‌ای باشد می‌نویسیم." : "با عضویت، سیاست حریم خصوصی را می‌پذیرید."}</small>
      {err && <p className="error small" role="alert">{err}</p>}
    </form>
  );
}

export function SiteFooter() {
  const { email, instagram, footer } = useContact();
  const cols: [string, [string, string][]][] = [
    ["فروشگاه", [["/products", "همهٔ عسل‌ها"], ["/category/single-flower", "عسل‌های تک‌گل"], ["/category/rare-reserve", "کمیاب و ویژه"], ["/category/multiflora", "چندگیاه و روزانه"]]],
    ["راهنما", [["/honey-finder", "عسل‌یاب"], ["/pages/story", "داستان ارکام"], ["/journal", "مجله"], ["/pages/faq", "پرسش‌های متداول"]]],
    ["پشتیبانی", [["/contact", "تماس با ما"], ["/track", "پیگیری سفارش"], ["/pages/shipping", "ارسال و مرجوعی"], ["/pages/privacy", "حریم خصوصی"], ["/pages/terms", "شرایط استفاده"]]],
  ];
  return (
    <footer className="ft">
      <section className="ft-cta">
        <img className="ft-cta-art" src={spoon} alt="" aria-hidden="true" loading="lazy" />
        <div className="wrap ft-cta-inner">
          <span className="ft-kicker" dir="ltr">ARKHAM · HONEY FINDER</span>
          <h2>کدام عسل مال شماست؟</h2>
          <p>شش سؤال کوتاه؛ ما از میان همهٔ گل‌ها، عسل مناسب شما را پیدا می‌کنیم.</p>
          <Link className="button gold" to="/honey-finder">شروع عسل‌یاب<Icon name="arrow" size={18} /></Link>
          <span className="ft-cta-bee" aria-hidden="true"><BeeMark /></span>
        </div>
      </section>
      <div className="wrap ft-main">
        <div className="ft-brand">
          <Link to="/" className="ft-logo" aria-label="خانه ارکام"><img src={crest} alt="" /><span><b dir="ltr">ARKHAM</b><small>ارکام · عسل طبیعی</small></span></Link>
          <p>{footer || "عسل طبیعی تک‌گل از کوهستان‌های ایران؛ برداشت‌شده با حوصله، بسته‌بندی‌شده با وسواس."}</p>
          <div className="ft-contact">
            <a href={"mailto:" + email}><MailIcon /><span dir="ltr">{email}</span></a>
            <a href={"https://instagram.com/" + instagram} target="_blank" rel="noreferrer"><InstagramIcon /><span dir="ltr">@{instagram}</span></a>
          </div>
        </div>
        <nav className="ft-cols" aria-label="پیوندهای پایین صفحه">
          {cols.map(([title, links]) => (
            <div className="ft-col" key={title}><h3>{title}</h3><ul>{links.map(([to, label]) => <li key={to}><Link to={to}>{label}</Link></li>)}</ul></div>
          ))}
        </nav>
        <FooterNewsletter />
      </div>
      <div className="wrap ft-bottom">
        <span className="ft-hex" aria-hidden="true"><HexMark /></span>
        <span>© {year()} ارکام · همهٔ حقوق محفوظ است</span>
        <span className="ft-note">عسل برای کودکان زیر یک سال مناسب نیست.</span>
      </div>
    </footer>
  );
}

export function ContactPage() {
  const { email, instagram, body } = useContact();
  const { session } = useApp();
  const [state, setState] = useState<"idle" | "busy" | "ok">("idle"), [err, setErr] = useState("");
  return (
    <main className="page wrap contact-v9">
      <header className="ct-head">
        <span className="ct-kicker" dir="ltr">CONTACT · ARKHAM</span>
        <h1 tabIndex={-1}>گفت‌وگو با ارکام</h1>
        <p>{body || "سؤال دربارهٔ عسل‌ها، سفارش عمده یا پیشنهاد همکاری دارید؟ همهٔ پیام‌ها را خودمان می‌خوانیم و پاسخ می‌دهیم."}</p>
      </header>
      <div className="ct-grid">
        <div className="ct-cards">
          <a className="ct-card is-primary" href={"mailto:" + email}>
            <span className="ct-icon"><MailIcon /></span>
            <span><small>ایمیل</small><strong dir="ltr">{email}</strong><em>معمولاً در کمتر از یک روز کاری پاسخ می‌دهیم.</em></span>
            <Icon name="arrow" size={18} />
          </a>
          <a className="ct-card" href={"https://instagram.com/" + instagram} target="_blank" rel="noreferrer">
            <span className="ct-icon"><InstagramIcon /></span>
            <span><small>اینستاگرام</small><strong dir="ltr">@{instagram}</strong><em>ویدیوهای زنبورستان و برداشت‌های تازه.</em></span>
            <Icon name="arrow" size={18} />
          </a>
          <Link className="ct-card" to="/pages/faq">
            <span className="ct-icon"><Icon name="drop" size={20} /></span>
            <span><small>پرسش‌های متداول</small><strong>شکرک، نگهداری، کودکان و…</strong><em>شاید جوابتان همین‌جا باشد.</em></span>
            <Icon name="arrow" size={18} />
          </Link>
        </div>
        <form className="ct-form" onSubmit={async (e) => {
          e.preventDefault(); setErr(""); setState("busy");
          try { await api("support/", "POST", Object.fromEntries(new FormData(e.currentTarget))); setState("ok"); (e.target as HTMLFormElement).reset(); }
          catch (x: any) { setErr(x.message); setState("idle"); }
        }}>
          <h2>پیام بگذارید</h2>
          <label className="field"><span>نام</span><input name="name" required maxLength={120} defaultValue={session?.user?.first_name || ""} autoComplete="name" /></label>
          <label className="field"><span>ایمیل برای پاسخ</span><input type="email" name="email" required dir="ltr" autoComplete="email" /></label>
          <label className="field"><span>پیام</span><textarea name="message" required maxLength={5000} rows={5} placeholder="سؤال یا پیامتان را بنویسید…" /></label>
          <button className="gold wide" disabled={state === "busy"}>{state === "busy" ? "در حال ارسال…" : "ارسال پیام"}</button>
          {state === "ok" && <p className="success" role="status">پیام شما رسید؛ به‌زودی به ایمیلتان پاسخ می‌دهیم.</p>}
          {err && <p className="error" role="alert">{err}</p>}
        </form>
      </div>
    </main>
  );
}
